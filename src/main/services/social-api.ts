import * as https from 'https';
import type { VkImagePayload } from './config-store.js';

const VK_API_VERSION = '5.199';

type OkGraphMeInfo = {
  name?: string;
  group_id?: string;
};

export function okGraphRequest<T>(pathname: string, accessToken: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestUrl = `https://api.ok.ru${pathname}?access_token=${encodeURIComponent(accessToken)}`;

    https
      .get(requestUrl, (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(rawData) as T & {
              error_code?: number;
              error_msg?: string;
              error_description?: string;
            };

            if ('error_code' in parsed && parsed.error_code) {
              reject(
                new Error(
                  parsed.error_description ||
                  parsed.error_msg ||
                  'Ошибка OK Graph API.'
                )
              );
              return;
            }

            resolve(parsed as T);
          } catch {
            reject(new Error('Не удалось разобрать ответ OK Graph API.'));
          }
        });
      })
      .on('error', () => {
        reject(new Error('Ошибка сети при обращении к OK Graph API.'));
      });
  });
}

export async function fetchOkGroupInfo(token: string): Promise<{ groupId: string; groupName: string }> {
  const info = await okGraphRequest<OkGraphMeInfo>('/graph/me/info/', token);

  const rawGroupId = (info.group_id || '').trim();
  const groupName = (info.name || '').trim();

  if (!rawGroupId) {
    throw new Error('OK не вернул group_id. Проверьте токен группы.');
  }

  const normalizedGroupId = rawGroupId.replace(/^group:/i, '').trim();

  if (!normalizedGroupId) {
    throw new Error('OK вернул некорректный group_id.');
  }

  return {
    groupId: normalizedGroupId,
    groupName: groupName || normalizedGroupId
  };
}

export function vkApiRequest<T>(method: string, params: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const searchParams = new URLSearchParams({
      ...params,
      v: VK_API_VERSION
    });

    const requestUrl = `https://api.vk.com/method/${method}?${searchParams.toString()}`;

    https
      .get(requestUrl, (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(rawData) as {
              response?: T;
              error?: { error_msg?: string };
            };

            if (parsed.error) {
              reject(new Error(parsed.error.error_msg || 'Ошибка VK API.'));
              return;
            }

            if (!Object.prototype.hasOwnProperty.call(parsed, 'response')) {
              reject(new Error('VK API вернул пустой ответ.'));
              return;
            }

            resolve(parsed.response as T);
          } catch {
            reject(new Error('Не удалось разобрать ответ VK API.'));
          }
        });
      })
      .on('error', () => {
        reject(new Error('Ошибка сети при обращении к VK API.'));
      });
  });
}

export function buildMultipartBody(file: VkImagePayload, boundary: string): Buffer {
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="photo"; filename="${file.name}"\r\n` +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const footer = `\r\n--${boundary}--\r\n`;

  return Buffer.concat([
    Buffer.from(header, 'utf8'),
    Buffer.from(file.dataBase64, 'base64'),
    Buffer.from(footer, 'utf8')
  ]);
}

export function uploadFileToVk(
  uploadUrl: string,
  file: VkImagePayload
): Promise<{ server: number; photo: string; hash: string }> {
  return new Promise((resolve, reject) => {
    const boundary = `----ElectronSocialPoster${Date.now()}`;
    const body = buildMultipartBody(file, boundary);
    const url = new URL(uploadUrl);

    const request = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      },
      (response) => {
        let rawData = '';

        response.on('data', (chunk) => {
          rawData += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(rawData) as {
              server?: number;
              photo?: string;
              hash?: string;
              error?: string;
              error_descr?: string;
            };

            if (!parsed.server || !parsed.photo || !parsed.hash) {
              reject(new Error(parsed.error_descr || parsed.error || 'Не удалось загрузить изображение в VK.'));
              return;
            }

            resolve({
              server: parsed.server,
              photo: parsed.photo,
              hash: parsed.hash
            });
          } catch {
            reject(new Error('Не удалось разобрать ответ загрузки изображения VK.'));
          }
        });
      }
    );

    request.on('error', () => {
      reject(new Error('Ошибка сети при загрузке изображения в VK.'));
    });

    request.write(body);
    request.end();
  });
}

export async function uploadWallPhotosByUserToken(
  userToken: string,
  groupId: number,
  images: VkImagePayload[]
): Promise<string[]> {
  const attachments: string[] = [];

  for (const image of images) {
    const uploadServer = await vkApiRequest<{ upload_url: string }>('photos.getWallUploadServer', {
      access_token: userToken,
      group_id: String(groupId)
    });

    const uploadResult = await uploadFileToVk(uploadServer.upload_url, image);

    const savedPhotos = await vkApiRequest<
      Array<{
        id: number;
        owner_id: number;
      }>
    >('photos.saveWallPhoto', {
      access_token: userToken,
      group_id: String(groupId),
      photo: uploadResult.photo,
      server: String(uploadResult.server),
      hash: uploadResult.hash
    });

    const saved = savedPhotos[0];

    if (!saved) {
      throw new Error('VK не вернул сохранённую фотографию.');
    }

    attachments.push(`photo${saved.owner_id}_${saved.id}`);
  }

  return attachments;
}