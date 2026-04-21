import {
  type VkConfig,
  type VkRendererState,
  type VkUserRendererState,
  type VkImagePayload,
  type VkPublishResult,
  decryptToken,
  encryptToken,
  getRendererState,
  getUserRendererState,
  readConfig,
  writeConfig
} from './config-store.js';
import { uploadWallPhotosByUserToken, vkApiRequest } from './social-api.js';

export function getPreferredTokenForGroupPreview(
  config: VkConfig
): { token: string | null; source: 'user' | 'group' | 'none' } {
  if (config.tokenEncrypted) {
    try {
      return {
        token: decryptToken(config.tokenEncrypted),
        source: 'group'
      };
    } catch {
      // ignore
    }
  }

  if (config.userTokenEncrypted) {
    try {
      return {
        token: decryptToken(config.userTokenEncrypted),
        source: 'user'
      };
    } catch {
      // ignore
    }
  }

  return {
    token: null,
    source: 'none'
  };
}

export async function fetchGroupPreview(
  config: VkConfig,
  groupValue: string
): Promise<{
  id: number | null;
  name: string;
  avatar: string;
}> {
  const normalizedGroup = groupValue.trim();

  if (!normalizedGroup) {
    return {
      id: null,
      name: '',
      avatar: ''
    };
  }

  const preferred = getPreferredTokenForGroupPreview(config);

  const requestParams: Record<string, string> = {
    group_id: normalizedGroup,
    fields: 'photo_50,photo_100,photo_200'
  };

  if (preferred.token) {
    requestParams.access_token = preferred.token;
  }

  try {
    const response = await vkApiRequest<{
      groups?: Array<{
        id: number;
        name: string;
        photo_50?: string;
        photo_100?: string;
        photo_200?: string;
      }>;
      profiles?: unknown[];
    }>('groups.getById', requestParams);

    const group = response.groups?.[0];

    if (!group) {
      return {
        id: null,
        name: normalizedGroup,
        avatar: ''
      };
    }

    return {
      id: group.id ?? null,
      name: group.name || normalizedGroup,
      avatar: group.photo_200 || group.photo_100 || group.photo_50 || ''
    };
  } catch {
    return {
      id: null,
      name: normalizedGroup,
      avatar: ''
    };
  }
}

export async function saveVkSettings(
  token: string,
  groupValue: string
): Promise<VkRendererState> {
  const normalizedToken = token.trim();
  const normalizedGroup = groupValue.trim();

  if (!normalizedToken) {
    throw new Error('Введите токен.');
  }

  if (!normalizedGroup) {
    throw new Error('Введите id группы или short name.');
  }

  const previousConfig = readConfig();

  const config: VkConfig = {
    tokenEncrypted: encryptToken(normalizedToken),
    groupValue: normalizedGroup,
    groupId: null,
    groupName: normalizedGroup,
    groupAvatar: '',
    isConnected: true,

    userTokenEncrypted: previousConfig.userTokenEncrypted,
    userId: previousConfig.userId,
    userName: previousConfig.userName,
    userAvatar: previousConfig.userAvatar,
    userScreenName: previousConfig.userScreenName,
    userConnected: previousConfig.userConnected,

    okGroupTokenEncrypted: previousConfig.okGroupTokenEncrypted,
    okGroupValue: previousConfig.okGroupValue,
    okGroupId: previousConfig.okGroupId,
    okGroupName: previousConfig.okGroupName,
    okGroupAvatar: previousConfig.okGroupAvatar,
    okGroupConnected: previousConfig.okGroupConnected
  };

  const preview = await fetchGroupPreview(config, normalizedGroup);

  console.log('groupPreview parsed:', JSON.stringify(preview, null, 2));

  config.groupId = preview.id;
  config.groupName = preview.name || normalizedGroup;
  config.groupAvatar = preview.avatar || '';

  console.log(
    'config before write:',
    JSON.stringify(
      {
        groupId: config.groupId,
        groupName: config.groupName,
        groupAvatar: config.groupAvatar,
        groupValue: config.groupValue
      },
      null,
      2
    )
  );

  writeConfig(config);

  return getRendererState();
}

export async function updateGroup(groupValue: string): Promise<VkRendererState> {
  const normalizedGroup = groupValue.trim();

  if (!normalizedGroup) {
    throw new Error('Введите id группы или short name.');
  }

  const config = readConfig();

  config.groupValue = normalizedGroup;
  config.groupId = null;
  config.groupName = normalizedGroup;
  config.groupAvatar = '';
  config.isConnected = Boolean(config.tokenEncrypted && normalizedGroup);

  const preview = await fetchGroupPreview(config, normalizedGroup);

  console.log('groupPreview parsed:', JSON.stringify(preview, null, 2));

  config.groupId = preview.id;
  config.groupName = preview.name || normalizedGroup;
  config.groupAvatar = preview.avatar || '';

  console.log(
    'config before write:',
    JSON.stringify(
      {
        groupId: config.groupId,
        groupName: config.groupName,
        groupAvatar: config.groupAvatar,
        groupValue: config.groupValue
      },
      null,
      2
    )
  );

  writeConfig(config);

  return getRendererState();
}

export function extractNumericGroupId(groupValue: string): number | null {
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

export async function publishVkPost(message: string): Promise<VkPublishResult> {
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

export async function publishVkPostByUserToken(
  message: string,
  images: VkImagePayload[] = []
): Promise<VkPublishResult> {
  const normalizedMessage = message.trim();

  if (!normalizedMessage && images.length === 0) {
    throw new Error('Введите текст поста или выберите изображение.');
  }

  const config = readConfig();

  if (!config.userTokenEncrypted) {
    throw new Error('Пользовательский токен VK не сохранён.');
  }

  if (!config.groupValue) {
    throw new Error('Группа VK не указана.');
  }

  const token = decryptToken(config.userTokenEncrypted);
  const groupId = extractNumericGroupId(config.groupValue);

  if (!groupId) {
    throw new Error('Для публикации укажи numeric ID группы, например: 123456789');
  }

  let attachments = '';

  if (images.length > 0) {
    const photoAttachments = await uploadWallPhotosByUserToken(token, groupId, images);
    attachments = photoAttachments.join(',');
  }

  const requestParams: Record<string, string> = {
    owner_id: `-${groupId}`,
    from_group: '1',
    access_token: token
  };

  if (normalizedMessage) {
    requestParams.message = normalizedMessage;
  }

  if (attachments) {
    requestParams.attachments = attachments;
  }

  const response = await vkApiRequest<{ post_id: number }>('wall.post', requestParams);

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

export async function saveUserSettings(token: string): Promise<VkUserRendererState> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error('Введите пользовательский токен.');
  }

  const users = await vkApiRequest<
    Array<{
      id: number;
      first_name: string;
      last_name: string;
      photo_100?: string;
      screen_name?: string;
    }>
  >('users.get', {
    access_token: normalizedToken,
    fields: 'photo_100,screen_name'
  });

  const userInfo = users[0];

  if (!userInfo) {
    throw new Error('Не удалось получить данные пользователя.');
  }

  const config = readConfig();

  config.userTokenEncrypted = encryptToken(normalizedToken);
  config.userId = userInfo.id;
  config.userName = `${userInfo.first_name} ${userInfo.last_name}`;
  config.userAvatar = userInfo.photo_100 ?? null;
  config.userScreenName = userInfo.screen_name ?? null;
  config.userConnected = true;

  writeConfig(config);

  return getUserRendererState();
}