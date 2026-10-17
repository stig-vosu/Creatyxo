/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

// Built-in project fallback ensures that whether running in AI Studio, Vite dev,
// Node/SSR, or GitHub Pages without GitHub Secrets configured, the live shared leaderboard always works.
const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  projectId: 'trans-buckeye-cw1sf',
  appId: '1:1073550195556:web:6624fc83ba505c05ad1871',
  apiKey: 'AIzaSyAf9v2zkpst-lmo8SM9tg3Xduc_vB-45ig',
  authDomain: 'trans-buckeye-cw1sf.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-blockblastpuzzle-bb71321f-7963-4cb1-9fb6-11b668a529c7',
  storageBucket: 'trans-buckeye-cw1sf.firebasestorage.app',
  messagingSenderId: '1073550195556',
};

const localData = (firebaseAppletConfig as unknown as Record<string, string>) || {};

/**
 * Resolves Firebase configuration safely with priority:
 * 1. Environment variables (VITE_FIREBASE_*) if explicitly provided
 * 2. firebase-applet-config.json
 * 3. Embedded project defaults
 */
export function getFirebaseConfig(): FirebaseConfig {
  const env = (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : {}) as Record<string, string | undefined>;

  const apiKey =
    env.VITE_FIREBASE_API_KEY ||
    localData.apiKey ||
    DEFAULT_FIREBASE_CONFIG.apiKey;

  const projectId =
    env.VITE_FIREBASE_PROJECT_ID ||
    localData.projectId ||
    DEFAULT_FIREBASE_CONFIG.projectId;

  const appId =
    env.VITE_FIREBASE_APP_ID ||
    localData.appId ||
    DEFAULT_FIREBASE_CONFIG.appId;

  const authDomain =
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    localData.authDomain ||
    DEFAULT_FIREBASE_CONFIG.authDomain ||
    (projectId ? `${projectId}.firebaseapp.com` : '');

  const firestoreDatabaseId =
    env.VITE_FIREBASE_DATABASE_ID ||
    localData.firestoreDatabaseId ||
    DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId;

  const storageBucket =
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    localData.storageBucket ||
    DEFAULT_FIREBASE_CONFIG.storageBucket;

  const messagingSenderId =
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    localData.messagingSenderId ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId;

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
