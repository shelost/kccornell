import { closeness, guessesMatch, wordKey } from './sketch';
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
