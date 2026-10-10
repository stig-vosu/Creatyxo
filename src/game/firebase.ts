/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  getDocFromServer,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseConfig } from './firebaseConfig';

const config = getFirebaseConfig();

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;

if (config) {
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

export interface FirestoreLeaderboardRecord {
  id: string;
  username: string;
  tag?: string;
  score: number;
  avatarLetter: string;
  tier: 'Grandmaster' | 'Master' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  updatedAt: number;
}

/**
 * Validates Firestore connectivity on initial load
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'leaderboard', 'ping'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently running offline.');
    }
    return false;
  }
}

/**
 * Saves a player record to Firestore
 */
export async function savePlayerRecordToFirestore(
  record: FirestoreLeaderboardRecord
): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'leaderboard', record.id);
    await setDoc(docRef, {
      id: record.id,
      username: record.username,
      tag: record.tag || null,
      score: record.score,
      avatarLetter: record.avatarLetter,
      tier: record.tier,
      updatedAt: record.updatedAt || Date.now(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Could not save record to Firestore, saving locally:', err);
    return false;
  }
}

/**
 * Fetches the top shared records from Firestore
 */
export async function getLeaderboardRecordsFromFirestore(
  limitCount = 100
): Promise<FirestoreLeaderboardRecord[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const records: FirestoreLeaderboardRecord[] = [];
    snap.forEach((docItem) => {
      const data = docItem.data();
      if (data && typeof data.score === 'number' && typeof data.username === 'string') {
        records.push({
          id: data.id || docItem.id,
          username: data.username,
          tag: data.tag || undefined,
          score: data.score,
          avatarLetter: data.avatarLetter || data.username.charAt(0).toUpperCase() || 'P',
          tier: data.tier || 'Bronze',
          updatedAt: data.updatedAt || 0,
        });
      }
    });
    return records;
  } catch (err) {
    console.warn('Could not load leaderboard from Firestore, falling back to local storage:', err);
    return [];
  }
}

/**
 * Subscribes to live leaderboard updates
 */
export function subscribeToLeaderboardUpdates(
  onUpdate: (records: FirestoreLeaderboardRecord[]) => void,
  limitCount = 100
): Unsubscribe {
  if (!db) return () => {};
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(
      q,
      (snap) => {
        const records: FirestoreLeaderboardRecord[] = [];
        snap.forEach((docItem) => {
          const data = docItem.data();
          if (data && typeof data.score === 'number' && typeof data.username === 'string') {
            records.push({
              id: data.id || docItem.id,
              username: data.username,
              tag: data.tag || undefined,
              score: data.score,
              avatarLetter: data.avatarLetter || data.username.charAt(0).toUpperCase() || 'P',
              tier: data.tier || 'Bronze',
              updatedAt: data.updatedAt || 0,
            });
          }
        });
        onUpdate(records);
      },
      (error) => {
        console.warn('Firestore subscription notice:', error);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore listener:', err);
    return () => {};
  }
}
