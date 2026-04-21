import { setBadgeState, setAlertState, clearAlertState, setPostState, clearPostState } from '../ui/status.js';

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

type VkPublishResult = {
  success: boolean;
  error?: string;
  postUrl?: string;
  postId?: number;
};

type VkGroupApi = {
  getSettings: () => Promise<VkRendererState>;
  saveSettings: (payload: { token: string; groupValue: string }) => Promise<VkRendererState>;
  updateGroup: (payload: { groupValue: string }) => Promise<VkRendererState>;
  disconnect: () => Promise<VkRendererState>;
  publishPost: (payload: { message: string }) => Promise<VkPublishResult>;
};

type InitVkGroupOptions = {
  api: VkGroupApi;

  vkStatusBadge: HTMLDivElement | null;
  vkAlert: HTMLDivElement | null;
  vkAlertText: HTMLSpanElement | null;
  vkAlertCloseBtn: HTMLButtonElement | null;

  vkSetupView: HTMLDivElement | null;
  vkConnectedView: HTMLDivElement | null;

  vkTokenInput: HTMLInputElement | null;
  vkGroupInput: HTMLInputElement | null;

  vkSaveBtn: HTMLButtonElement | null;
  vkChangeTokenBtn: HTMLButtonElement | null;
  vkChangeGroupBtn: HTMLButtonElement | null;
  vkDisconnectBtn: HTMLButtonElement | null;

  vkGroupText: HTMLSpanElement | null;
  vkTokenText: HTMLSpanElement | null;
  vkGroupEditBox: HTMLDivElement | null;
  vkGroupEditInput: HTMLInputElement | null;
  vkGroupSaveBtn: HTMLButtonElement | null;
  vkGroupCancelBtn: HTMLButtonElement | null;

  vkGroupHeaderAvatar: HTMLImageElement | null;
  vkGroupHeaderName: HTMLSpanElement | null;

  vkPostText: HTMLTextAreaElement | null;
  vkPostButton: HTMLButtonElement | null;
  vkPostStatus: HTMLDivElement | null;
};

