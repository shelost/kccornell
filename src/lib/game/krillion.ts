import { closeness, guessesMatch, wordKey } from './sketch';
import type { KrillionPrompt, KrillionRank } from './types';
import type { Player } from './types';

export const SPARK_GOAL = 250;

export function nextTurnMs(currentMs: number, minSeconds: number): number {
	const floor = Math.max(3, minSeconds) * 1000;
	return Math.max(floor, Math.round(currentMs * 0.88));
}

export function rarityPoints(index: number, total: number): number {
	const span = Math.max(1, total - 1);
	return 40 + Math.round(80 * (index / span));
}

export function speedPoints(remainingMs: number, durationMs: number): number {
	const ratio = durationMs <= 0 ? 0 : Math.max(0, Math.min(1, remainingMs / durationMs));
	return Math.round(20 + 60 * ratio);
}

export function matchKrillion(
	guess: string,
	words: string[],
	used: string[]
): { word: string } | { near: boolean; note: string } {
	if (!wordKey(guess)) return { near: false, note: 'type a word' };
	for (const word of used) {
		if (guessesMatch(guess, word)) return { near: false, note: 'already used' };
	}
	const unused = words.filter((word) => !used.some((taken) => guessesMatch(taken, word)));
	const hit = unused.find((word) => guessesMatch(guess, word));
	if (hit) return { word: hit };
	for (const word of unused) {
		const close = closeness(guess, word);
		if (close.near) return close;
	}
	return { near: false, note: 'not in this category' };
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function headNoun(category: string): string {
	const words = category.split(/\s+/);
	const of = words.findIndex((word) => word.toLowerCase() === 'of');
	return (of > 0 ? words[of - 1] : words[words.length - 1]) ?? category;
}

function isPlural(category: string): boolean {
	const noun = headNoun(category);
	if (/(ss|is|us|os)$/i.test(noun)) return false;
	return /s$/i.test(noun);
}

function poolSize(words: string[], prompt: KrillionPrompt): number {
	return words.filter((word) => matchesPrompt(word, prompt)).length;
}

export function matchesPrompt(word: string, prompt: KrillionPrompt): boolean {
	const key = wordKey(word);
	if (!key) return false;
	if (prompt.kind === 'starts') return key.startsWith(prompt.value);
	if (prompt.kind === 'ends') return key.endsWith(prompt.value);
	if (prompt.kind === 'contains') return key.includes(prompt.value) && !key.startsWith(prompt.value);
	return key.length === Number(prompt.value);
}

export function buildPrompt(category: string, words: string[], asked: string[]): KrillionPrompt {
	const plural = isPlural(category);
	const start = plural ? 'start' : 'starts';
	const end = plural ? 'end' : 'ends';
	const candidates: KrillionPrompt[] = [];
	const consider = (prompt: KrillionPrompt) => {
		if (asked.includes(prompt.id)) return;
		const size = poolSize(words, prompt);
		if (size >= 2 && size <= 8) candidates.push(prompt);
	};
	for (const letter of LETTERS) {
		const upper = letter.toUpperCase();
		consider({
			id: `starts:${letter}`,
			label: `${category} that ${start} with ${upper}`,
			kind: 'starts',
			value: letter
		});
		consider({
			id: `ends:${letter}`,
			label: `${category} that ${end} with ${letter}`,
			kind: 'ends',
			value: letter
		});
	}
	for (let count = 3; count <= 12; count++) {
		const name = NUMBER_WORDS[count] ?? String(count);
		consider({
			id: `letters:${count}`,
			label: `${category} with exactly ${name} letters`,
			kind: 'letters',
			value: String(count)
		});
	}
	candidates.sort((a, b) => poolSize(words, a) - poolSize(words, b) || a.id.localeCompare(b.id));
	const rare = candidates.filter((prompt) => poolSize(words, prompt) <= 4);
	const pool = rare.length ? rare : candidates;
	const pick = pool[Math.floor(Math.random() * Math.min(6, pool.length))] ?? null;
	return (
		pick ?? {
			id: 'letters:5',
			label: `${category} with exactly five letters`,
			kind: 'letters',
			value: '5'
		}
	);
}

export function canonicalWord(guess: string, words: string[], prompt: KrillionPrompt): string | null {
	const hits = words.filter((word) => matchesPrompt(word, prompt) && guessesMatch(guess, word));
	return hits[0] ?? null;
}

export function uniquenessPoints(count: number): number {
	if (count <= 1) return 100;
	if (count === 2) return 40;
	if (count === 3) return 15;
	return 5;
}

export function rankKrillion(
	entries: { playerId: string; text: string; at: number }[],
	words: string[],
	prompt: KrillionPrompt
): KrillionRank[] {
	const resolved = entries.map((entry) => ({
		...entry,
		word: canonicalWord(entry.text, words, prompt)
	}));
	const counts = new Map<string, number>();
	for (const entry of resolved) {
		if (!entry.word) continue;
		counts.set(entry.word, (counts.get(entry.word) ?? 0) + 1);
	}
	return resolved
		.map((entry) => {
			const count = entry.word ? (counts.get(entry.word) ?? 1) : 0;
			return {
				playerId: entry.playerId,
				text: entry.text,
				word: entry.word,
				count,
				points: entry.word ? uniquenessPoints(count) : 0
			};
		})
		.sort((a, b) => b.points - a.points || a.count - b.count || a.text.localeCompare(b.text));
}

export function aliveIds(lives: Record<string, number>, players: Player[]): string[] {
	return players.filter((player) => (lives[player.id] ?? 0) > 0).map((player) => player.id);
}

export function nextAlive(
	order: string[],
	fromId: string | null,
	lives: Record<string, number>,
	present: Set<string>
): string | null {
	const seats = order.filter((id) => (lives[id] ?? 0) > 0);
	if (seats.length === 0) return null;
	const start = fromId ? seats.indexOf(fromId) : -1;
	for (let i = 1; i <= seats.length; i++) {
		const id = seats[(start + i + seats.length) % seats.length];
		if (id && present.has(id)) return id;
	}
	return seats.find((id) => id !== fromId) ?? seats[0] ?? null;
}
