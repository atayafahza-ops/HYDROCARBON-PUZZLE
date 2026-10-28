import { getSettings, updateSettings } from './save.js';
import { sfx } from './audio.js';

export function applySettings() {
  const settings = getSettings();
  document.documentElement.classList.toggle('reduce-motion', Boolean(settings.reducedMotion));
  sfx.setEnabled(Boolean(settings.sfx));
}

export function toggleSetting(key) {
  const settings = getSettings();
  const next = { ...settings, [key]: !settings[key] };
  updateSettings({ [key]: next[key] });
  applySettings();
  return next;
}