export function initVkGroupPlatform(options: InitVkGroupOptions): void {
  const {
    api,

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
  } = options;

  function showAlert(message: string, type: 'error' | 'success' = 'error'): void {
    setAlertState(vkAlert, message, {
      type,
      textElement: vkAlertText,
      closable: true
    });
  }

  function hideAlert(): void {
    clearAlertState(vkAlert, vkAlertText);
  }

  function setBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    setBadgeState(vkStatusBadge, text, mode);
  }

  function setPostStatus(
    message: string,
    type: 'idle' | 'success' | 'error' | 'loading' = 'idle',
    allowHtml = false
  ): void {
    if (!message) {
      clearPostState(vkPostStatus);
      return;
    }

    setPostState(vkPostStatus, message, type, {
      allowHtml,
      closeButtonId: 'vkPostStatusCloseBtn',
      onClose: () => setPostStatus('', 'idle'),
      baseClassName: 'post-status'
    });
  }

  function renderState(state: VkRendererState): void {
    if (
      !vkSetupView ||
      !vkConnectedView ||
      !vkDisconnectBtn ||
      !vkGroupText ||
      !vkGroupHeaderName ||
      !vkTokenText ||
      !vkGroupEditBox ||
      !vkGroupEditInput ||
      !vkGroupInput ||
      !vkTokenInput ||
      !vkGroupHeaderAvatar ||
      !vkPostButton ||
      !vkPostText ||
      !vkPostStatus
    ) {
      return;
    }

    if (state.isConnected) {
      setBadge('Подключено', 'on');

      vkSetupView.hidden = true;
      vkConnectedView.hidden = false;
      vkDisconnectBtn.hidden = false;

      vkGroupText.textContent = state.groupValue || state.groupName || '—';
      vkGroupHeaderName.textContent = state.groupName || '';
      vkTokenText.textContent = state.tokenMasked || 'Скрыт';

      vkGroupEditBox.hidden = true;
      vkGroupEditInput.value = state.groupValue || '';

      vkGroupInput.value = state.groupValue || '';
      vkTokenInput.value = '';

      if (state.groupAvatar) {
        vkGroupHeaderAvatar.src = state.groupAvatar;
        vkGroupHeaderAvatar.hidden = false;
      } else {
        vkGroupHeaderAvatar.src = '';
        vkGroupHeaderAvatar.hidden = true;
      }

      vkPostButton.disabled = false;
      vkPostText.disabled = false;

      if (!vkPostStatus.textContent) {
        setPostStatus('');
      }
    } else {
      setBadge('Не подключено', 'off');

      vkSetupView.hidden = false;
      vkConnectedView.hidden = true;
      vkDisconnectBtn.hidden = true;

      vkGroupInput.value = state.groupValue || '';
      vkTokenInput.value = '';

      vkGroupText.textContent = '';
      vkGroupHeaderName.textContent = '';
      vkGroupHeaderAvatar.src = '';
      vkGroupHeaderAvatar.hidden = true;

      vkPostButton.disabled = true;
      vkPostText.disabled = true;
      setPostStatus('Сначала подключите VK Group.', 'idle');
    }
  }

  function setLoadingState(isLoading: boolean): void {
    if (!vkSaveBtn || !vkTokenInput || !vkGroupInput) {
      return;
    }

    vkSaveBtn.disabled = isLoading;
    vkTokenInput.disabled = isLoading;
    vkGroupInput.disabled = isLoading;

    if (isLoading) {
      setBadge('Проверяем...', 'loading');
    }
  }

  function setPostLoadingState(isLoading: boolean): void {
    if (!vkPostButton || !vkPostText) {
      return;
    }

    vkPostButton.disabled = isLoading;
    vkPostText.disabled = isLoading;

    if (isLoading) {
      setPostStatus('Отправка...', 'loading');
    }
  }

  async function loadVkState(): Promise<void> {
    try {
      hideAlert();
      const state = await api.getSettings();
      renderState(state);
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось загрузить настройки VK.');
    }
  }

  vkSaveBtn?.addEventListener('click', async () => {
    try {
      hideAlert();

      const token = vkTokenInput?.value.trim() || '';
      const groupValue = vkGroupInput?.value.trim() || '';

      if (!token) {
        showAlert('Введите токен.');
        vkTokenInput?.focus();
        return;
      }

      if (!groupValue) {
        showAlert('Введите ID группы или short name.');
        vkGroupInput?.focus();
        return;
      }

      setLoadingState(true);

      const state = await api.saveSettings({ token, groupValue });
      renderState(state);
      showAlert('VK Group подключён и сохранён.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось подключить VK Group.');
    } finally {
      setLoadingState(false);
    }
  });

  vkChangeTokenBtn?.addEventListener('click', async () => {
    try {
      hideAlert();
      const currentState = await api.getSettings();

      if (vkSetupView) vkSetupView.hidden = false;
      if (vkConnectedView) vkConnectedView.hidden = true;

      if (vkGroupInput) vkGroupInput.value = currentState.groupValue || '';
      if (vkTokenInput) {
        vkTokenInput.value = '';
        vkTokenInput.focus();
      }

      setBadge('Не подключено', 'off');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось перейти к смене токена.');
    }
  });

  vkChangeGroupBtn?.addEventListener('click', () => {
    hideAlert();

    if (vkGroupEditBox) vkGroupEditBox.hidden = false;

    if (vkGroupEditInput) {
      vkGroupEditInput.value = vkGroupText?.textContent?.trim() || '';
      vkGroupEditInput.focus();
      vkGroupEditInput.select();
    }
  });

  vkGroupSaveBtn?.addEventListener('click', async () => {
    try {
      hideAlert();

      const newGroupValue = vkGroupEditInput?.value.trim() || '';

      if (!newGroupValue) {
        showAlert('Введите ID группы или short name.');
        vkGroupEditInput?.focus();
        return;
      }

      setBadge('Проверяем...', 'loading');

      const state = await api.updateGroup({ groupValue: newGroupValue });
      renderState(state);
      showAlert('Группа обновлена.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось изменить группу.');
    }
  });

  vkGroupCancelBtn?.addEventListener('click', () => {
    if (vkGroupEditBox) {
      vkGroupEditBox.hidden = true;
    }
    hideAlert();
    setBadge('Подключено', 'on');
  });

  vkDisconnectBtn?.addEventListener('click', async () => {
    try {
      hideAlert();

      const confirmed = window.confirm('Отключить VK Group и удалить сохранённый токен?');
      if (!confirmed) {
        return;
      }

      const state = await api.disconnect();
      renderState(state);
      showAlert('VK Group отключён.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось отключить VK Group.');
    }
  });

  vkPostButton?.addEventListener('click', async () => {
    try {
      hideAlert();
      setPostStatus('', 'idle');

      const message = vkPostText?.value.trim() || '';

      if (!message) {
        setPostStatus('Введите текст поста.', 'error');
        vkPostText?.focus();
        return;
      }

      setPostLoadingState(true);

      const result = await api.publishPost({ message });

      if (result.success) {
        if (vkPostText) {
          vkPostText.value = '';
        }

        if (result.postUrl) {
          setPostStatus(
            `Пост опубликован: <a href="${result.postUrl}" target="_blank" rel="noopener noreferrer">${result.postUrl}</a>`,
            'success',
            true
          );
        } else {
          setPostStatus('Пост опубликован.', 'success');
        }
      } else {
        setPostStatus(result.error || 'Не удалось опубликовать пост.', 'error');
      }
    } catch (error) {
      setPostStatus(error instanceof Error ? error.message : 'Ошибка отправки поста.', 'error');
    } finally {
      setPostLoadingState(false);
      const state = await api.getSettings();
      renderState(state);
    }
  });

  vkAlertCloseBtn?.addEventListener('click', () => {
    hideAlert();
  });

  void loadVkState();
}
