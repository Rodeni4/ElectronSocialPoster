import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

type VkConfig = {
  tokenEncrypted: string | null;
  groupValue: string | null;
  isConnected: boolean;
};

type VkRendererState = {
  tokenSaved: boolean;
  tokenMasked: string;
  groupValue: string;
  isConnected: boolean;
  encryptionAvailable: boolean;
};

const CONFIG_FILE_NAME = 'vk-config.json';

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE_NAME);
}

function defaultConfig(): VkConfig {
  return {
    tokenEncrypted: null,
    groupValue: null,
    isConnected: false
  };
}

function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(token).toString('base64');
  }

  // Фолбэк без шифрования — только если safeStorage недоступен
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
    isConnected: config.isConnected,
    encryptionAvailable: safeStorage.isEncryptionAvailable()
  };
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
  config.isConnected = Boolean(config.tokenEncrypted && normalizedGroup);

  writeConfig(config);

  return getRendererState();
}

function clearVkSettings(): VkRendererState {
  writeConfig(defaultConfig());
  return getRendererState();
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