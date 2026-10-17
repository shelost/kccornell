export const MAX_PLAYERS = 20;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

export type Phase = 'lobby' | 'poll' | 'reveal' | 'discuss' | 'vote' | 'result';

export type Player = {
	id: string;
	name: string;
	joinedAt: number;
	connected: boolean;
	color: number;
	themeVote?: string | null;
	accused?: string | null;
	ready?: boolean;
};

export type RoomSettings = {
	imposterCount: number;
	discussSeconds: number;
	pollSeconds: number;
};

export type PollState = {
	themeIds: string[];
	status: 'idle' | 'open' | 'closed';
	winnerId?: string | null;
};

export type RoundState = {
	number: number;
	themeId?: string | null;
	timerEndsAt?: number | null;
	timerPausedMs?: number | null;
	usedWords?: string[];
};

export type ResultState = {
	secret: string;
	themeId: string;
	imposters: string[];
	accused: string | null;
	villageWon: boolean;
};

export type RoomPublic = {
	code: string;
	hostId: string;
	createdAt: number;
	phase: Phase;
	players: Record<string, Player>;
	settings: RoomSettings;
	poll: PollState;
	round: RoundState;
	result?: ResultState | null;
};

export type PrivateCard = {
	isImposter: boolean;
	word?: string;
	themeId: string;
	deal?: {
		secret: string;
		imposters: string[];
	};
};

export type RoomPatch = Record<string, unknown>;
