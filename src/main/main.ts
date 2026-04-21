import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import {
  type VkImagePayload,
  clearOkGroupSettings,
  clearUserSettings,
  clearVkSettings,
  getOkGroupRendererState,
  getRendererState,
  getUserRendererState
} from './services/config-store.js';
import { saveOkGroupSettings } from './services/ok-service.js';
import {
  publishVkPost,
  publishVkPostByUserToken,
  saveUserSettings,
  saveVkSettings,
  updateGroup
} from './services/vk-service.js';

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

  ipcMain.handle('ok-group:get-settings', () => {
    return getOkGroupRendererState();
  });

  ipcMain.handle('ok-auth:get-settings', () => {
    return {
      name: '',
      avatar: '',
      isConnected: false
    };
  });

  ipcMain.handle('ok-auth:login', async () => {
    console.log('OK AUTH LOGIN START');

    // пока просто возвращаем состояние
    return {
      name: '',
      avatar: '',
      isConnected: false
    };
  });

  ipcMain.handle('ok-auth:disconnect', () => {
    return {
      name: '',
      avatar: '',
      isConnected: false
    };
  });

  ipcMain.handle(
    'ok-group:save-settings',
    async (_event, payload: { token: string; groupValue: string }) => {
      return await saveOkGroupSettings(payload.token, payload.groupValue);
    }
  );

  ipcMain.handle('ok-group:disconnect', () => {
    return clearOkGroupSettings();
  });

  ipcMain.handle(
    'vk-user:publish-post',
    async (_event, payload: { message: string; images?: VkImagePayload[] }) => {
      return publishVkPostByUserToken(payload.message, payload.images ?? []);
    }
  );

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