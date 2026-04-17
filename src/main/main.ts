import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

type VkConfig = {
  tokenEncrypted: string | null;
  groupValue: string | null;
  groupId: number | null;
  groupName: string | null;
  isConnected: boolean;
};

type VkRendererState = {
  tokenSaved: boolean;
  tokenMasked: string;
  groupValue: string;
  groupId: number | null;
  groupName: string;
  isConnected: boolean;
  encryptionAvailable: boolean;
};

type VkPublishResult = {
  success: boolean;
  error?: string;
  postUrl?: string;
  postId?: number;
};

const CONFIG_FILE_NAME = 'vk-config.json';
const VK_API_VERSION = '5.199';

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME);
}

function defaultConfig(): VkConfig {
  return {
    tokenEncrypted: null,
    groupValue: null,
    groupId: null,
    groupName: null,
    isConnected: false
  };
}

function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64');
  }

  return Buffer.from(token, 'utf8').toString('base64');
}

function decryptToken(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  }

  return Buffer.from(encoded, 'base64').toString('utf8');
}

function readConfig(): VkConfig {
  const filePath = getConfigPath();

  if (!fs.existsSync(filePath)) {
    return defaultConfig();
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<VkConfig>;

    return {
      tokenEncrypted: parsed.tokenEncrypted ?? null,
      groupValue: parsed.groupValue ?? null,
      groupId: parsed.groupId ?? null,
      groupName: parsed.groupName ?? null,
      isConnected: parsed.isConnected ?? false
    };
  } catch {
    return defaultConfig();
  }
}

function writeConfig(config: VkConfig): void {
  const filePath = getConfigPath();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
}

function maskToken(token: string): string {
  if (token.length <= 8) {
    return '••••••••';
  }

  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

function getRendererState(): VkRendererState {
  const config = readConfig();

  let tokenMasked = '';
  let tokenSaved = false;

  if (config.tokenEncrypted) {
    try {
      const token = decryptToken(config.tokenEncrypted);
      tokenMasked = maskToken(token);
      tokenSaved = true;
    } catch {
      tokenMasked = 'Токен сохранён';
      tokenSaved = true;
    }
  }

  return {
    tokenSaved,
    tokenMasked,
    groupValue: config.groupValue ?? '',
    groupId: config.groupId ?? null,
    groupName: config.groupName ?? '',
    isConnected: config.isConnected,
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  };
}

function vkApiRequest<T>(method: string, params: Record<string, string>): Promise<T> {
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

function saveVkSettings(token: string, groupValue: string): VkRendererState {
  const normalizedToken = token.trim();
  const normalizedGroup = groupValue.trim();

  if (!normalizedToken) {
    throw new Error('Введите токен.');
  }

  if (!normalizedGroup) {
    throw new Error('Введите id группы или short name.');
  }

  const config: VkConfig = {
    tokenEncrypted: encryptToken(normalizedToken),
    groupValue: normalizedGroup,
    groupId: null,
    groupName: null,
    isConnected: true
  };

  writeConfig(config);

  return getRendererState();
}

function updateGroup(groupValue: string): VkRendererState {
  const normalizedGroup = groupValue.trim();

  if (!normalizedGroup) {
    throw new Error('Введите id группы или short name.');
  }

  const config = readConfig();

  config.groupValue = normalizedGroup;
  config.groupId = null;
  config.groupName = null;
  config.isConnected = Boolean(config.tokenEncrypted && normalizedGroup);

  writeConfig(config);

  return getRendererState();
}

function clearVkSettings(): VkRendererState {
  writeConfig(defaultConfig());
  return getRendererState();
}

function extractNumericGroupId(groupValue: string): number | null {
  const normalized = groupValue.trim();

  if (!normalized) {
    return null;
  }

  const cleaned = normalized
    .replace(/^https?:\/\/(www\.)?vk\.com\//i, '')
    .replace(/^club/i, '')
    .trim();

  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  const groupId = Number(cleaned);

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return null;
  }

  return groupId;
}

async function publishVkPost(message: string): Promise<VkPublishResult> {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    throw new Error('Введите текст поста.');
  }

  const config = readConfig();

  if (!config.tokenEncrypted) {
    throw new Error('Токен VK не сохранён.');
  }

  if (!config.groupValue) {
    throw new Error('Группа VK не указана.');
  }

  const token = decryptToken(config.tokenEncrypted);
  const groupId = extractNumericGroupId(config.groupValue);

  if (!groupId) {
    throw new Error('Для публикации укажи numeric ID группы, например: 123456789');
  }

  const response = await vkApiRequest<{ post_id: number }>('wall.post', {
    owner_id: `-${groupId}`,
    from_group: '1',
    message: normalizedMessage,
    access_token: token
  });

  if (config.groupId !== groupId) {
    config.groupId = groupId;
    writeConfig(config);
  }

  const postUrl = `https://vk.com/wall-${groupId}_${response.post_id}`;

  return {
    success: true,
    postId: response.post_id,
    postUrl
  };
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 820,
    minHeight: 620,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('vk:get-settings', () => {
    return getRendererState();
  });

  ipcMain.handle('vk:save-settings', (_event, payload: { token: string; groupValue: string }) => {
    return saveVkSettings(payload.token, payload.groupValue);
  });

  ipcMain.handle('vk:update-group', (_event, payload: { groupValue: string }) => {
    return updateGroup(payload.groupValue);
  });

  ipcMain.handle('vk:disconnect', () => {
    return clearVkSettings();
  });

  ipcMain.handle('vk:publish-post', async (_event, payload: { message: string }) => {
    return publishVkPost(payload.message);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});