import { contextBridge, ipcRenderer } from 'electron';

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

type OkGroupRendererState = {
  tokenMasked: string;
  groupId: string;
  groupName: string;
  groupAvatar: string;
  isConnected: boolean;
};

type OkAuthRendererState = {
  name: string;
  avatar: string;
  isConnected: boolean;
};

type VkImagePayload = {
  name: string;
  type: string;
  dataBase64: string;
};

type VkPublishResult = {
  success: boolean;
  error?: string;
  postUrl?: string;
  postId?: number;
};

type SaveOkGroupPayload = {
  groupValue: string;
  token: string;
};

contextBridge.exposeInMainWorld('vkAPI', {
  getSettings: (): Promise<VkRendererState> => ipcRenderer.invoke('vk:get-settings'),

  saveSettings: (payload: { token: string; groupValue: string }): Promise<VkRendererState> =>
    ipcRenderer.invoke('vk:save-settings', payload),

  updateGroup: (payload: { groupValue: string }): Promise<VkRendererState> =>
    ipcRenderer.invoke('vk:update-group', payload),

  disconnect: (): Promise<VkRendererState> => ipcRenderer.invoke('vk:disconnect'),

  publishPost: (payload: { message: string }): Promise<VkPublishResult> =>
    ipcRenderer.invoke('vk:publish-post', payload),

  getUserSettings: (): Promise<VkUserRendererState> =>
    ipcRenderer.invoke('vk-user:get-settings'),

  saveUserSettings: (payload: { token: string }): Promise<VkUserRendererState> =>
    ipcRenderer.invoke('vk-user:save-settings', payload),

  disconnectUser: (): Promise<VkUserRendererState> =>
    ipcRenderer.invoke('vk-user:disconnect'),

  publishPostByUserToken: (payload: {
    message: string;
    images?: VkImagePayload[];
  }): Promise<VkPublishResult> =>
    ipcRenderer.invoke('vk-user:publish-post', payload),

  getOkGroupSettings: (): Promise<OkGroupRendererState> =>
    ipcRenderer.invoke('ok-group:get-settings'),

  saveOkGroupSettings: (payload: SaveOkGroupPayload): Promise<OkGroupRendererState> =>
    ipcRenderer.invoke('ok-group:save-settings', payload),

  disconnectOkGroup: (): Promise<OkGroupRendererState> =>
    ipcRenderer.invoke('ok-group:disconnect'),

  getOkAuthSettings: (): Promise<OkAuthRendererState> =>
    ipcRenderer.invoke('ok-auth:get-settings'),

  loginOkAuth: (): Promise<OkAuthRendererState> =>
    ipcRenderer.invoke('ok-auth:login'),

  disconnectOkAuth: (): Promise<OkAuthRendererState> =>
    ipcRenderer.invoke('ok-auth:disconnect')

});