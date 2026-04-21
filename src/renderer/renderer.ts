import { initTabs } from './ui/tabs.js';
import { initOkPlatform } from './platforms/ok.js';
import { initVkUserPlatform } from './platforms/vk-user.js';
import { initVkGroupPlatform } from './platforms/vk-group.js';

declare global {
  interface Window {
    vkAPI?: {
      getSettings: () => Promise<VkRendererState>;
      saveSettings: (payload: { token: string; groupValue: string }) => Promise<VkRendererState>;
      updateGroup: (payload: { groupValue: string }) => Promise<VkRendererState>;
      disconnect: () => Promise<VkRendererState>;
      publishPost: (payload: { message: string }) => Promise<VkPublishResult>;
      publishPostByUserToken: (payload: {
        message: string;
        images?: VkImagePayload[];
      }) => Promise<VkPublishResult>;
      getUserSettings: () => Promise<VkUserRendererState>;
      saveUserSettings: (payload: { token: string }) => Promise<VkUserRendererState>;
      disconnectUser: () => Promise<VkUserRendererState>;

      getOkGroupSettings?: () => Promise<OkGroupRendererState>;
      saveOkGroupSettings?: (payload: {
        token: string;
        groupValue: string;
      }) => Promise<OkGroupRendererState>;
      disconnectOkGroup?: () => Promise<OkGroupRendererState>;
      getOkAuthSettings?: () => Promise<OkAuthRendererState>;
      loginOkAuth?: () => Promise<OkAuthRendererState>;
      disconnectOkAuth?: () => Promise<OkAuthRendererState>;
    };
  }
}

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

