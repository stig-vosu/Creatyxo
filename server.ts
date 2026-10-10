/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Persistent Leaderboard Storage File
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StoredRecord {
  id: string;
  username: string;
  tag?: string;
  score: number;
  avatarLetter: string;
  tier: 'Grandmaster' | 'Master' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  updatedAt: number;
}

function getTierFromScore(score: number): StoredRecord['tier'] {
  if (score >= 15000) return 'Grandmaster';
  if (score >= 10000) return 'Master';
  if (score >= 6000) return 'Diamond';
  if (score >= 3500) return 'Platinum';
  if (score >= 2000) return 'Gold';
  if (score >= 800) return 'Silver';
  return 'Bronze';
}

function loadRecords(): StoredRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading leaderboard file:', err);
  }
  return [];
}

function saveRecords(records: StoredRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving leaderboard file:', err);
  }
}

// 1. GET Global Shared Leaderboard
app.get('/api/leaderboard', (_req, res) => {
  const records = loadRecords();
  records.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);

  const ranked = records.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  res.json({
    success: true,
    entries: ranked,
    totalPlayers: ranked.length,
    timestamp: Date.now(),
  });
});

// 2. POST Submit / Update Player Record
app.post('/api/leaderboard/submit', (req, res) => {
  const { id, username, tag, score, avatarLetter } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const safeUsername = username.trim().slice(0, 24) || 'Player';
  const safeScore = Math.max(0, parseInt(String(score), 10) || 0);
  const safeTag = tag ? String(tag).trim().slice(0, 8) : undefined;
  const safeLetter = (avatarLetter || safeUsername.charAt(0) || 'P').toUpperCase().slice(0, 1);
  const playerId = id ? String(id).trim() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const records = loadRecords();
  const existingIdx = records.findIndex((r) => r.id === playerId);
  const now = Date.now();

  if (existingIdx >= 0) {
    const existing = records[existingIdx];
    // Keep personal best
    const bestScore = Math.max(existing.score, safeScore);
    records[existingIdx] = {
      ...existing,
      username: safeUsername,
      tag: safeTag || existing.tag,
      avatarLetter: safeLetter,
      score: bestScore,
      tier: getTierFromScore(bestScore),
      updatedAt: now,
    };
  } else {
    records.push({
      id: playerId,
      username: safeUsername,
      tag: safeTag,
      score: safeScore,
      avatarLetter: safeLetter,
      tier: getTierFromScore(safeScore),
      updatedAt: now,
    });
  }

  saveRecords(records);

  // Recalculate rank
  records.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
  const rank = records.findIndex((r) => r.id === playerId) + 1;

  res.json({
    success: true,
    playerId,
    rank,
    totalPlayers: records.length,
    entry: records[rank - 1],
  });
});

// 3. POST Rename Player Account
app.post('/api/player/rename', (req, res) => {
  const { id, username, tag, avatarLetter } = req.body;
  if (!id || !username) {
    return res.status(400).json({ error: 'id and username are required' });
  }

  const safeUsername = String(username).trim().slice(0, 24);
  const safeLetter = (avatarLetter || safeUsername.charAt(0) || 'P').toUpperCase().slice(0, 1);
  const safeTag = tag ? String(tag).trim().slice(0, 8) : undefined;

  const records = loadRecords();
  const existing = records.find((r) => r.id === id);

  if (existing) {
    existing.username = safeUsername;
    existing.avatarLetter = safeLetter;
    if (safeTag !== undefined) {
      existing.tag = safeTag;
    }
    existing.updatedAt = Date.now();
    saveRecords(records);
  }

  res.json({
    success: true,
    entry: existing || null,
  });
});

// 4. Vite Middlewares (Dev) or Static Serv (Prod)
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Creatyxo shared server running on port ${PORT}`);
  });
}

startServer();
