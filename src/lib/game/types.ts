export const MAX_PLAYERS = 20;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

export type GameMode = 'imposter' | 'sketch';

export const GAMES: Record<GameMode, { label: string; blurb: string; minPlayers: number }> = {
	imposter: { label: 'Imposter', blurb: 'Find the faker', minPlayers: 3 },
	sketch: { label: 'Sketch', blurb: 'Draw & guess', minPlayers: 2 }
};

export type Phase =
	| 'lobby'
	| 'poll'
	| 'reveal'
	| 'discuss'
	| 'vote'
	| 'result'
	| 'sketch'
	| 'sketch-reveal'
	| 'sketch-final';

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
	drawSeconds: number;
	sketchRounds: number;
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

export type Point = { x: number; y: number };

export type Stroke = {
	id: string;
	color: string;
	width: number;
	points: Point[];
};

export type SketchGuess = {
	id: string;
	playerId: string;
	text: string;
	correct: boolean;
	points: number;
	at: number;
	resolved: boolean;
	near?: boolean;
	note?: string;
};

export type SketchState = {
	drawerId: string | null;
	order: string[];
	turnIndex: number;
	hint: string;
	revealWord: string | null;
	strokes: Stroke[];
	guesses: Record<string, SketchGuess>;
	/** Banked totals. Points earned during the live turn stay in `turnPoints` until it ends. */
	scores: Record<string, number>;
	guessed: Record<string, boolean>;
	turnPoints: Record<string, number>;
	turnEndsAt: number | null;
};

export type RoomPublic = {
	code: string;
	hostId: string;
	createdAt: number;
	mode: GameMode;
	phase: Phase;
	players: Record<string, Player>;
	settings: RoomSettings;
	poll: PollState;
	round: RoundState;
	result?: ResultState | null;
	sketch?: SketchState | null;
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

export type Alert = { id: string; text: string; tone: 'good' | 'info' | 'warn' };
