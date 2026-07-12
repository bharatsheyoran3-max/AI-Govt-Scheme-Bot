// Simple client-side session store: language + user profile answers.
// Persisted to sessionStorage so refreshing preserves progress within a session.

import { useSyncExternalStore } from "react";
import type { LangCode } from "./i18n";
import type { UserProfile } from "./schemes";

const KEY = "schemesathi.session.v2";

export interface ConsentPurposes {
  screening: boolean;
  autoFill: boolean;
  submission: boolean;
}

interface SessionState {
  lang: LangCode;
  consent: ConsentPurposes;
  profile: UserProfile;
  userId: string;
}

const DEFAULT: SessionState = {
  lang: "en",
  consent: { screening: false, autoFill: false, submission: false },
  profile: {},
  userId: "",
};

let state: SessionState = DEFAULT;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function generateId(): string {
  return "usr_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function load(): SessionState {
  if (!isBrowser()) return DEFAULT;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULT, userId: generateId() };
    }
    const parsed = JSON.parse(raw);
    return {
      lang: parsed.lang ?? "en",
      consent: parsed.consent ?? { screening: false, autoFill: false, submission: false },
      profile: parsed.profile ?? {},
      userId: parsed.userId ?? generateId()
    };
  } catch {
    return { ...DEFAULT, userId: generateId() };
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

export function setConsent(consent: ConsentPurposes) {
  ensureInit();
  state = { ...state, consent };
  persist(); notify();
}

export function updateProfile(patch: Partial<UserProfile>) {
  ensureInit();
  // No silent data actions: if this auto-fills or is reused, client will confirm elsewhere.
  state = { ...state, profile: { ...state.profile, ...patch } };
  persist(); notify();
}

export function resetSession() {
  ensureInit();
  state = { ...DEFAULT, userId: generateId() };
  persist(); notify();
}
