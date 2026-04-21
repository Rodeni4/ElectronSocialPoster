import { app, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export type VkConfig = {
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

  okGroupTokenEncrypted: string | null;
  okGroupValue: string | null;
  okGroupId: string | null;
  okGroupName: string | null;
  okGroupAvatar: string | null;
  okGroupConnected: boolean;
};

export type VkRendererState = {
  tokenSaved: boolean;
  tokenMasked: string;
  groupValue: string;
  groupId: number | null;
  groupName: string;
  groupAvatar: string;
  isConnected: boolean;
  encryptionAvailable: boolean;
};

export type VkUserRendererState = {
  userTokenSaved: boolean;
  userTokenMasked: string;
  userId: number | null;
  userName: string;
  userAvatar: string;
  userScreenName: string;
  userConnected: boolean;
};

export type OkGroupRendererState = {
  tokenMasked: string;
  groupId: string;
  groupName: string;
  groupAvatar: string;
  isConnected: boolean;
};

export type VkImagePayload = {
  name: string;
  type: string;
  dataBase64: string;
};

export type VkPublishResult = {
  success: boolean;
  error?: string;
  postUrl?: string;
  postId?: number;
};

const CONFIG_FILE_NAME = 'vk-config.json';

export function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME);
}

export function defaultConfig(): VkConfig {
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
    userConnected: false,

    okGroupTokenEncrypted: null,
    okGroupValue: null,
    okGroupId: null,
    okGroupName: null,
    okGroupAvatar: null,
    okGroupConnected: false
  };
}

export function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64');
  }

  return Buffer.from(token, 'utf8').toString('base64');
}

export function decryptToken(encoded: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
  }

  return Buffer.from(encoded, 'base64').toString('utf8');
}

export function readConfig(): VkConfig {
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
      userConnected: parsed.userConnected ?? false,

      okGroupTokenEncrypted: parsed.okGroupTokenEncrypted ?? null,
      okGroupValue: parsed.okGroupValue ?? null,
      okGroupId: parsed.okGroupId ?? null,
      okGroupName: parsed.okGroupName ?? null,
      okGroupAvatar: parsed.okGroupAvatar ?? null,
      okGroupConnected: parsed.okGroupConnected ?? false
    };
  } catch {
    return defaultConfig();
  }
}

export function writeConfig(config: VkConfig): void {
  const filePath = getConfigPath();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
}

export function maskToken(token: string): string {
  if (token.length <= 8) {
    return '••••••••';
  }

  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export function getRendererState(): VkRendererState {
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

export function getUserRendererState(): VkUserRendererState {
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

export function getOkGroupRendererState(): OkGroupRendererState {
  const config = readConfig();

  let tokenMasked = '';

  if (config.okGroupTokenEncrypted) {
    try {
      const token = decryptToken(config.okGroupTokenEncrypted);
      tokenMasked = maskToken(token);
    } catch {
      tokenMasked = 'Токен сохранён';
    }
  }

  return {
    tokenMasked,
    groupId: config.okGroupId ?? '',
    groupName: config.okGroupName ?? '',
    groupAvatar: config.okGroupAvatar ?? '',
    isConnected: config.okGroupConnected ?? false
  };
}

export function clearVkSettings(): VkRendererState {
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

export function clearUserSettings(): VkUserRendererState {
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

export function clearOkGroupSettings(): OkGroupRendererState {
  const config = readConfig();

  config.okGroupTokenEncrypted = null;
  config.okGroupValue = null;
  config.okGroupId = null;
  config.okGroupName = null;
  config.okGroupAvatar = null;
  config.okGroupConnected = false;

  writeConfig(config);

  return getOkGroupRendererState();
}