document.addEventListener('DOMContentLoaded', () => {
  const vkStatusBadge = document.getElementById('vkStatusBadge') as HTMLDivElement | null;
  const vkAlert = document.getElementById('vkAlert') as HTMLDivElement | null;
  const vkAlertText = document.getElementById('vkAlertText') as HTMLSpanElement | null;
  const vkAlertCloseBtn = document.getElementById('vkAlertCloseBtn') as HTMLButtonElement | null;

  const vkSetupView = document.getElementById('vkSetupView') as HTMLDivElement | null;
  const vkConnectedView = document.getElementById('vkConnectedView') as HTMLDivElement | null;

  const vkTokenInput = document.getElementById('vkTokenInput') as HTMLInputElement | null;
  const vkGroupInput = document.getElementById('vkGroupInput') as HTMLInputElement | null;

  const vkSaveBtn = document.getElementById('vkSaveBtn') as HTMLButtonElement | null;
  const vkChangeTokenBtn = document.getElementById('vkChangeTokenBtn') as HTMLButtonElement | null;
  const vkChangeGroupBtn = document.getElementById('vkChangeGroupBtn') as HTMLButtonElement | null;
  const vkDisconnectBtn = document.getElementById('vkDisconnectBtn') as HTMLButtonElement | null;

  const vkGroupText = document.getElementById('vkGroupText') as HTMLSpanElement | null;
  const vkTokenText = document.getElementById('vkTokenText') as HTMLSpanElement | null;
  const vkGroupEditBox = document.getElementById('vkGroupEditBox') as HTMLDivElement | null;
  const vkGroupEditInput = document.getElementById('vkGroupEditInput') as HTMLInputElement | null;
  const vkGroupSaveBtn = document.getElementById('vkGroupSaveBtn') as HTMLButtonElement | null;
  const vkGroupCancelBtn = document.getElementById('vkGroupCancelBtn') as HTMLButtonElement | null;

  const vkGroupHeaderAvatar = document.getElementById('vkGroupHeaderAvatar') as HTMLImageElement | null;
  const vkGroupHeaderName = document.getElementById('vkGroupHeaderName') as HTMLSpanElement | null;

  const vkPostText = document.getElementById('vkPostText') as HTMLTextAreaElement | null;
  const vkPostButton = document.getElementById('vkPostButton') as HTMLButtonElement | null;
  const vkPostStatus = document.getElementById('vkPostStatus') as HTMLDivElement | null;

  const vkUserPostText = document.getElementById('vkUserPostText') as HTMLTextAreaElement | null;
  const vkUserPostButton = document.getElementById('vkUserPostButton') as HTMLButtonElement | null;
  const vkUserPostStatus = document.getElementById('vkUserPostStatus') as HTMLDivElement | null;
  const vkUserPostImagesInput = document.getElementById('vkUserPostImagesInput') as HTMLInputElement | null;
  const vkUserPostFilesText = document.getElementById('vkUserPostFilesText') as HTMLDivElement | null;

  const vkUserStatusBadge = document.getElementById('vkUserStatusBadge') as HTMLDivElement | null;
  const vkUserAlert = document.getElementById('vkUserAlert') as HTMLDivElement | null;
  const vkUserAlertText = document.getElementById('vkUserAlertText') as HTMLSpanElement | null;
  const vkUserAlertCloseBtn = document.getElementById('vkUserAlertCloseBtn') as HTMLButtonElement | null;

  const vkUserSetupView = document.getElementById('vkUserSetupView') as HTMLDivElement | null;
  const vkUserConnectedView = document.getElementById('vkUserConnectedView') as HTMLDivElement | null;

  const vkUserTokenInput = document.getElementById('vkUserTokenInput') as HTMLInputElement | null;
  const vkUserSaveBtn = document.getElementById('vkUserSaveBtn') as HTMLButtonElement | null;
  const vkUserDisconnectBtn = document.getElementById('vkUserDisconnectBtn') as HTMLButtonElement | null;
  const vkUserChangeTokenBtn = document.getElementById('vkUserChangeTokenBtn') as HTMLButtonElement | null;

  const vkUserNameText = document.getElementById('vkUserNameText') as HTMLSpanElement | null;
  const vkUserTokenText = document.getElementById('vkUserTokenText') as HTMLSpanElement | null;

  const vkUserHeaderAvatar = document.getElementById('vkUserHeaderAvatar') as HTMLImageElement | null;
  const vkUserHeaderName = document.getElementById('vkUserHeaderName') as HTMLSpanElement | null;

  const okGroupCard = document.getElementById('okGroupCard') as HTMLDivElement | null;
  const okGroupStatusBadge = document.getElementById('okGroupStatusBadge') as HTMLDivElement | null;
  const okGroupAlert = document.getElementById('okGroupAlert') as HTMLDivElement | null;
  const okGroupAvatar = document.getElementById('okGroupAvatar') as HTMLImageElement | null;
  const okGroupIdInput = document.getElementById('okGroupIdInput') as HTMLInputElement | null;
  const okGroupTokenInput = document.getElementById('okGroupTokenInput') as HTMLInputElement | null;
  const okGroupConnectButton = document.getElementById('okGroupConnectButton') as HTMLButtonElement | null;
  const okGroupDisconnectButton = document.getElementById('okGroupDisconnectButton') as HTMLButtonElement | null;

  const okAuthCard = document.getElementById('okAuthCard') as HTMLDivElement | null;
  const okAuthStatusBadge = document.getElementById('okAuthStatusBadge') as HTMLDivElement | null;
  const okAuthAlert = document.getElementById('okAuthAlert') as HTMLDivElement | null;
  const okAuthAvatar = document.getElementById('okAuthAvatar') as HTMLImageElement | null;
  const okAuthLoginButton = document.getElementById('okAuthLoginButton') as HTMLButtonElement | null;
  const okAuthDisconnectButton = document.getElementById('okAuthDisconnectButton') as HTMLButtonElement | null;

  const tabPostBtn = document.getElementById('tabPostBtn') as HTMLElement | null;
  const tabAuthBtn = document.getElementById('tabAuthBtn') as HTMLElement | null;
  const postTabPanel = document.getElementById('postTabPanel') as HTMLElement | null;
  const authTabPanel = document.getElementById('authTabPanel') as HTMLElement | null;

  initTabs({
    tabPostBtn,
    tabAuthBtn,
    postTabPanel,
    authTabPanel,
    defaultTab: 'post'
  });

  if (!window.vkAPI) {
    console.error('window.vkAPI не найден. Проверь preload.ts и BrowserWindow preload.');
    return;
  }

  const requiredElements = [
    vkStatusBadge,
    vkAlert,
    vkAlertText,
    vkAlertCloseBtn,
    vkSetupView,
    vkConnectedView,
    vkTokenInput,
    vkGroupInput,
    vkSaveBtn,
    vkChangeTokenBtn,
    vkChangeGroupBtn,
    vkDisconnectBtn,
    vkGroupText,
    vkTokenText,
    vkGroupEditBox,
    vkGroupEditInput,
    vkGroupSaveBtn,
    vkGroupCancelBtn,
    vkGroupHeaderAvatar,
    vkGroupHeaderName,
    vkPostText,
    vkPostButton,
    vkPostStatus,
    vkUserPostText,
    vkUserPostButton,
    vkUserPostStatus,
    vkUserPostImagesInput,
    vkUserPostFilesText,
    vkUserStatusBadge,
    vkUserAlert,
    vkUserAlertText,
    vkUserAlertCloseBtn,
    vkUserSetupView,
    vkUserConnectedView,
    vkUserTokenInput,
    vkUserSaveBtn,
    vkUserDisconnectBtn,
    vkUserChangeTokenBtn,
    vkUserNameText,
    vkUserTokenText,
    vkUserHeaderAvatar,
    vkUserHeaderName,
    tabPostBtn,
    tabAuthBtn,
    postTabPanel,
    authTabPanel
  ];

  if (requiredElements.some((el) => !el)) {
    console.error('Не найдены обязательные элементы интерфейса VK.');
    return;
  }

  initOkPlatform({
    api: window.vkAPI,

    okGroupCard,
    okGroupStatusBadge,
    okGroupAlert,
    okGroupAvatar,
    okGroupIdInput,
    okGroupTokenInput,
    okGroupConnectButton,
    okGroupDisconnectButton,

    okAuthCard,
    okAuthStatusBadge,
    okAuthAlert,
    okAuthAvatar,
    okAuthLoginButton,
    okAuthDisconnectButton
  });

  initVkUserPlatform({
    api: window.vkAPI,

    vkUserStatusBadge,
    vkUserAlert,
    vkUserAlertText,
    vkUserAlertCloseBtn,

    vkUserSetupView,
    vkUserConnectedView,

    vkUserTokenInput,
    vkUserSaveBtn,
    vkUserDisconnectBtn,
    vkUserChangeTokenBtn,

    vkUserNameText,
    vkUserTokenText,

    vkUserHeaderAvatar,
    vkUserHeaderName,

    vkUserPostText,
    vkUserPostButton,
    vkUserPostStatus,
    vkUserPostImagesInput,
    vkUserPostFilesText
  });

  initVkGroupPlatform({
    api: window.vkAPI,

    vkStatusBadge,
    vkAlert,
    vkAlertText,
    vkAlertCloseBtn,

    vkSetupView,
    vkConnectedView,

    vkTokenInput,
    vkGroupInput,

    vkSaveBtn,
    vkChangeTokenBtn,
    vkChangeGroupBtn,
    vkDisconnectBtn,

    vkGroupText,
    vkTokenText,
    vkGroupEditBox,
    vkGroupEditInput,
    vkGroupSaveBtn,
    vkGroupCancelBtn,

    vkGroupHeaderAvatar,
    vkGroupHeaderName,

    vkPostText,
    vkPostButton,
    vkPostStatus
  });
});

export { };