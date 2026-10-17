import { createContext } from 'svelte';
import { getBackend, syncKind } from './sync';
import {
	closeness,
	guessesMatch,
	guessPoints,
	hintBudget,
	median,
	revealLetters,
	wordHint,
	wordKey
} from './sketch';
import { getTheme, THEMES, type Theme } from './themes';
import {
	GAMES,
	MAX_PLAYERS,
	type Alert,
	type GameMode,
	type Phase,
	type Player,
	type PrivateCard,
	type RoomPublic,
	type RoomSettings,
	type SketchGuess,
	type SketchState,
	type Stroke
} from './types';
import { pickN, PLAYER_COLORS, randomCode, shortId, shuffle, suggestedImposters } from './ids';

const NAME_KEY = 'kcc-imposter-name';

const DEFAULT_SETTINGS: RoomSettings = {
	imposterCount: 1,
	discussSeconds: 180,
	pollSeconds: 30,
	drawSeconds: 600,
	sketchRounds: 1
};

type Tally = {
	guessed: Record<string, boolean>;
	turnPoints: Record<string, number>;
};

function defaultPoll(): RoomPublic['poll'] {
	return {
		themeIds: THEMES.map((theme) => theme.id),
		status: 'idle',
		winnerId: null
	};
}

function emptySketch(scores: Record<string, number> = {}): SketchState {
	return {
		drawerId: null,
		order: [],
		turnIndex: 0,
		hint: '',
		revealWord: null,
		strokes: [],
		guesses: {},
		scores,
		guessed: {},
		turnPoints: {},
		turnEndsAt: null
	};
}

function hydrateRoom(room: RoomPublic | null): RoomPublic | null {
	if (!room) return null;
	return {
		...room,
		players: room.players ?? {},
		mode: room.mode ?? 'imposter',
		settings: { ...DEFAULT_SETTINGS, ...room.settings },
		poll: room.poll ?? defaultPoll(),
		round: room.round ?? { number: 0, usedWords: [] },
		sketch: room.sketch ? { ...emptySketch(), ...room.sketch } : null
	};
}

function emptyRoom(code: string, host: Player, mode: GameMode): RoomPublic {
	return {
		code,
		hostId: host.id,
		createdAt: Date.now(),
		mode,
		phase: 'lobby',
		players: { [host.id]: host },
		settings: { ...DEFAULT_SETTINGS },
		poll: defaultPoll(),
		round: { number: 0, usedWords: [] },
		result: null,
		sketch: emptySketch({ [host.id]: 0 })
	};
}

function turnKey(room: RoomPublic | null): string {
	const sketch = room?.sketch;
	if (!sketch || room?.phase !== 'sketch') return '';
	return `${sketch.turnIndex}:${sketch.drawerId}:${sketch.turnEndsAt}`;
}

function cleanName(name: string): string {
	return name.trim().slice(0, 18);
}

function tallyVotes(players: Player[]): { winner: string | null; counts: Record<string, number> } {
	const counts: Record<string, number> = {};
	for (const player of players) {
		if (!player.accused) continue;
		counts[player.accused] = (counts[player.accused] ?? 0) + 1;
	}
	let best = 0;
	const leaders: string[] = [];
	for (const [id, count] of Object.entries(counts)) {
		if (count > best) {
			best = count;
			leaders.length = 0;
			leaders.push(id);
		} else if (count === best && count > 0) {
			leaders.push(id);
		}
	}
	return { winner: leaders.length === 1 ? (leaders[0] ?? null) : null, counts };
}

export class GameSession {
	room = $state.raw<RoomPublic | null>(null);
	card = $state.raw<PrivateCard | null>(null);
	ink = $state.raw<Stroke | null>(null);
	online = $state.raw<Set<string> | null>(null);
	alerts = $state.raw<Alert[]>([]);
	playerId = $state('');
	busy = $state(false);
	error = $state('');
	readonly kind = syncKind();

