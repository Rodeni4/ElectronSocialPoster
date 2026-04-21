import { setBadgeState, setAlertState, clearAlertState, setPostState, clearPostState } from '../ui/status.js';

type VkUserRendererState = {
  userTokenSaved: boolean;
  userTokenMasked: string;
  userId: number | null;
  userName: string;
  userAvatar: string;
  userScreenName: string;
  userConnected: boolean;
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

type VkUserApi = {
  getUserSettings: () => Promise<VkUserRendererState>;
  saveUserSettings: (payload: { token: string }) => Promise<VkUserRendererState>;
  disconnectUser: () => Promise<VkUserRendererState>;
  publishPostByUserToken: (payload: {
    message: string;
    images?: VkImagePayload[];
  }) => Promise<VkPublishResult>;
};

type InitVkUserOptions = {
  api: VkUserApi;

  vkUserStatusBadge: HTMLDivElement | null;
  vkUserAlert: HTMLDivElement | null;
  vkUserAlertText: HTMLSpanElement | null;
  vkUserAlertCloseBtn: HTMLButtonElement | null;

  vkUserSetupView: HTMLDivElement | null;
  vkUserConnectedView: HTMLDivElement | null;

  vkUserTokenInput: HTMLInputElement | null;
  vkUserSaveBtn: HTMLButtonElement | null;
  vkUserDisconnectBtn: HTMLButtonElement | null;
  vkUserChangeTokenBtn: HTMLButtonElement | null;

  vkUserNameText: HTMLSpanElement | null;
  vkUserTokenText: HTMLSpanElement | null;

  vkUserHeaderAvatar: HTMLImageElement | null;
  vkUserHeaderName: HTMLSpanElement | null;

  vkUserPostText: HTMLTextAreaElement | null;
  vkUserPostButton: HTMLButtonElement | null;
  vkUserPostStatus: HTMLDivElement | null;
  vkUserPostImagesInput: HTMLInputElement | null;
  vkUserPostFilesText: HTMLDivElement | null;
};

export function initVkUserPlatform(options: InitVkUserOptions): void {
  const {
    api,

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
  } = options;

  function showUserAlert(message: string, type: 'error' | 'success' = 'error'): void {
    setAlertState(vkUserAlert, message, {
      type,
      textElement: vkUserAlertText,
      closable: true
    });
  }

  function hideUserAlert(): void {
    clearAlertState(vkUserAlert, vkUserAlertText);
  }

  function setUserBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    setBadgeState(vkUserStatusBadge, text, mode);
  }

  function setUserPostStatus(
    message: string,
    type: 'idle' | 'success' | 'error' | 'loading' = 'idle',
    allowHtml = false
  ): void {
    if (!message) {
      clearPostState(vkUserPostStatus);
      return;
    }

    setPostState(vkUserPostStatus, message, type, {
      allowHtml,
      closeButtonId: 'vkUserPostStatusCloseBtn',
      onClose: () => setUserPostStatus('', 'idle'),
      baseClassName: 'post-status'
    });
  }

  function updateUserPostFilesText(): void {
    const files = vkUserPostImagesInput?.files;

    if (!files || files.length === 0) {
      if (vkUserPostFilesText) {
        vkUserPostFilesText.textContent = '';
      }
      return;
    }

    const names = Array.from(files).map((file) => file.name);

    if (vkUserPostFilesText) {
      vkUserPostFilesText.textContent = names.join(', ');
    }
  }

  async function filesToPayload(files: FileList | null): Promise<VkImagePayload[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const result: VkImagePayload[] = [];

    for (const file of Array.from(files)) {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = '';
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }

      result.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        dataBase64: btoa(binary)
      });
    }

    return result;
  }

  function renderUserState(state: VkUserRendererState): void {
    if (
      !vkUserSetupView ||
      !vkUserConnectedView ||
      !vkUserDisconnectBtn ||
      !vkUserPostButton ||
      !vkUserPostText ||
      !vkUserPostImagesInput ||
      !vkUserTokenInput ||
      !vkUserHeaderName ||
      !vkUserNameText ||
      !vkUserTokenText ||
      !vkUserHeaderAvatar ||
      !vkUserPostFilesText
    ) {
      return;
    }

    if (state.userConnected) {
      setUserBadge('Подключено', 'on');

      vkUserSetupView.hidden = true;
      vkUserConnectedView.hidden = false;
      vkUserDisconnectBtn.hidden = false;

      vkUserPostButton.disabled = false;
      vkUserPostText.disabled = false;
      vkUserPostImagesInput.disabled = false;

      vkUserTokenInput.value = '';

      vkUserHeaderName.textContent = state.userName || '';

      if (state.userScreenName) {
        vkUserNameText.textContent = `@${state.userScreenName}`;
      } else if (state.userId) {
        vkUserNameText.textContent = `id${state.userId}`;
      } else {
        vkUserNameText.textContent = '—';
      }

      vkUserTokenText.textContent = state.userTokenMasked || 'Скрыт';

      if (state.userAvatar) {
        vkUserHeaderAvatar.src = state.userAvatar;
        vkUserHeaderAvatar.hidden = false;
      } else {
        vkUserHeaderAvatar.src = '';
        vkUserHeaderAvatar.hidden = true;
      }
    } else {
      setUserBadge('Не подключено', 'off');

      vkUserHeaderAvatar.src = '';
      vkUserHeaderAvatar.hidden = true;
      vkUserHeaderName.textContent = '';

      vkUserSetupView.hidden = false;
      vkUserConnectedView.hidden = true;
      vkUserDisconnectBtn.hidden = true;

      vkUserTokenInput.value = '';
      vkUserNameText.textContent = '—';
      vkUserTokenText.textContent = '';

      vkUserPostButton.disabled = true;
      vkUserPostText.disabled = true;
      vkUserPostImagesInput.disabled = true;
      vkUserPostImagesInput.value = '';
      vkUserPostFilesText.textContent = '';
      setUserPostStatus('Сначала подключите VK User.', 'idle');
    }
  }

  function setUserLoadingState(isLoading: boolean): void {
    if (!vkUserSaveBtn || !vkUserTokenInput) {
      return;
    }

    vkUserSaveBtn.disabled = isLoading;
    vkUserTokenInput.disabled = isLoading;

    if (isLoading) {
      setUserBadge('Проверяем...', 'loading');
    }
  }

  function setUserPostLoadingState(isLoading: boolean): void {
    if (!vkUserPostButton || !vkUserPostText || !vkUserPostImagesInput) {
      return;
    }

    vkUserPostButton.disabled = isLoading;
    vkUserPostText.disabled = isLoading;
    vkUserPostImagesInput.disabled = isLoading;

    if (isLoading) {
      setUserPostStatus('Отправка...', 'loading');
    }
  }

  async function loadVkUserState(): Promise<void> {
    try {
      hideUserAlert();
      const state = await api.getUserSettings();
      renderUserState(state);
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось загрузить настройки VK User.');
    }
  }

  vkUserPostImagesInput?.addEventListener('change', () => {
    updateUserPostFilesText();
  });

  vkUserAlertCloseBtn?.addEventListener('click', () => {
    hideUserAlert();
  });

  vkUserSaveBtn?.addEventListener('click', async () => {
    try {
      hideUserAlert();

      const token = vkUserTokenInput?.value.trim() || '';

      if (!token) {
        showUserAlert('Введите пользовательский токен.');
        vkUserTokenInput?.focus();
        return;
      }

      setUserLoadingState(true);

      const state = await api.saveUserSettings({ token });
      renderUserState(state);
      showUserAlert('VK User подключён и сохранён.', 'success');
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось подключить VK User.');
    } finally {
      setUserLoadingState(false);
    }
  });

  vkUserChangeTokenBtn?.addEventListener('click', () => {
    hideUserAlert();

    if (vkUserSetupView) vkUserSetupView.hidden = false;
    if (vkUserConnectedView) vkUserConnectedView.hidden = true;
    if (vkUserDisconnectBtn) vkUserDisconnectBtn.hidden = true;

    if (vkUserTokenInput) {
      vkUserTokenInput.value = '';
      vkUserTokenInput.focus();
    }

    setUserBadge('Не подключено', 'off');
  });

  vkUserDisconnectBtn?.addEventListener('click', async () => {
    try {
      hideUserAlert();

      const confirmed = window.confirm('Отключить VK User и удалить сохранённый токен?');
      if (!confirmed) {
        return;
      }

      const state = await api.disconnectUser();
      renderUserState(state);
      showUserAlert('VK User отключён.', 'success');
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось отключить VK User.');
    }
  });

  vkUserPostButton?.addEventListener('click', async () => {
    try {
      hideUserAlert();
      setUserPostStatus('', 'idle');

      const message = vkUserPostText?.value.trim() || '';
      const images = await filesToPayload(vkUserPostImagesInput?.files || null);

      if (!message && images.length === 0) {
        setUserPostStatus('Введите текст поста или выберите изображение.', 'error');
        vkUserPostText?.focus();
        return;
      }

      setUserPostLoadingState(true);

      const result = await api.publishPostByUserToken({
        message,
        images
      });

      if (result.success) {
        if (vkUserPostText) vkUserPostText.value = '';
        if (vkUserPostImagesInput) vkUserPostImagesInput.value = '';
        if (vkUserPostFilesText) vkUserPostFilesText.textContent = '';

        if (result.postUrl) {
          setUserPostStatus(
            `Пост опубликован: <a href="${result.postUrl}" target="_blank" rel="noopener noreferrer">${result.postUrl}</a>`,
            'success',
            true
          );
        } else {
          setUserPostStatus('Пост опубликован.', 'success');
        }
      } else {
        setUserPostStatus(result.error || 'Не удалось опубликовать пост.', 'error');
      }
    } catch (error) {
      setUserPostStatus(error instanceof Error ? error.message : 'Ошибка отправки поста.', 'error');
    } finally {
      setUserPostLoadingState(false);
      const state = await api.getUserSettings();
      renderUserState(state);
    }
  });

  void loadVkUserState();
}