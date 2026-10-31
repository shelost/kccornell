export const MAX_PLAYERS = 20;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;

export type GameMode = 'imposter' | 'sketch' | 'krillion';

export const GAMES: Record<GameMode, { label: string; blurb: string; minPlayers: number }> = {
	imposter: { label: 'Imposter', blurb: 'Find the faker', minPlayers: 3 },
	sketch: { label: 'Sketch', blurb: 'Draw & guess', minPlayers: 2 },
	krillion: { label: 'Krillion', blurb: 'Rarest word wins', minPlayers: 2 }
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
	| 'sketch-final'
	| 'krillion'
	| 'krillion-reveal'
	| 'krillion-final';

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
	krillionHearts: number;
	krillionSeconds: number;
	krillionMinSeconds: number;
	krillionRounds: number;
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

export type KrillionAnswer = {
	id: string;
	playerId: string;
	text: string;
	valid: boolean;
	points: number;
	at: number;
	resolved: boolean;
	word?: string;
	near?: boolean;
	note?: string;
	bonus?: boolean;
};

export type KrillionPrompt = {
	id: string;
	label: string;
	kind: 'starts' | 'ends' | 'letters' | 'contains';
	value: string;
};

export type KrillionRank = {
	playerId: string;
	text: string;
	word: string | null;
	count: number;
	points: number;
};

export type KrillionState = {
	turnId: string | null;
	order: string[];
	lives: Record<string, number>;
	sparks: Record<string, number>;
	used: string[];
	answers: Record<string, KrillionAnswer>;
	scores: Record<string, number>;
	turnEndsAt: number | null;
	turnMs: number;
	lastWord: string | null;
	lastPop: string | null;
	winnerId: string | null;
	prompt?: KrillionPrompt | null;
	round?: number;
	roundTotal?: number;
	asked?: string[];
	board?: KrillionRank[];
};

export type TeamPlan = 'size' | 'count';

export type TeamsState = {
	status: 'forming' | 'ready';
	plan: TeamPlan;
	perTeam: number;
	teamCount: number;
	assignments: Record<string, number>;
};

export type RoomPublic = {
	code: string;
	hostId: string;
	createdAt: number;
	mode: GameMode;
	phase: Phase;
	players: Record<string, Player>;
	teams?: TeamsState | null;
	settings: RoomSettings;
	poll: PollState;
	round: RoundState;
	result?: ResultState | null;
	sketch?: SketchState | null;
	krillion?: KrillionState | null;
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
