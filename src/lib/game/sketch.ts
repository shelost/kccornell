import type { Player } from './types';

export const PEN_COLORS = ['#16111c', '#5a21d6', '#e21b3c', '#1368ce', '#2ba02b', '#d97706', '#ffffff'];
export const PEN_SIZES = [3, 6, 11];
export const ERASER = '#ffffff';

const LETTER = /[\p{L}\p{N}]/u;

export function wordKey(raw: string): string {
	return raw
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.normalize('NFC')
		.replace(/[^\p{L}\p{N}]/gu, '');
}

export function guessesMatch(guess: string, secret: string): boolean {
	const key = wordKey(guess);
	return key.length > 0 && key === wordKey(secret);
}

export function editDistance(guess: string, secret: string): number {
	const a = Array.from(wordKey(guess));
	const b = Array.from(wordKey(secret));
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;
	const rows = b.length + 1;
	let prev = Array.from({ length: rows }, (_, i) => i);
	let next = new Array<number>(rows);
	for (let i = 0; i < a.length; i++) {
		next[0] = i + 1;
		for (let j = 0; j < b.length; j++) {
			const cost = a[i] === b[j] ? 0 : 1;
			next[j + 1] = Math.min((prev[j + 1] ?? 0) + 1, (next[j] ?? 0) + 1, (prev[j] ?? 0) + cost);
		}
		[prev, next] = [next, prev];
	}
	return prev[b.length] ?? b.length;
}

export function closeness(guess: string, secret: string): { near: boolean; note: string } {
	const g = wordKey(guess);
	const s = wordKey(secret);
	if (!g || g === s) return { near: false, note: 'not this word' };
	const distance = editDistance(g, s);
	if (distance === 1) return { near: true, note: '1 letter off' };
	if (distance === 2 && s.length >= 5) return { near: true, note: '2 letters off' };
	let prefix = 0;
	const limit = Math.min(g.length, s.length);
	while (prefix < limit && g[prefix] === s[prefix]) prefix++;
	if (prefix >= 3 && prefix >= s.length / 2) return { near: true, note: 'right start' };
	if (g.length < s.length) return { near: false, note: 'too short' };
	if (g.length > s.length) return { near: false, note: 'too long' };
	return { near: false, note: 'not this word' };
}

export function wordHint(word: string): string {
	return Array.from(word, (ch) => (LETTER.test(ch) ? '_' : ch)).join('');
}

export function hintBudget(word: string): number {
	const letters = Array.from(word).filter((ch) => LETTER.test(ch)).length;
	if (letters >= 6) return 2;
	return letters >= 3 ? 1 : 0;
}

export function revealLetters(hint: string, word: string, count: number): string {
	const shown = Array.from(hint);
	const chars = Array.from(word);
	if (shown.length !== chars.length) return hint;
	const hidden = chars.flatMap((ch, i) => (LETTER.test(ch) && shown[i] === '_' ? [i] : []));
	let revealed = chars.filter((ch, i) => LETTER.test(ch) && shown[i] !== '_').length;
	while (revealed < count && hidden.length > 0) {
		const [index] = hidden.splice(Math.floor(Math.random() * hidden.length), 1);
		if (index === undefined) break;
		shown[index] = chars[index] ?? '_';
		revealed++;
	}
	return shown.join('');
}

export function guessPoints(remainingMs: number, durationMs: number): number {
	const ratio = durationMs <= 0 ? 0 : Math.max(0, Math.min(1, remainingMs / durationMs));
	return Math.round(50 + 350 * ratio);
}

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
	return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

export function rankByScore(players: Player[], scores: Record<string, number>): Player[] {
	return [...players].sort(
		(a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || a.joinedAt - b.joinedAt
	);
}
