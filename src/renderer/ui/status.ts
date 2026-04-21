export type BadgeMode = 'on' | 'off' | 'loading' | 'error';
export type MessageType = 'idle' | 'success' | 'error' | 'loading';

export function setBadgeState(
  element: HTMLElement | null,
  text: string,
  mode: BadgeMode,
): void {
  if (!element) return;

  element.textContent = text;
  element.className = `status-badge status-badge--${mode}`;
}

export function setAlertState(
  container: HTMLElement | null,
  message: string,
  options?: {
    type?: 'error' | 'success';
    textElement?: HTMLElement | null;
    closable?: boolean;
  },
): void {
  if (!container) return;

  const type = options?.type ?? 'error';
  const textElement = options?.textElement ?? null;
  const closable = options?.closable ?? false;

  container.hidden = false;

  if (textElement) {
    textElement.textContent = message;
  } else {
    container.textContent = message;
  }

  container.className = closable
    ? `alert alert--${type} alert--closable`
    : `alert alert--${type}`;
}

export function clearAlertState(
  container: HTMLElement | null,
  textElement?: HTMLElement | null,
): void {
  if (!container) return;

  container.hidden = true;

  if (textElement) {
    textElement.textContent = '';
  } else {
    container.textContent = '';
  }

  container.className = 'alert';
}

export function setPostState(
  element: HTMLElement | null,
  message: string,
  type: MessageType = 'idle',
  options?: {
    allowHtml?: boolean;
    closeButtonId?: string;
    onClose?: () => void;
    baseClassName?: string;
  },
): void {
  if (!element) return;

  const allowHtml = options?.allowHtml ?? false;
  const closeButtonId = options?.closeButtonId;
  const onClose = options?.onClose;
  const baseClassName = options?.baseClassName ?? 'post-status';

  if (!message) {
    element.innerHTML = '';
    element.className = baseClassName;
    return;
  }

  if ((type === 'success' || type === 'error') && closeButtonId && onClose) {
    const content = message;

    element.innerHTML = `
      <span>${content}</span>
      <button id="${closeButtonId}" class="alert-close-btn" type="button" aria-label="Закрыть уведомление">×</button>
    `;

    element.className =
      type === 'success'
        ? `${baseClassName} alert alert--success alert--closable`
        : `${baseClassName} alert alert--error alert--closable`;

    const closeBtn = document.getElementById(closeButtonId) as HTMLButtonElement | null;
    closeBtn?.addEventListener('click', onClose);
    return;
  }

  if (allowHtml) {
    element.innerHTML = message;
  } else {
    element.textContent = message;
  }

  element.className = `${baseClassName} ${baseClassName}--${type}`;
}

export function clearPostState(
  element: HTMLElement | null,
  baseClassName = 'post-status',
): void {
  if (!element) return;

  element.innerHTML = '';
  element.className = baseClassName;
}