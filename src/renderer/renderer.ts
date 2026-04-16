console.log('renderer.ts загрузился');

declare global {
  interface Window {
    vkAPI?: {
      getSettings: () => Promise<VkRendererState>;
      saveSettings: (payload: { token: string; groupValue: string }) => Promise<VkRendererState>;
      updateGroup: (payload: { groupValue: string }) => Promise<VkRendererState>;
      disconnect: () => Promise<VkRendererState>;
    };
  }
}

type VkRendererState = {
  tokenSaved: boolean;
  tokenMasked: string;
  groupValue: string;
  groupId: number | null;
  groupName: string;
  isConnected: boolean;
  encryptionAvailable: boolean;
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
  // const vkGroupIdText = document.getElementById('vkGroupIdText') as HTMLSpanElement | null;
  const vkTokenText = document.getElementById('vkTokenText') as HTMLSpanElement | null;
  const vkGroupEditBox = document.getElementById('vkGroupEditBox') as HTMLDivElement | null;
  const vkGroupEditInput = document.getElementById('vkGroupEditInput') as HTMLInputElement | null;
  const vkGroupSaveBtn = document.getElementById('vkGroupSaveBtn') as HTMLButtonElement | null;
  const vkGroupCancelBtn = document.getElementById('vkGroupCancelBtn') as HTMLButtonElement | null;

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
    // vkGroupIdText,
    vkTokenText,
    vkGroupEditBox,
    vkGroupEditInput,
    vkGroupSaveBtn,
    vkGroupCancelBtn
  ];

  if (requiredElements.some((el) => !el)) {
    console.error('Не найдены обязательные элементы VK-карточки.');
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

  function setBadge(text: string, mode: 'on' | 'off' | 'loading' | 'error'): void {
    vkStatusBadge!.textContent = text;
    vkStatusBadge!.className = `status-badge status-badge--${mode}`;
  }

  function renderState(state: VkRendererState): void {
    if (state.isConnected) {
      setBadge('Подключено', 'on');

      vkSetupView!.hidden = true;
      vkConnectedView!.hidden = false;
      vkDisconnectBtn!.hidden = false;

      vkGroupText!.textContent = state.groupName || state.groupValue || '—';
      // vkGroupIdText!.textContent = state.groupId ? String(state.groupId) : '—';
      vkTokenText!.textContent = state.tokenMasked || 'Скрыт';
      vkGroupEditBox!.hidden = true;
      vkGroupEditInput!.value = state.groupValue || '';

      vkGroupInput!.value = state.groupValue || '';
      vkTokenInput!.value = '';
    } else {
      setBadge('Не подключено', 'off');

      vkSetupView!.hidden = false;
      vkConnectedView!.hidden = true;
      vkDisconnectBtn!.hidden = true;

      vkGroupInput!.value = state.groupValue || '';
      vkTokenInput!.value = '';
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

  async function loadVkState(): Promise<void> {
    try {
      hideAlert();
      const state = await window.vkAPI!.getSettings();
      renderState(state);
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось загрузить настройки VK.');
    }
  }

  console.log('vkSaveBtn =', vkSaveBtn);
  vkSaveBtn!.addEventListener('click', async () => {
    console.log('Клик по vkSaveBtn');
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
      showAlert('VK подключён и проверен.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось подключить VK.');
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
      showAlert('Группа обновлена и проверена.', 'success');
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

      const confirmed = window.confirm('Отключить VK и удалить сохранённый токен?');
      if (!confirmed) {
        return;
      }

      const state = await window.vkAPI!.disconnect();
      renderState(state);
      showAlert('VK отключён.', 'success');
    } catch (error) {
      setBadge('Ошибка', 'error');
      showAlert(error instanceof Error ? error.message : 'Не удалось отключить VK.');
    }
  });

  vkAlertCloseBtn!.addEventListener('click', () => {
    hideAlert();
  });

  void loadVkState();
});

export { };