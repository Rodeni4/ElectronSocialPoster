import { setBadgeState, setAlertState, clearAlertState } from '../ui/status.js';

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

type OkApi = {
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

type InitOkOptions = {
  api: OkApi | undefined;

  okGroupCard: HTMLDivElement | null;
  okGroupStatusBadge: HTMLDivElement | null;
  okGroupAlert: HTMLDivElement | null;
  okGroupAvatar: HTMLImageElement | null;
  okGroupIdInput: HTMLInputElement | null;
  okGroupTokenInput: HTMLInputElement | null;
  okGroupConnectButton: HTMLButtonElement | null;
  okGroupDisconnectButton: HTMLButtonElement | null;

  okAuthCard: HTMLDivElement | null;
  okAuthStatusBadge: HTMLDivElement | null;
  okAuthAlert: HTMLDivElement | null;
  okAuthAvatar: HTMLImageElement | null;
  okAuthLoginButton: HTMLButtonElement | null;
  okAuthDisconnectButton: HTMLButtonElement | null;
};

export function initOkPlatform(options: InitOkOptions): void {
  const {
    api,

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
  } = options;

  function setOkGroupBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    setBadgeState(okGroupStatusBadge, text, mode);
  }

  function setOkAuthBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    setBadgeState(okAuthStatusBadge, text, mode);
  }

  function showOkGroupAlert(message: string, type: 'error' | 'success' = 'error'): void {
    setAlertState(okGroupAlert, message, { type });
  }

  function hideOkGroupAlert(): void {
    clearAlertState(okGroupAlert);
  }

  function showOkAuthAlert(message: string, type: 'error' | 'success' = 'error'): void {
    setAlertState(okAuthAlert, message, { type });
  }

  function hideOkAuthAlert(): void {
    clearAlertState(okAuthAlert);
  }

  function renderOkGroupState(state: OkGroupRendererState): void {
    if (
      !okGroupStatusBadge ||
      !okGroupAvatar ||
      !okGroupIdInput ||
      !okGroupTokenInput ||
      !okGroupDisconnectButton
    ) {
      return;
    }

    if (state.isConnected) {
      setOkGroupBadge('Подключено', 'on');

      okGroupIdInput.value = state.groupId || '';
      okGroupTokenInput.value = '';
      okGroupDisconnectButton.hidden = false;

      if (state.groupAvatar) {
        okGroupAvatar.src = state.groupAvatar;
        okGroupAvatar.hidden = false;
      } else {
        okGroupAvatar.src = '';
        okGroupAvatar.hidden = true;
      }
    } else {
      setOkGroupBadge('Не подключено', 'off');

      okGroupIdInput.value = '';
      okGroupTokenInput.value = '';
      okGroupDisconnectButton.hidden = true;

      okGroupAvatar.src = '';
      okGroupAvatar.hidden = true;
    }
  }

  function renderOkAuthState(state: OkAuthRendererState): void {
    if (!okAuthAvatar || !okAuthDisconnectButton) {
      return;
    }

    if (state.isConnected) {
      setOkAuthBadge('Подключено', 'on');
      okAuthDisconnectButton.hidden = false;

      if (state.avatar) {
        okAuthAvatar.src = state.avatar;
        okAuthAvatar.hidden = false;
      } else {
        okAuthAvatar.src = '';
        okAuthAvatar.hidden = true;
      }
    } else {
      setOkAuthBadge('Не подключено', 'off');
      okAuthDisconnectButton.hidden = true;
      okAuthAvatar.src = '';
      okAuthAvatar.hidden = true;
    }
  }

  async function loadOkGroupState(): Promise<void> {
    try {
      hideOkGroupAlert();

      if (!api?.getOkGroupSettings) {
        renderOkGroupState({
          tokenMasked: '',
          groupId: '',
          groupName: '',
          groupAvatar: '',
          isConnected: false
        });
        return;
      }

      const state = await api.getOkGroupSettings();
      renderOkGroupState(state);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить настройки OK Group.';

      if (
        message.includes("No handler registered for 'ok-group:get-settings'") ||
        message.includes("Error invoking remote method 'ok-group:get-settings'")
      ) {
        renderOkGroupState({
          tokenMasked: '',
          groupId: '',
          groupName: '',
          groupAvatar: '',
          isConnected: false
        });
        hideOkGroupAlert();
        return;
      }

      setOkGroupBadge('Ошибка', 'error');
      showOkGroupAlert(message);
    }
  }

  if (okGroupConnectButton && okGroupIdInput && okGroupTokenInput) {
    okGroupConnectButton.addEventListener('click', async () => {
      try {
        hideOkGroupAlert();

        const groupValue = okGroupIdInput.value.trim();
        const token = okGroupTokenInput.value.trim();

        if (!groupValue) {
          showOkGroupAlert('Введите ID или ссылку на группу OK.');
          okGroupIdInput.focus();
          return;
        }

        if (!token) {
          showOkGroupAlert('Введите Access token OK.');
          okGroupTokenInput.focus();
          return;
        }

        if (!api?.saveOkGroupSettings) {
          showOkGroupAlert('OK Group API ещё не подключён в preload.', 'error');
          return;
        }

        setOkGroupBadge('Проверяем...', 'loading');

        const state = await api.saveOkGroupSettings({ token, groupValue });
        renderOkGroupState(state);
        showOkGroupAlert('OK Group сохранён.', 'success');
      } catch (error) {
        setOkGroupBadge('Ошибка', 'error');
        showOkGroupAlert(
          error instanceof Error ? error.message : 'Не удалось сохранить OK Group.'
        );
      }
    });
  }

  if (okGroupDisconnectButton) {
    okGroupDisconnectButton.addEventListener('click', async () => {
      try {
        hideOkGroupAlert();

        const confirmed = window.confirm('Отключить OK Group и удалить сохранённый токен?');
        if (!confirmed) {
          return;
        }

        if (!api?.disconnectOkGroup) {
          renderOkGroupState({
            tokenMasked: '',
            groupId: '',
            groupName: '',
            groupAvatar: '',
            isConnected: false
          });
          return;
        }

        const state = await api.disconnectOkGroup();
        renderOkGroupState(state);
        showOkGroupAlert('OK Group отключён.', 'success');
      } catch (error) {
        setOkGroupBadge('Ошибка', 'error');
        showOkGroupAlert(
          error instanceof Error ? error.message : 'Не удалось отключить OK Group.'
        );
      }
    });
  }

  if (okAuthLoginButton) {
    okAuthLoginButton.addEventListener('click', async () => {
      try {
        hideOkAuthAlert();

        if (!api?.loginOkAuth) {
          showOkAuthAlert('OK Auth API не подключён.', 'error');
          return;
        }

        setOkAuthBadge('Открываем...', 'loading');

        const state = await api.loginOkAuth();

        renderOkAuthState(state);

        if (state.isConnected) {
          showOkAuthAlert('OK Auth подключён.', 'success');
        } else {
          hideOkAuthAlert();
          setOkAuthBadge('Не подключено', 'off');
        }
      } catch (error) {
        setOkAuthBadge('Ошибка', 'error');
        showOkAuthAlert(
          error instanceof Error ? error.message : 'Ошибка авторизации OK.'
        );
      }
    });
  }

  if (okAuthDisconnectButton) {
    okAuthDisconnectButton.addEventListener('click', async () => {
      try {
        hideOkAuthAlert();

        if (!api?.disconnectOkAuth) {
          renderOkAuthState({
            name: '',
            avatar: '',
            isConnected: false
          });
          return;
        }

        const state = await api.disconnectOkAuth();
        renderOkAuthState(state);
        showOkAuthAlert('OK Auth отключён.', 'success');
      } catch (error) {
        setOkAuthBadge('Ошибка', 'error');
        showOkAuthAlert(
          error instanceof Error ? error.message : 'Не удалось отключить OK Auth.'
        );
      }
    });
  }

  if (okAuthCard) {
    renderOkAuthState({
      name: '',
      avatar: '',
      isConnected: false
    });
  }

  if (okGroupCard) {
    void loadOkGroupState();
  }
}