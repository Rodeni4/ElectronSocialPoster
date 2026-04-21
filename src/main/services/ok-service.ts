import {
  type OkGroupRendererState,
  encryptToken,
  getOkGroupRendererState,
  readConfig,
  writeConfig
} from './config-store.js';
import { fetchOkGroupInfo } from './social-api.js';

export function normalizeOkGroupInput(groupValue: string): string {
  const value = groupValue.trim();

  if (!value) {
    return '';
  }

  const groupMatch = value.match(/ok\.ru\/group\/(\d+)/i);
  if (groupMatch) {
    return groupMatch[1];
  }

  const plainDigits = value.match(/^\d+$/);
  if (plainDigits) {
    return value;
  }

  return value
    .replace(/^group:/i, '')
    .trim();
}

export async function saveOkGroupSettings(
  token: string,
  groupValue: string
): Promise<OkGroupRendererState> {
  const normalizedToken = token.trim();
  const normalizedInputGroup = normalizeOkGroupInput(groupValue);

  if (!normalizedInputGroup) {
    throw new Error('Введите ID или ссылку на группу OK.');
  }

  if (!normalizedToken) {
    throw new Error('Введите Access token OK.');
  }

  const okGroupInfo = await fetchOkGroupInfo(normalizedToken);

  if (normalizedInputGroup !== okGroupInfo.groupId) {
    throw new Error(
      `Группа не совпадает с токеном OK. По токену: ${okGroupInfo.groupId}, введено: ${normalizedInputGroup}.`
    );
  }

  const config = readConfig();

  config.okGroupTokenEncrypted = encryptToken(normalizedToken);
  config.okGroupValue = groupValue.trim();
  config.okGroupId = okGroupInfo.groupId;
  config.okGroupName = okGroupInfo.groupName;
  config.okGroupAvatar = null;
  config.okGroupConnected = true;

  writeConfig(config);

  return getOkGroupRendererState();
}