	#backend = getBackend();
	#unsub: (() => void) | null = null;
	#turn = '';
	#inkSeen = new Set<string>();
	#pendingInk: Stroke | null = null;
	#inkTimer: ReturnType<typeof setTimeout> | null = null;
	#lastInkAt = 0;
	#timers: ReturnType<typeof setTimeout>[] = [];
	#armedFor: number | null = null;
	#ticking = false;
	#tickAgain = false;
	#endedTurn = '';
	#errorTimer: ReturnType<typeof setTimeout> | null = null;
	#lastPhase: Phase | null = null;
	#lastTurn: { key: string; guessed: Set<string>; endsAt: number | null } | null = null;
	#seenGuesses = new Set<string>();

	me = $derived(this.room?.players?.[this.playerId] ?? null);
	isHost = $derived(this.room?.hostId === this.playerId);
	phase = $derived<Phase>(this.room?.phase ?? 'lobby');
	mode = $derived<GameMode>(this.room?.mode ?? 'imposter');
	players = $derived.by(() => {
		const online = this.online;
		return Object.values(this.room?.players ?? {})
			.map((player) => (online ? { ...player, connected: online.has(player.id) } : player))
			.sort((a, b) => a.joinedAt - b.joinedAt);
	});
	playerCount = $derived(this.players.length);
	code = $derived(this.room?.code ?? '');
	theme = $derived(getTheme(this.room?.round.themeId ?? this.room?.poll.winnerId));
	sketch = $derived(this.room?.sketch ?? null);
	isDrawer = $derived(Boolean(this.playerId) && this.room?.sketch?.drawerId === this.playerId);
	totals = $derived.by((): Record<string, number> => {
		const sketch = this.room?.sketch;
		if (!sketch) return {};
		if (this.room?.phase !== 'sketch') return sketch.scores;
		const sum = { ...sketch.scores };
		for (const [id, points] of Object.entries(sketch.turnPoints)) {
			sum[id] = (sum[id] ?? 0) + points;
		}
		return sum;
	});
	pollCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const player of this.players) {
			if (!player.themeVote) continue;
			counts[player.themeVote] = (counts[player.themeVote] ?? 0) + 1;
		}
		return counts;
	});

	rememberedName(): string {
		if (typeof localStorage === 'undefined') return '';
		return localStorage.getItem(NAME_KEY) ?? '';
	}

	saveName(name: string) {
		localStorage.setItem(NAME_KEY, name.trim());
	}

	async create(name: string, mode: GameMode = 'imposter'): Promise<string> {
		this.busy = true;
		this.error = '';
		try {
			const playerId = await this.#backend.ensurePlayerId();
			this.playerId = playerId;
			this.saveName(name);
			let code = randomCode();
			for (let i = 0; i < 8 && (await this.#backend.roomExists(code)); i++) {
				code = randomCode();
			}
			const host: Player = {
				id: playerId,
				name: cleanName(name),
				joinedAt: Date.now(),
				connected: true,
				color: 0
			};
			await this.#backend.create(emptyRoom(code, host, mode));
			await this.attach(code, playerId);
			return code;
		} catch (err) {
			this.#fail(err);
			throw err;
		} finally {
			this.busy = false;
		}
	}

	async join(code: string, name: string) {
		this.busy = true;
		this.error = '';
		try {
			const playerId = await this.#backend.ensurePlayerId();
			this.playerId = playerId;
			this.saveName(name);
			if (!(await this.#backend.roomExists(code))) {
				this.#fail(
					this.kind === 'local'
						? 'No room with that code in this browser. Connect Supabase to play across devices.'
						: 'No room with that code'
				);
				return;
			}
			const room = await this.attach(code, playerId);
			if (!room) {
				this.#fail('Could not load that room');
				this.detach();
				return;
			}
			const existing = room.players[playerId];
			if (!existing && Object.keys(room.players).length >= MAX_PLAYERS) {
				this.#fail(`That room is full (${MAX_PLAYERS})`);
				this.detach();
				return;
			}
			if (!existing && room.mode === 'imposter' && room.phase !== 'lobby') {
				this.#fail('The round already started');
				this.detach();
				return;
			}
			const used = new Set(Object.values(room.players).map((player) => player.color));
			const player: Player = existing
				? { ...existing, connected: true }
				: {
						id: playerId,
						name: cleanName(name),
						joinedAt: Date.now(),
						connected: true,
						color: Math.max(
							0,
							PLAYER_COLORS.findIndex((_, i) => !used.has(i))
						)
					};
			const patch: Record<string, unknown> = { [`players/${playerId}`]: player };
			if (room.sketch && room.sketch.scores[playerId] == null) {
				patch[`sketch/scores/${playerId}`] = 0;
			}
			await this.#backend.updatePublic(code, patch);
		} catch (err) {
			this.#fail(err);
		} finally {
			this.busy = false;
		}
	}

	/** Rejoins silently when this device is already seated in the room (reloads, shared links). */
	async resume(code: string): Promise<'joined' | 'join' | 'missing' | 'error'> {
		let result: 'join' | 'missing' | 'error' = 'missing';
		try {
			this.playerId = await this.#backend.ensurePlayerId();
			if (await this.#backend.roomExists(code)) {
				const room = await this.attach(code, this.playerId);
				if (room?.players[this.playerId]) {
					await this.#write({ [`players/${this.playerId}/connected`]: true });
					return 'joined';
				}
				if (room) result = 'join';
			}
		} catch (err) {
			this.#fail(err);
			result = 'error';
		}
		this.detach();
		this.room = null;
		return result;
	}

	attach(code: string, playerId: string): Promise<RoomPublic | null> {
		this.detach();
		return new Promise((resolve) => {
			let settled = false;
			const settle = () => {
				if (settled) return;
				settled = true;
				clearTimeout(fallback);
				resolve(this.room);
			};
			const fallback = setTimeout(settle, 10_000);
			this.#unsub = this.#backend.subscribe(code, playerId, {
				onPublic: (room) => {
					this.room = hydrateRoom(room);
					this.#onRoom();
					settle();
				},
				onSecret: (card) => {
					this.card = card;
				},
				onInk: (stroke) => this.#receiveInk(stroke),
				onPresence: (online) => {
					this.online = online;
				}
			});
		});
	}

	detach() {
		this.#unsub?.();
		this.#unsub = null;
		this.#clearTimers();
		if (this.#inkTimer) clearTimeout(this.#inkTimer);
		this.#inkTimer = null;
		this.#pendingInk = null;
		this.#turn = '';
		this.#inkSeen.clear();
		this.ink = null;
		this.online = null;
		this.alerts = [];
		this.#lastPhase = null;
		this.#lastTurn = null;
	}

	async leave() {
		const room = this.room;
		if (room && this.playerId && room.players[this.playerId]) {
			const patch: Record<string, unknown> = { [`players/${this.playerId}`]: null };
			if (room.hostId === this.playerId) {
				const others = this.players.filter((player) => player.id !== this.playerId);
				const heir = others.find((player) => player.connected) ?? others[0];
				if (heir) patch.hostId = heir.id;
			}
			await this.#write(patch);
		}
		this.detach();
		this.room = null;
		this.card = null;
	}

	async kick(id: string) {
		if (!this.isHost) return;
		await this.#write({ [`players/${id}`]: null });
	}

	async setSetting<K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) {
		if (!this.isHost) return;
		if (key === 'drawSeconds') {
			await this.setDrawSeconds(Number(value));
			return;
		}
		await this.#write({ [`settings/${key}`]: value });
	}

	async setDrawSeconds(seconds: number) {
		const room = this.room;
		if (!this.isHost || !room) return;
		const next = Math.max(15, Math.round(seconds));
		const patch: Record<string, unknown> = { 'settings/drawSeconds': next };
		const endsAt = room.sketch?.turnEndsAt;
		if (room.phase === 'sketch' && endsAt) {
			const startedAt = endsAt - room.settings.drawSeconds * 1000;
			patch['sketch/turnEndsAt'] = Math.max(Date.now() + 1000, startedAt + next * 1000);
		}
		await this.#write(patch);
	}

	async setImposterCount(n: number) {
		const max = Math.max(1, Math.min(3, Math.floor((this.playerCount - 1) / 2) || 1));
		await this.setSetting('imposterCount', Math.min(max, Math.max(1, n)));
	}

	async setMode(mode: GameMode) {
		const room = this.room;
		if (!this.isHost || !room || room.phase !== 'lobby' || room.mode === mode) return;
		await this.#write({ mode, sketch: emptySketch(this.#zeroScores()) });
	}

	async togglePollTheme(themeId: string) {
		const room = this.room;
		if (!this.isHost || !room) return;
		const current = room.poll.themeIds;
		const next = current.includes(themeId)
			? current.filter((id) => id !== themeId)
			: [...current, themeId];
		if (next.length < 2) return;
		await this.#write({ 'poll/themeIds': next });
	}

	async startPoll() {
		const room = this.room;
		if (!this.isHost || !room) return;
		const { minPlayers } = GAMES[room.mode];
		if (this.playerCount < minPlayers) {
			this.#fail(`Need at least ${minPlayers} players`);
			return;
		}
		const patch: Record<string, unknown> = {
			phase: 'poll',
			'poll/status': 'open',
			'poll/winnerId': null,
			result: null
		};
		for (const player of this.players) {
			patch[`players/${player.id}/themeVote`] = null;
			patch[`players/${player.id}/accused`] = null;
			patch[`players/${player.id}/ready`] = false;
		}
		if (room.mode === 'imposter' && room.settings.imposterCount > this.playerCount - 2) {
			patch['settings/imposterCount'] = suggestedImposters(this.playerCount);
		}
		await this.#write(patch);
	}

	async voteTheme(themeId: string) {
		const room = this.room;
		if (!room || !this.playerId || room.phase !== 'poll' || room.poll.status !== 'open') return;
		await this.#write({ [`players/${this.playerId}/themeVote`]: themeId });
	}

	async deal() {
		const room = this.room;
		if (!this.isHost || !room) return;
		if (room.mode === 'sketch') {
			await this.startSketch();
			return;
		}
		const theme = getTheme(this.#pollWinner());
		if (!theme) {
			this.#fail('Pick a theme first');
			return;
		}
		const { secret, usedWords } = this.#pickWord(theme);
		const count = Math.min(room.settings.imposterCount, Math.max(1, this.playerCount - 2));
		const imposters = new Set(pickN(this.players, count).map((player) => player.id));
		const deal = { secret, imposters: [...imposters] };
		const cards: Record<string, PrivateCard> = {};
		for (const player of this.players) {
			const isImposter = imposters.has(player.id);
			cards[player.id] = {
				isImposter,
				word: isImposter ? undefined : secret,
				themeId: theme.id,
				deal: player.id === room.hostId ? deal : undefined
			};
		}
		if (!(await this.#setCards(cards))) return;
		await this.#write({
			phase: 'reveal',
			'poll/status': 'closed',
			'poll/winnerId': theme.id,
			'round/number': (room.round.number ?? 0) + 1,
			'round/themeId': theme.id,
			'round/timerEndsAt': null,
			'round/timerPausedMs': null,
			'round/usedWords': usedWords,
			result: null
		});
	}

	async setReady() {
		if (!this.playerId) return;
		await this.#write({ [`players/${this.playerId}/ready`]: true });
	}

	async startDiscuss() {
		const room = this.room;
		if (!this.isHost || !room) return;
		await this.#write({
			phase: 'discuss',
			'round/timerEndsAt': Date.now() + room.settings.discussSeconds * 1000,
			'round/timerPausedMs': null
		});
	}

	async pauseTimer() {
		const ends = this.room?.round.timerEndsAt;
		if (!this.isHost || !ends) return;
		await this.#write({
			'round/timerEndsAt': null,
			'round/timerPausedMs': Math.max(0, ends - Date.now())
		});
	}

	async resumeTimer() {
		const room = this.room;
		if (!this.isHost || !room) return;
		await this.#write({
			'round/timerEndsAt': Date.now() + (room.round.timerPausedMs ?? 0),
			'round/timerPausedMs': null
		});
	}

	async addTime(seconds: number) {
		const round = this.room?.round;
		if (!this.isHost || !round) return;
		if (round.timerEndsAt) {
			await this.#write({ 'round/timerEndsAt': round.timerEndsAt + seconds * 1000 });
		} else if (round.timerPausedMs != null) {
			await this.#write({ 'round/timerPausedMs': round.timerPausedMs + seconds * 1000 });
		}
	}

	async openVote() {
		if (!this.isHost) return;
		const patch: Record<string, unknown> = {
			phase: 'vote',
			'round/timerEndsAt': null,
			'round/timerPausedMs': null
		};
		for (const player of this.players) {
			patch[`players/${player.id}/accused`] = null;
		}
		await this.#write(patch);
	}

	async votePlayer(targetId: string | null) {
		if (!this.playerId || this.room?.phase !== 'vote') return;
		await this.#write({ [`players/${this.playerId}/accused`]: targetId });
	}

	async reveal() {
		const room = this.room;
		if (!this.isHost || !room) return;
		const secret = this.#secret();
		const imposters = this.card?.deal?.imposters ?? [];
		if (!secret || imposters.length === 0) {
			this.#fail('Missing the round secret — start a new round.');
			return;
		}
		const { winner } = tallyVotes(this.players);
		const saved = await this.#write({
			phase: 'result',
			result: {
				secret,
				themeId: room.round.themeId ?? this.card?.themeId ?? '',
				imposters,
				accused: winner,
				villageWon: Boolean(winner && imposters.includes(winner))
			}
		});
		if (saved) await this.#setCards({});
	}

	async nextRound() {
		const room = this.room;
		if (!this.isHost || !room) return;
		const patch: Record<string, unknown> = {
			phase: 'lobby',
			'poll/status': 'idle',
			result: null
		};
		if (room.mode === 'sketch') patch.sketch = emptySketch(this.#zeroScores());
		for (const player of this.players) {
			patch[`players/${player.id}/themeVote`] = null;
			patch[`players/${player.id}/accused`] = null;
			patch[`players/${player.id}/ready`] = false;
		}
		if (await this.#write(patch)) await this.#setCards({});
	}

	async startSketch() {
		const room = this.room;
		if (!this.isHost || !room) return;
		const theme = getTheme(this.#pollWinner());
		if (!theme) {
			this.#fail('Pick a theme first');
			return;
		}
		const present = this.players.filter((player) => player.connected);
		const seats = shuffle((present.length ? present : this.players).map((player) => player.id));
		const order = Array.from({ length: Math.max(1, room.settings.sketchRounds) }, () => seats).flat();
		await this.#startTurn(order, 0, theme, this.#zeroScores());
	}

	async nextDrawer() {
		const room = this.room;
		const sketch = room?.sketch;
		if (!this.isHost || !room || !sketch) return;
		const theme = getTheme(room.round.themeId ?? this.#pollWinner());
		if (!theme) return;
		const newcomers = this.players
			.map((player) => player.id)
			.filter((id) => !sketch.order.includes(id));
		await this.#startTurn([...sketch.order, ...newcomers], sketch.turnIndex + 1, theme, sketch.scores);
	}

	async finishSketch() {
		if (!this.isHost) return;
		const saved = await this.#write({
			phase: 'sketch-final',
			'sketch/drawerId': null,
			'sketch/turnEndsAt': null
		});
		if (saved) await this.#setCards({});
	}

	drawInk(stroke: Stroke) {
		if (!this.isDrawer || this.room?.phase !== 'sketch') return;
		this.#pendingInk = stroke;
		if (this.#inkTimer) return;
		const gap = Math.min(320, Math.max(80, this.playerCount * 16));
		this.#inkTimer = setTimeout(
			() => this.#flushInk(),
			Math.max(0, this.#lastInkAt + gap - Date.now())
		);
	}

	commitStrokes(strokes: Stroke[]) {
		if (!this.isDrawer || this.room?.phase !== 'sketch') return;
		this.#pendingInk = null;
		void this.#write({ 'sketch/strokes': strokes });
	}

	async guessWord(text: string) {
		const room = this.room;
		const sketch = room?.sketch;
		if (!room || !sketch || !this.playerId || room.phase !== 'sketch') return;
		if (this.isDrawer || sketch.guessed[this.playerId]) return;
		const clean = text.trim().slice(0, 40);
		if (!wordKey(clean)) return;
		const guess: SketchGuess = {
			id: shortId(),
			playerId: this.playerId,
			text: clean,
			correct: false,
			points: 0,
			at: Date.now(),
			resolved: false
		};
		await this.#write({ [`sketch/guesses/${guess.id}`]: guess });
	}

	async endSketchTurn() {
		if (!this.isHost || this.room?.phase !== 'sketch') return;
		const tally = await this.#scoreGuesses();
		if (tally) await this.#endTurn(tally);
	}

	#secret(): string | null {
		return this.card?.deal?.secret ?? this.card?.word ?? null;
	}

	#zeroScores(): Record<string, number> {
		return Object.fromEntries(this.players.map((player) => [player.id, 0]));
	}

	#topVoted(): string {
		const ids = this.room?.poll.themeIds ?? [];
		let winner = ids[0] ?? THEMES[0]!.id;
		let best = -1;
		for (const id of ids) {
			const votes = this.pollCounts[id] ?? 0;
			if (votes > best) {
				best = votes;
				winner = id;
			}
		}
		return winner;
	}

	#pollWinner(): string {
		const poll = this.room?.poll;
		return poll?.status === 'closed' && poll.winnerId ? poll.winnerId : this.#topVoted();
	}

	#pickWord(theme: Theme): { secret: string; usedWords: string[] } {
		const used = new Set(this.room?.round.usedWords ?? []);
		const fresh = theme.words.filter((word) => !used.has(word));
		const pool = fresh.length ? fresh : theme.words;
		const secret = pool[Math.floor(Math.random() * pool.length)] ?? theme.words[0]!;
		return { secret, usedWords: fresh.length ? [...used, secret] : [secret] };
	}

	async #startTurn(order: string[], from: number, theme: Theme, scores: Record<string, number>) {
		const room = this.room;
		if (!room) return;
		const present = new Set(
			this.players.filter((player) => player.connected).map((player) => player.id)
		);
		let turnIndex = from;
		while (turnIndex < order.length && !present.has(order[turnIndex] ?? '')) turnIndex++;
		const drawerId = order[turnIndex];
		if (!drawerId) {
			await this.finishSketch();
			return;
		}
		const { secret, usedWords } = this.#pickWord(theme);
		const cards: Record<string, PrivateCard> = {
			[room.hostId]: { isImposter: false, themeId: theme.id, deal: { secret, imposters: [] } }
		};
		cards[drawerId] = { ...cards[drawerId], isImposter: false, themeId: theme.id, word: secret };
		if (!(await this.#setCards(cards))) return;
		const sketch: SketchState = {
			drawerId,
			order,
			turnIndex,
			hint: wordHint(secret),
			revealWord: null,
			strokes: [],
			guesses: {},
			scores,
			guessed: {},
			turnPoints: {},
			turnEndsAt: Date.now() + room.settings.drawSeconds * 1000
		};
		await this.#write({
			phase: 'sketch',
			sketch,
			'poll/status': 'closed',
			'poll/winnerId': theme.id,
			'round/number': (room.round.number ?? 0) + 1,
			'round/themeId': theme.id,
			'round/usedWords': usedWords,
			'round/timerEndsAt': null,
			'round/timerPausedMs': null,
			result: null
		});
	}

	#announce() {
		const room = this.room;
		const sketch = room?.sketch;
		const phase = room?.phase ?? null;
		if (room && sketch && phase === 'sketch') {
			const key = turnKey(room);
			if (this.#lastTurn?.key !== key) this.#seenGuesses.clear();
			for (const guess of Object.values(sketch.guesses)) {
				if (!guess.resolved || this.#seenGuesses.has(guess.id)) continue;
				this.#seenGuesses.add(guess.id);
				if (guess.correct) continue;
				if (guess.playerId === this.playerId && guess.note) {
					this.#alert(
						guess.near ? `So close — ${guess.note}` : `Not quite — ${guess.note}`,
						guess.near ? 'warn' : 'info'
					);
				} else if (guess.near) {
					this.#alert(`${room.players[guess.playerId]?.name ?? 'Someone'} is close`, 'warn');
				}
			}
			const known = this.#lastTurn?.key === key ? this.#lastTurn.guessed : null;
			const solvedIds = this.#alertSolves(room, sketch, known);
			this.#lastTurn = { key, guessed: new Set(solvedIds), endsAt: sketch.turnEndsAt };
		} else if (room && sketch && phase === 'sketch-reveal' && this.#lastPhase === 'sketch') {
			this.#alertSolves(room, sketch, this.#lastTurn?.guessed ?? null);
			const guessers = this.players.filter(
				(player) => player.id !== sketch.drawerId && player.connected
			);
			const everyone = guessers.length > 0 && guessers.every((player) => sketch.guessed[player.id]);
			const early = Boolean(this.#lastTurn?.endsAt && Date.now() < this.#lastTurn.endsAt - 1000);
			if (everyone) this.#alert('Everyone got it!', 'good');
			else this.#alert(early ? 'Turn skipped' : 'Time’s up!', 'info');
			this.#lastTurn = null;
			this.#seenGuesses.clear();
		}
		this.#lastPhase = phase;
	}

	#alertSolves(room: RoomPublic, sketch: SketchState, known: Set<string> | null): string[] {
		const solvedIds = Object.keys(sketch.guessed).filter((id) => sketch.guessed[id]);
		for (const id of solvedIds) {
			if (!known || known.has(id)) continue;
			const who = id === this.playerId ? 'You' : (room.players[id]?.name ?? 'Someone');
			this.#alert(`${who} got it! +${sketch.turnPoints[id] ?? 0}`, 'good');
		}
		return solvedIds;
	}

	#alert(text: string, tone: Alert['tone']) {
		const alert: Alert = { id: shortId(), text, tone };
		this.alerts = [...this.alerts.slice(-2), alert];
		setTimeout(() => {
			this.alerts = this.alerts.filter((item) => item.id !== alert.id);
		}, 2800);
	}

	#onRoom() {
		this.#announce();
		const key = turnKey(this.room);
		if (key !== this.#turn) {
			this.#turn = key;
			this.#inkSeen.clear();
			this.ink = null;
		}
		for (const stroke of this.room?.sketch?.strokes ?? []) this.#inkSeen.add(stroke.id);
		if (this.ink && this.#inkSeen.has(this.ink.id)) this.ink = null;
		if (this.isHost) {
			this.#armTimers();
			void this.#hostTick();
		}
	}

	#receiveInk(stroke: Stroke) {
		if (this.room?.phase !== 'sketch' || this.isDrawer || this.#inkSeen.has(stroke.id)) return;
		this.ink = stroke;
	}

	#flushInk() {
		this.#inkTimer = null;
		const stroke = this.#pendingInk;
		this.#pendingInk = null;
		if (!stroke || !this.room) return;
		this.#lastInkAt = Date.now();
		this.#backend.sendInk(this.room.code, stroke);
	}

	#armTimers() {
		const room = this.room;
		const ends = room?.phase === 'sketch' ? (room.sketch?.turnEndsAt ?? null) : null;
		if (ends === this.#armedFor) return;
		this.#clearTimers();
		this.#armedFor = ends;
		if (!room || !ends) return;
		const duration = room.settings.drawSeconds * 1000;
		const at = (time: number, task: () => Promise<void>) => {
			const timer = setTimeout(() => {
				task().catch((err) => this.#fail(err));
			}, Math.max(0, time - Date.now()));
			this.#timers.push(timer);
		};
		at(ends - duration / 2, () => this.#revealHint(1));
		at(ends - duration / 4, () => this.#revealHint(2));
		at(ends + 150, () => this.#hostTick());
	}

	#clearTimers() {
		for (const timer of this.#timers) clearTimeout(timer);
		this.#timers = [];
		this.#armedFor = null;
	}

	async #revealHint(target: number) {
		const room = this.room;
		const sketch = room?.sketch;
		const secret = this.#secret();
		if (!this.isHost || !sketch || room?.phase !== 'sketch' || !secret) return;
		const hint = revealLetters(sketch.hint, secret, Math.min(target, hintBudget(secret)));
		if (hint !== sketch.hint) await this.#write({ 'sketch/hint': hint });
	}

	async #hostTick() {
		if (this.#ticking) {
			this.#tickAgain = true;
			return;
		}
		this.#ticking = true;
		try {
			do {
				this.#tickAgain = false;
				const tally = await this.#scoreGuesses();
				if (tally && this.#turnIsOver(tally)) await this.#endTurn(tally);
			} while (this.#tickAgain);
		} finally {
			this.#ticking = false;
		}
	}

	async #scoreGuesses(): Promise<Tally | null> {
		const room = this.room;
		const sketch = room?.sketch;
		if (!this.isHost || !room || !sketch || room.phase !== 'sketch') return null;
		const tally: Tally = { guessed: { ...sketch.guessed }, turnPoints: { ...sketch.turnPoints } };
		const secret = this.#secret();
		if (!secret) return tally;
		const ends = sketch.turnEndsAt ?? Date.now();
		const duration = room.settings.drawSeconds * 1000;
		const pending = Object.values(sketch.guesses)
			.filter((guess) => !guess.resolved)
			.sort((a, b) => a.at - b.at);
		if (pending.length === 0) return tally;
		const patch: Record<string, unknown> = {};
		for (const guess of pending) {
			const path = `sketch/guesses/${guess.id}`;
			patch[`${path}/resolved`] = true;
			patch[`${path}/text`] = '';
			if (guess.playerId === sketch.drawerId || tally.guessed[guess.playerId]) continue;
			if (guessesMatch(guess.text, secret)) {
				const points = guessPoints(ends - Math.min(guess.at, ends), duration);
				tally.guessed[guess.playerId] = true;
				tally.turnPoints[guess.playerId] = points;
				patch[`${path}/correct`] = true;
				patch[`${path}/points`] = points;
				patch[`sketch/guessed/${guess.playerId}`] = true;
				patch[`sketch/turnPoints/${guess.playerId}`] = points;
				continue;
			}
			const result = closeness(guess.text, secret);
			patch[`${path}/near`] = result.near;
			patch[`${path}/note`] = result.note;
		}
		await this.#write(patch);
		return tally;
	}

	#turnIsOver(tally: Tally): boolean {
		const sketch = this.room?.sketch;
		if (!sketch?.turnEndsAt) return false;
		if (Date.now() >= sketch.turnEndsAt) return true;
		const guessers = this.players.filter(
			(player) => player.id !== sketch.drawerId && player.connected
		);
		return guessers.length > 0 && guessers.every((player) => tally.guessed[player.id]);
	}

	async #endTurn(tally: Tally) {
		const room = this.room;
		const sketch = room?.sketch;
		const key = turnKey(room);
		if (!this.isHost || !sketch || !key || this.#endedTurn === key) return;
		this.#endedTurn = key;
		const awards = { ...tally.turnPoints };
		if (sketch.drawerId) {
			const guessers = this.players.filter(
				(player) =>
					player.id !== sketch.drawerId && (player.connected || tally.guessed[player.id])
			);
			awards[sketch.drawerId] = median(
				guessers.map((player) => tally.turnPoints[player.id] ?? 0)
			);
		}
		const scores = { ...sketch.scores };
		for (const [id, points] of Object.entries(awards)) {
			scores[id] = (scores[id] ?? 0) + points;
		}
		const saved = await this.#write({
			phase: 'sketch-reveal',
			'sketch/revealWord': this.#secret(),
			'sketch/turnEndsAt': null,
			'sketch/scores': scores,
			'sketch/turnPoints': awards
		});
		if (!saved) this.#endedTurn = '';
	}

	async #try(task: (code: string) => Promise<void>): Promise<boolean> {
		const code = this.room?.code;
		if (!code) return false;
		try {
			await task(code);
			return true;
		} catch (err) {
			this.#fail(err);
			return false;
		}
	}

	#write(patch: Record<string, unknown>): Promise<boolean> {
		return this.#try((code) => this.#backend.updatePublic(code, patch));
	}

	#setCards(cards: Record<string, PrivateCard>): Promise<boolean> {
		return this.#try((code) => this.#backend.setSecrets(code, cards));
	}

	#fail(err: unknown) {
		const message =
			typeof err === 'string' ? err : err instanceof Error ? err.message : 'Something went wrong';
		this.error = message;
		if (this.#errorTimer) clearTimeout(this.#errorTimer);
		this.#errorTimer = setTimeout(() => {
			if (this.error === message) this.error = '';
		}, 6000);
	}
}

/** Set once by the /play layout: its deriveds must be owned by a component that outlives every page. */
export const [getSession, setSession] = createContext<GameSession>();
