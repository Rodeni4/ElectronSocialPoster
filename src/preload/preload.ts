import { contextBridge, ipcRenderer } from 'electron';

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

contextBridge.exposeInMainWorld('vkAPI', {
  getSettings: (): Promise<VkRendererState> => ipcRenderer.invoke('vk:get-settings'),

  saveSettings: (payload: { token: string; groupValue: string }): Promise<VkRendererState> =>
    ipcRenderer.invoke('vk:save-settings', payload),

  updateGroup: (payload: { groupValue: string }): Promise<VkRendererState> =>
    ipcRenderer.invoke('vk:update-group', payload),

  disconnect: (): Promise<VkRendererState> => ipcRenderer.invoke('vk:disconnect'),

  publishPost: (payload: { message: string }): Promise<VkPublishResult> =>
    ipcRenderer.invoke('vk:publish-post', payload)
});