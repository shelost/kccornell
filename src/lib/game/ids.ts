import { CODE_ALPHABET, CODE_LENGTH } from './types';

export function randomCode(): string {
	let out = '';
	for (let i = 0; i < CODE_LENGTH; i++) {
		out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
	}
	return out;
}

export function normalizeCode(raw: string): string {
	return raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.replace(/O/g, '0')
		.replace(/I/g, '1')
		.slice(0, CODE_LENGTH);
}

export function shortId(): string {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const a = copy[i];
		const b = copy[j];
		if (a === undefined || b === undefined) continue;
		copy[i] = b;
		copy[j] = a;
	}
	return copy;
}

export function pickN<T>(items: T[], n: number): T[] {
	return shuffle(items).slice(0, Math.max(0, n));
}

export function suggestedImposters(playerCount: number): number {
	if (playerCount >= 15) return 3;
	if (playerCount >= 8) return 2;
	return 1;
}

export const PLAYER_COLORS = [
	'#5a21d6',
	'#e21b3c',
	'#1368ce',
	'#2ba02b',
	'#d97706',
	'#0f766e',
	'#db2777',
	'#4338ca',
	'#ea580c',
	'#15803d',
	'#0284c7',
	'#7c3aed',
	'#be123c',
	'#0e7490',
	'#ca8a04',
	'#4f46e5',
	'#c2410c',
	'#166534',
	'#1d4ed8',
	'#9f1239'
];
