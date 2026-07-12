// Simple client-side session store: language + user profile answers.
// Persisted to sessionStorage so refreshing preserves progress within a session.

import { useSyncExternalStore } from "react";
import type { LangCode } from "./i18n";
import type { UserProfile } from "./schemes";

const KEY = "schemesathi.session.v1";

interface SessionState {
  lang: LangCode;
  consent: boolean;
  profile: UserProfile;
}

const DEFAULT: SessionState = { lang: "en", consent: false, profile: {} };

let state: SessionState = DEFAULT;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function load(): SessionState {
  if (!isBrowser()) return DEFAULT;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

function persist() {
  if (!isBrowser()) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function notify() { listeners.forEach((l) => l()); }

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

let initialized = false;
function ensureInit() {
  if (initialized || !isBrowser()) return;
  state = load();
  initialized = true;
}

export function useSession(): SessionState {
  ensureInit();
  return useSyncExternalStore(subscribe, () => state, () => DEFAULT);
}

export function setLang(lang: LangCode) {
  ensureInit();
  state = { ...state, lang };
  persist(); notify();
}
export function setConsent(consent: boolean) {
  ensureInit();
  state = { ...state, consent };
  persist(); notify();
}
export function updateProfile(patch: Partial<UserProfile>) {
  ensureInit();
  state = { ...state, profile: { ...state.profile, ...patch } };
  persist(); notify();
}
export function resetSession() {
  state = DEFAULT;
  persist(); notify();
}
