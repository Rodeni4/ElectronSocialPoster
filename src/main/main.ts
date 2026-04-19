import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

type VkConfig = {
  tokenEncrypted: string | null;
  groupValue: string | null;
  groupId: number | null;
  groupName: string | null;
  groupAvatar: string | null;
  isConnected: boolean;

  userTokenEncrypted: string | null;
  userId: number | null;
  userName: string | null;
  userAvatar: string | null;
  userScreenName: string | null;
  userConnected: boolean;
};

type VkRendererState = {
  tokenSaved: boolean;
  tokenMasked: string;
  groupValue: string;
  groupId: number | null;
  groupName: string;
  groupAvatar: string;
  isConnected: boolean;
  encryptionAvailable: boolean;
};

type VkUserRendererState = {
  userTokenSaved: boolean;
  userTokenMasked: string;
  userId: number | null;
  userName: string;
  userAvatar: string;
  userScreenName: string;
  userConnected: boolean;
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
    groupAvatar: null,
    isConnected: false,

    userTokenEncrypted: null,
    userId: null,
    userName: null,
    userAvatar: null,
    userScreenName: null,
    userConnected: false
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
      groupAvatar: parsed.groupAvatar ?? null,
      isConnected: parsed.isConnected ?? false,

      userTokenEncrypted: parsed.userTokenEncrypted ?? null,
      userId: parsed.userId ?? null,
      userName: parsed.userName ?? null,
      userAvatar: parsed.userAvatar ?? null,
      userScreenName: parsed.userScreenName ?? null,
      userConnected: parsed.userConnected ?? false
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
    groupAvatar: config.groupAvatar ?? '',
    isConnected: config.isConnected,
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  };
}

function getUserRendererState(): VkUserRendererState {
  const config = readConfig();

  let userTokenMasked = '';
  let userTokenSaved = false;

  if (config.userTokenEncrypted) {
    try {
      const token = decryptToken(config.userTokenEncrypted);
      userTokenMasked = maskToken(token);
      userTokenSaved = true;
    } catch {
      userTokenMasked = 'Токен сохранён';
      userTokenSaved = true;
    }
  }

  return {
    userTokenSaved,
    userTokenMasked,
    userId: config.userId ?? null,
    userName: config.userName ?? '',
    userAvatar: config.userAvatar ?? '',
    userScreenName: config.userScreenName ?? '',
    userConnected: config.userConnected ?? false
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

function getPreferredTokenForGroupPreview(config: VkConfig): { token: string | null; source: 'user' | 'group' | 'none' } {
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

async function fetchGroupPreview(config: VkConfig, groupValue: string): Promise<{
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

async function saveVkSettings(token: string, groupValue: string): Promise<VkRendererState> {
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
    userConnected: previousConfig.userConnected
  };

  const preview = await fetchGroupPreview(config, normalizedGroup);

  console.log('groupPreview parsed:', JSON.stringify(preview, null, 2));

  config.groupId = preview.id;
  config.groupName = preview.name || normalizedGroup;
  config.groupAvatar = preview.avatar || '';

  console.log('config before write:', JSON.stringify({
    groupId: config.groupId,
    groupName: config.groupName,
    groupAvatar: config.groupAvatar,
    groupValue: config.groupValue
  }, null, 2));

  writeConfig(config);

  return getRendererState();
}

async function updateGroup(groupValue: string): Promise<VkRendererState> {
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

  console.log('config before write:', JSON.stringify({
    groupId: config.groupId,
    groupName: config.groupName,
    groupAvatar: config.groupAvatar,
    groupValue: config.groupValue
  }, null, 2));

  writeConfig(config);

  return getRendererState();
}

function clearVkSettings(): VkRendererState {
  const config = readConfig();

  config.tokenEncrypted = null;
  config.groupValue = null;
  config.groupId = null;
  config.groupName = null;
  config.groupAvatar = null;
  config.isConnected = false;

  writeConfig(config);

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

async function saveUserSettings(token: string): Promise<VkUserRendererState> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error('Введите пользовательский токен.');
  }

  const users = await vkApiRequest<Array<{
    id: number;
    first_name: string;
    last_name: string;
    photo_100?: string;
    screen_name?: string;
  }>>('users.get', {
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

function clearUserSettings(): VkUserRendererState {
  const config = readConfig();

  config.userTokenEncrypted = null;
  config.userId = null;
  config.userName = null;
  config.userAvatar = null;
  config.userScreenName = null;
  config.userConnected = false;

  writeConfig(config);

  return getUserRendererState();
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

  ipcMain.handle('vk:save-settings', async (_event, payload: { token: string; groupValue: string }) => {
    return saveVkSettings(payload.token, payload.groupValue);
  });

  ipcMain.handle('vk:update-group', async (_event, payload: { groupValue: string }) => {
    return updateGroup(payload.groupValue);
  });

  ipcMain.handle('vk:disconnect', () => {
    return clearVkSettings();
  });

  ipcMain.handle('vk:publish-post', async (_event, payload: { message: string }) => {
    return publishVkPost(payload.message);
  });

  ipcMain.handle('vk-user:get-settings', () => {
    return getUserRendererState();
  });

  ipcMain.handle('vk-user:save-settings', async (_event, payload: { token: string }) => {
    return saveUserSettings(payload.token);
  });

  ipcMain.handle('vk-user:disconnect', () => {
    return clearUserSettings();
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