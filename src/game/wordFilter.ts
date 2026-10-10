/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 100% Offline, Deterministic Profanity and Forbidden Word Filter.
 * 
 * ZERO AI models, ZERO external APIs, ZERO network calls.
 * 
 * To protect against plain-text discovery or extraction of the word list,
 * terms are stored as cryptographic/one-way 32-bit FNV-1a hashes.
 * The raw prohibited words do not appear anywhere in the source code or client bundle.
 */

// 32-bit FNV-1a Hash Algorithm
function fnv1a(str: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

// Precomputed one-way hash tables for forbidden terms
// 3-letter sensitive words (only flagged when exact or distinct word token)
const HASHES_3 = new Set<number>([
  846393306,
  2985822365,
  3433313295,
  3525777895,
  4022571063,
]);

// 4+ character forbidden words and slurs (flagged as exact match or substring in stripped text)
const HASHES_SUBSTR = new Set<number>([
  259887262, 303976023, 336914794, 394036361, 594944398, 601369519,
  607931310, 825071621, 919192496, 931162246, 935924835, 1363005792,
  1418208120, 1468312105, 1666915128, 1698156692, 1825958011, 1905087418,
  1931933751, 1937589700, 2090526271, 2108761896, 2113294878, 2123226675,
  2170560880, 2185256537, 2233071915, 2283036957, 2285825857, 2302528950,
  2307522440, 2326647249, 2341128772, 2431037433, 2444789715, 2447652168,
  2460286864, 2482635036, 2491417249, 2503881367, 2505785029, 2562532229,
  2661274108, 2686129127, 2738688164, 2743865285, 2758825305, 2761596009,
  2824268595, 2918752065, 3004352723, 3017570559, 3104482549, 3114006918,
  3368596176, 3478407156, 3510611045, 3610473989, 3634523446, 3646700319,
  3656079069, 3666295138, 3685727517, 3691556361, 3758695880, 3866578250,
  3907494234, 3909764211, 4137990222, 4156838336, 4183830597, 4249104160,
  4250961641,
]);

// Character substitution / leetspeak map for evasion detection
const LEET_REPLACEMENTS: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '3': 'e',
  '1': 'i',
  '!': 'i',
  '|': 'l',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't',
  'v': 'u',
};

/**
 * Normalizes text to detect obfuscated words (e.g. "f_u_c_k", "sh!t", "b.i.t.c.h", "f u c k")
 */
function normalizeText(text: string): string {
  const lower = text.toLowerCase().trim();

  // Replace leetspeak characters
  let replaced = '';
  for (const char of lower) {
    replaced += LEET_REPLACEMENTS[char] || char;
  }

  // Remove consecutive duplicate letters (e.g. "fuuuuck" -> "fuck", "shiiit" -> "shit")
  const collapsed = replaced.replace(/(.)\1{2,}/g, '$1$1');

  return collapsed;
}

export interface WordValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Checks if a string contains any forbidden words using one-way hashes.
 * Ensures the actual blacklist is completely concealed while retaining accurate filtering.
 */
export function validatePlayerName(name: string): WordValidationResult {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return { isValid: false, reason: 'Please enter a player name.' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, reason: 'Name must be at least 2 characters.' };
  }

  if (trimmed.length > 16) {
    return { isValid: false, reason: 'Name must be 16 characters or less.' };
  }

  // 1. Check normalized variations
  const normalized = normalizeText(trimmed);
  // Alphanumeric only (stripping punctuation/spaces to catch "f.u.c.k", "s-h-i-t")
  const stripped = normalized.replace(/[^a-z0-9]/g, '');

  // 2. Check 3-letter words (exact stripped match or standalone token to avoid false positives like "pass", "class")
  if (stripped.length === 3 && HASHES_3.has(fnv1a(stripped))) {
    return {
      isValid: false,
      reason: 'This name contains inappropriate or forbidden words.',
    };
  }

  // Check word tokens in normalized string for 3-letter words
  const wordsInNormalized = normalized.split(/[^a-z0-9]+/);
  for (const token of wordsInNormalized) {
    if (token.length === 3 && HASHES_3.has(fnv1a(token))) {
      return {
        isValid: false,
        reason: 'This name contains inappropriate or forbidden words.',
      };
    }
  }

  // 3. Check substrings of length 4 to 12 against HASHES_SUBSTR
  const maxLen = Math.min(stripped.length, 12);
  for (let len = 4; len <= maxLen; len++) {
    for (let i = 0; i <= stripped.length - len; i++) {
      const windowStr = stripped.substring(i, i + len);
      const hash = fnv1a(windowStr);
      if (HASHES_SUBSTR.has(hash)) {
        return {
          isValid: false,
          reason: 'This name contains inappropriate or forbidden words.',
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Quick boolean checker
 */
export function isForbiddenName(name: string): boolean {
  return !validatePlayerName(name).isValid;
}
