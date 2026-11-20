import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";

export const FEEDBACK_PREFS_CHANGED_EVENT = "fieldops-feedback-prefs-changed";

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readEnabled(key: string): boolean {
  if (!storageAvailable()) return true;
  return localStorage.getItem(key) !== "off";
}

function writeEnabled(key: string, enabled: boolean): void {
  if (!storageAvailable()) return;
  localStorage.setItem(key, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent(FEEDBACK_PREFS_CHANGED_EVENT));
}

export function isFeedbackSoundEnabled(): boolean {
  return readEnabled(CLIENT_PREF_KEYS.FEEDBACK_SOUND);
}

export function setFeedbackSoundEnabled(enabled: boolean): void {
  writeEnabled(CLIENT_PREF_KEYS.FEEDBACK_SOUND, enabled);
}

export function isFeedbackVibrationEnabled(): boolean {
  return readEnabled(CLIENT_PREF_KEYS.FEEDBACK_VIBRATION);
}

export function setFeedbackVibrationEnabled(enabled: boolean): void {
  writeEnabled(CLIENT_PREF_KEYS.FEEDBACK_VIBRATION, enabled);
}
