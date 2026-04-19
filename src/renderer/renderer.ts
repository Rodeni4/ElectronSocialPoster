console.log('renderer.ts загрузился');

declare global {
  interface Window {
    vkAPI?: {
      getSettings: () => Promise<VkRendererState>;
      saveSettings: (payload: { token: string; groupValue: string }) => Promise<VkRendererState>;
      updateGroup: (payload: { groupValue: string }) => Promise<VkRendererState>;
      disconnect: () => Promise<VkRendererState>;
      publishPost: (payload: { message: string }) => Promise<VkPublishResult>;

      getUserSettings: () => Promise<VkUserRendererState>;
      saveUserSettings: (payload: { token: string }) => Promise<VkUserRendererState>;
      disconnectUser: () => Promise<VkUserRendererState>;
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

  const tabPostBtn = document.getElementById('tabPostBtn') as HTMLElement | null;
  const tabAuthBtn = document.getElementById('tabAuthBtn') as HTMLElement | null;
  const postTabPanel = document.getElementById('postTabPanel') as HTMLElement | null;
  const authTabPanel = document.getElementById('authTabPanel') as HTMLElement | null;

  function setActiveTab(tab: 'post' | 'auth') {
    const isPost = tab === 'post';

    tabPostBtn?.classList.toggle('is-active', isPost);
    tabAuthBtn?.classList.toggle('is-active', !isPost);

    postTabPanel?.classList.toggle('active', isPost);
    authTabPanel?.classList.toggle('active', !isPost);
  }

  tabPostBtn?.addEventListener('click', () => {
    setActiveTab('post');
  });

  tabAuthBtn?.addEventListener('click', () => {
    setActiveTab('auth');
  });

  setActiveTab('post');

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
    vkUserHeaderName
  ];


  if (requiredElements.some((el) => !el)) {
    console.error('Не найдены обязательные элементы интерфейса VK.');
    return;
  }

  if (!window.vkAPI) {
    console.error('window.vkAPI не найден. Проверь preload.ts и BrowserWindow preload.');
    return;
  }

  function showAlert(message: string, type: 'error' | 'success' = 'error'): void {
    vkAlert!.hidden = false;
    vkAlertText!.textContent = message;
    vkAlert!.className = `alert alert--${type} alert--closable`;
  }

  function hideAlert(): void {
    vkAlert!.hidden = true;
    vkAlertText!.textContent = '';
    vkAlert!.className = 'alert';
  }

  function showUserAlert(message: string, type: 'error' | 'success' = 'error'): void {
    vkUserAlert!.hidden = false;
    vkUserAlertText!.textContent = message;
    vkUserAlert!.className = `alert alert--${type} alert--closable`;
  }

  function hideUserAlert(): void {
    vkUserAlert!.hidden = true;
    vkUserAlertText!.textContent = '';
    vkUserAlert!.className = 'alert';
  }

  function setBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    vkStatusBadge!.textContent = text;
    vkStatusBadge!.className = `status-badge status-badge--${mode}`;
  }

  function setUserBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    vkUserStatusBadge!.textContent = text;
    vkUserStatusBadge!.className = `status-badge status-badge--${mode}`;
  }

  function setPostStatus(
    message: string,
    type: 'idle' | 'success' | 'error' | 'loading' = 'idle',
    allowHtml = false
  ): void {
    if (allowHtml) {
      vkPostStatus!.innerHTML = message;
    } else {
      vkPostStatus!.textContent = message;
    }

    vkPostStatus!.className = `post-status post-status--${type}`;
  }

  function renderState(state: VkRendererState): void {
    if (state.isConnected) {
      setBadge('Подключено', 'on');

      vkSetupView!.hidden = true;
      vkConnectedView!.hidden = false;
      vkDisconnectBtn!.hidden = false;

      // В строке "Группа" показываем исходное введённое значение
      vkGroupText!.textContent = state.groupValue || state.groupName || '—';

      // В header показываем красивое имя группы
      vkGroupHeaderName!.textContent = state.groupName || '';

      // Токен
      vkTokenText!.textContent = state.tokenMasked || 'Скрыт';

      // Редактирование
      vkGroupEditBox!.hidden = true;
      vkGroupEditInput!.value = state.groupValue || '';

      vkGroupInput!.value = state.groupValue || '';
      vkTokenInput!.value = '';

      // Аватарка группы
      if (state.groupAvatar) {
        vkGroupHeaderAvatar!.src = state.groupAvatar;
        vkGroupHeaderAvatar!.hidden = false;
      } else {
        vkGroupHeaderAvatar!.src = '';
        vkGroupHeaderAvatar!.hidden = true;
      }

      vkPostButton!.disabled = false;
      vkPostText!.disabled = false;

      if (!vkPostStatus!.textContent) {
        setPostStatus('');
      }
    } else {
      setBadge('Не подключено', 'off');

      vkSetupView!.hidden = false;
      vkConnectedView!.hidden = true;
      vkDisconnectBtn!.hidden = true;

      vkGroupInput!.value = state.groupValue || '';
      vkTokenInput!.value = '';

      vkGroupText!.textContent = '';
      vkGroupHeaderName!.textContent = '';
      vkGroupHeaderAvatar!.src = '';
      vkGroupHeaderAvatar!.hidden = true;

      vkPostButton!.disabled = true;
      vkPostText!.disabled = true;
      setPostStatus('Сначала подключите VK Group.', 'idle');
    }
  }

  function renderUserState(state: VkUserRendererState): void {
    if (state.userConnected) {
      setUserBadge('Подключено', 'on');

      vkUserSetupView!.hidden = true;
      vkUserConnectedView!.hidden = false;
      vkUserDisconnectBtn!.hidden = false;

      vkUserTokenInput!.value = '';

      // В header показываем имя пользователя
      vkUserHeaderName!.textContent = state.userName || '';

      // В summary строке "Пользователь" показываем @screen_name
      if (state.userScreenName) {
        vkUserNameText!.textContent = `@${state.userScreenName}`;
      } else if (state.userId) {
        vkUserNameText!.textContent = `id${state.userId}`;
      } else {
        vkUserNameText!.textContent = '—';
      }

      vkUserTokenText!.textContent = state.userTokenMasked || 'Скрыт';

      if (state.userAvatar) {
        vkUserHeaderAvatar!.src = state.userAvatar;
        vkUserHeaderAvatar!.hidden = false;
      } else {
        vkUserHeaderAvatar!.src = '';
        vkUserHeaderAvatar!.hidden = true;
      }
    } else {
      setUserBadge('Не подключено', 'off');

      vkUserHeaderAvatar!.src = '';
      vkUserHeaderAvatar!.hidden = true;
      vkUserHeaderName!.textContent = '';

      vkUserSetupView!.hidden = false;
      vkUserConnectedView!.hidden = true;
      vkUserDisconnectBtn!.hidden = true;

      vkUserTokenInput!.value = '';
      vkUserNameText!.textContent = '—';
      vkUserTokenText!.textContent = '';
    }
  }

  function setLoadingState(isLoading: boolean): void {
    vkSaveBtn!.disabled = isLoading;
    vkTokenInput!.disabled = isLoading;
    vkGroupInput!.disabled = isLoading;

    if (isLoading) {
      setBadge('Проверяем...', 'loading');
    }
  }

  function setUserLoadingState(isLoading: boolean): void {
    vkUserSaveBtn!.disabled = isLoading;
    vkUserTokenInput!.disabled = isLoading;

    if (isLoading) {
      setUserBadge('Проверяем...', 'loading');
    }
  }

  function setPostLoadingState(isLoading: boolean): void {
    vkPostButton!.disabled = isLoading;
    vkPostText!.disabled = isLoading;

    if (isLoading) {
      setPostStatus('Отправка...', 'loading');
    }
  }

  async function loadVkState(): Promise<void> {
    try {
      hideAlert();
      const state = await window.vkAPI!.getSettings();
      console.log('VK GROUP STATE:', state);
      renderState(state);
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось загрузить настройки VK.');
    }
  }

  async function loadVkUserState(): Promise<void> {
    try {
      hideUserAlert();
      const state = await window.vkAPI!.getUserSettings();
      renderUserState(state);
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось загрузить настройки VK User.');
    }
  }

  vkSaveBtn!.addEventListener('click', async () => {
    try {
      hideAlert();

      const token = vkTokenInput!.value.trim();
      const groupValue = vkGroupInput!.value.trim();

      if (!token) {
        showAlert('Введите токен.');
        vkTokenInput!.focus();
        return;
      }

      if (!groupValue) {
        showAlert('Введите ID группы или short name.');
        vkGroupInput!.focus();
        return;
      }

      setLoadingState(true);

      const state = await window.vkAPI!.saveSettings({ token, groupValue });
      renderState(state);
      showAlert('VK Group подключён и сохранён.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось подключить VK Group.');
    } finally {
      setLoadingState(false);
    }
  });

  vkChangeTokenBtn!.addEventListener('click', async () => {
    try {
      hideAlert();
      const currentState = await window.vkAPI!.getSettings();

      vkSetupView!.hidden = false;
      vkConnectedView!.hidden = true;

      vkGroupInput!.value = currentState.groupValue || '';
      vkTokenInput!.value = '';
      vkTokenInput!.focus();

      setBadge('Не подключено', 'off');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось перейти к смене токена.');
    }
  });

  vkChangeGroupBtn!.addEventListener('click', () => {
    hideAlert();
    vkGroupEditBox!.hidden = false;
    vkGroupEditInput!.value = vkGroupText!.textContent?.trim() || '';
    vkGroupEditInput!.focus();
    vkGroupEditInput!.select();
  });

  vkGroupSaveBtn!.addEventListener('click', async () => {
    try {
      hideAlert();

      const newGroupValue = vkGroupEditInput!.value.trim();

      if (!newGroupValue) {
        showAlert('Введите ID группы или short name.');
        vkGroupEditInput!.focus();
        return;
      }

      setBadge('Проверяем...', 'loading');

      const state = await window.vkAPI!.updateGroup({ groupValue: newGroupValue });
      renderState(state);
      showAlert('Группа обновлена.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось изменить группу.');
    }
  });

  vkGroupCancelBtn!.addEventListener('click', () => {
    vkGroupEditBox!.hidden = true;
    hideAlert();
    setBadge('Подключено', 'on');
  });

  vkDisconnectBtn!.addEventListener('click', async () => {
    try {
      hideAlert();

      const confirmed = window.confirm('Отключить VK Group и удалить сохранённый токен?');
      if (!confirmed) {
        return;
      }

      const state = await window.vkAPI!.disconnect();
      renderState(state);
      showAlert('VK Group отключён.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось отключить VK Group.');
    }
  });

  vkPostButton!.addEventListener('click', async () => {
    try {
      hideAlert();

      const message = vkPostText!.value.trim();

      if (!message) {
        setPostStatus('Введите текст поста.', 'error');
        vkPostText!.focus();
        return;
      }

      setPostLoadingState(true);

      const result = await window.vkAPI!.publishPost({ message });

      if (result.success) {
        vkPostText!.value = '';

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
      const state = await window.vkAPI!.getSettings();
      renderState(state);
    }
  });

  vkAlertCloseBtn!.addEventListener('click', () => {
    hideAlert();
  });

  vkUserAlertCloseBtn!.addEventListener('click', () => {
    hideUserAlert();
  });

  vkUserSaveBtn!.addEventListener('click', async () => {
    try {
      hideUserAlert();

      const token = vkUserTokenInput!.value.trim();

      if (!token) {
        showUserAlert('Введите пользовательский токен.');
        vkUserTokenInput!.focus();
        return;
      }

      setUserLoadingState(true);

      const state = await window.vkAPI!.saveUserSettings({ token });
      renderUserState(state);
      showUserAlert('VK User подключён и сохранён.', 'success');
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось подключить VK User.');
    } finally {
      setUserLoadingState(false);
    }
  });

  vkUserChangeTokenBtn!.addEventListener('click', () => {
    hideUserAlert();

    vkUserSetupView!.hidden = false;
    vkUserConnectedView!.hidden = true;
    vkUserDisconnectBtn!.hidden = true;

    vkUserTokenInput!.value = '';
    vkUserTokenInput!.focus();

    setUserBadge('Не подключено', 'off');
  });

  vkUserDisconnectBtn!.addEventListener('click', async () => {
    try {
      hideUserAlert();

      const confirmed = window.confirm('Отключить VK User и удалить сохранённый токен?');
      if (!confirmed) {
        return;
      }

      const state = await window.vkAPI!.disconnectUser();
      renderUserState(state);
      showUserAlert('VK User отключён.', 'success');
    } catch (error) {
      setUserBadge('Ошибка', 'error');
      showUserAlert(error instanceof Error ? error.message : 'Не удалось отключить VK User.');
    }
  });

  void loadVkState();
  void loadVkUserState();
});

export { };