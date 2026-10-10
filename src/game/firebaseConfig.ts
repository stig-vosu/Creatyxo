/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

// Safely probe for local firebase-applet-config.json without hard-crashing if gitignored
const localConfigs = import.meta.glob<{ default?: Record<string, string> }>(
  '../../firebase-applet-config.json',
  { eager: true }
);

const localData = localConfigs['../../firebase-applet-config.json']?.default || {};

/**
 * Resolves Firebase configuration safely:
 * 1. Checks environment variables (VITE_FIREBASE_*) - recommended for public GitHub repos
 * 2. Falls back to local config file if present
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey =
    import.meta.env.VITE_FIREBASE_API_KEY ||
    localData.apiKey ||
    '';

  const projectId =
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    localData.projectId ||
    '';

  const appId =
    import.meta.env.VITE_FIREBASE_APP_ID ||
    localData.appId ||
    '';

  const authDomain =
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    localData.authDomain ||
    (projectId ? `${projectId}.firebaseapp.com` : '');

  const firestoreDatabaseId =
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    localData.firestoreDatabaseId ||
    undefined;

  const storageBucket =
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    localData.storageBucket ||
    undefined;

  const messagingSenderId =
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    localData.messagingSenderId ||
    undefined;

  if (!apiKey || !projectId) {
    return null;
  }

  return {
    apiKey,
    projectId,
    appId,
    authDomain,
    firestoreDatabaseId,
    storageBucket,
    messagingSenderId,
  };
}
