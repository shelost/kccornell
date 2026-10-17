import { getBackend, syncKind, type SyncBackend } from './sync';
import { getTheme, THEMES } from './themes';
import {
	MAX_PLAYERS,
	type Phase,
	type Player,
	type PrivateCard,
	type RoomPublic
} from './types';
import { pickN, PLAYER_COLORS, randomCode, suggestedImposters } from './ids';

const NAME_KEY = 'kcc-imposter-name';

function hydrateRoom(room: RoomPublic | null): RoomPublic | null {
	if (!room) return null;
	return {
		...room,
		players: room.players ?? {},
		settings: room.settings ?? {
			imposterCount: 1,
			discussSeconds: 180,
			pollSeconds: 30
		},
		poll: room.poll ?? {
			themeIds: THEMES.map((theme) => theme.id),
			status: 'idle',
			winnerId: null
		},
		round: room.round ?? { number: 0, usedWords: [] }
	};
}

function emptyRoom(code: string, host: Player): RoomPublic {
	return {
		code,
		hostId: host.id,
		createdAt: Date.now(),
		phase: 'lobby',
		players: { [host.id]: host },
		settings: {
			imposterCount: 1,
			discussSeconds: 180,
			pollSeconds: 30
		},
		poll: {
			themeIds: THEMES.map((theme) => theme.id),
			status: 'idle',
			winnerId: null
		},
		round: { number: 0, usedWords: [] },
		result: null
	};
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
	playerId = $state('');
	busy = $state(false);
	error = $state('');
	kind = $state(syncKind());

	#backend: SyncBackend = getBackend();
	#unsub: (() => void) | null = null;

	me = $derived(this.room?.players?.[this.playerId] ?? null);
	isHost = $derived(this.room?.hostId === this.playerId);
	phase = $derived<Phase>(this.room?.phase ?? 'lobby');
	players = $derived.by(() => {
		const list = Object.values(this.room?.players ?? {});
		return list.sort((a, b) => a.joinedAt - b.joinedAt);
	});
	playerCount = $derived(this.players.length);
	code = $derived(this.room?.code ?? '');
	theme = $derived(getTheme(this.room?.round.themeId ?? this.room?.poll.winnerId));
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

	async create(name: string): Promise<string> {
		this.busy = true;
		this.error = '';
		try {
			const playerId = await this.#backend.ensurePlayerId();
			this.playerId = playerId;
			this.saveName(name);
			let code = randomCode();
			for (let i = 0; i < 8; i++) {
				if (!(await this.#backend.roomExists(code))) break;
				code = randomCode();
			}
			const host: Player = {
				id: playerId,
				name: name.trim().slice(0, 18),
				joinedAt: Date.now(),
				connected: true,
				color: 0
			};
			const room = emptyRoom(code, host);
			await this.#backend.create(room);
			this.attach(code, playerId);
			this.#backend.markDisconnect(code, playerId);
			return code;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Could not create a room';
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
			const exists = await this.#backend.roomExists(code);
			if (!exists) {
				this.error = 'No room with that code';
				return;
			}
			this.attach(code, playerId);
			await new Promise((resolve) => setTimeout(resolve, 120));
			const room = this.room;
			if (!room) {
				this.error = 'Room disappeared';
				return;
			}
			if (!room.players[playerId] && this.playerCount >= MAX_PLAYERS) {
				this.error = 'That room is full (20)';
				this.detach();
				return;
			}
			if (room.phase !== 'lobby' && !room.players[playerId]) {
				this.error = 'The round already started';
				this.detach();
				return;
			}
			const usedColors = new Set(Object.values(room.players).map((p) => p.color));
			let color = 0;
			for (let i = 0; i < PLAYER_COLORS.length; i++) {
				if (!usedColors.has(i)) {
					color = i;
					break;
				}
			}
			const player: Player = room.players[playerId]
				? { ...room.players[playerId]!, name: name.trim().slice(0, 18), connected: true }
				: {
						id: playerId,
						name: name.trim().slice(0, 18),
						joinedAt: Date.now(),
						connected: true,
						color
					};
			await this.#backend.updatePublic(code, {
				[`players/${playerId}`]: player
			});
			this.#backend.markDisconnect(code, playerId);
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Could not join';
		} finally {
			this.busy = false;
		}
	}

	attach(code: string, playerId: string) {
		this.detach();
		this.#unsub = this.#backend.subscribe(code, playerId, {
			onPublic: (room) => {
				this.room = hydrateRoom(room);
			},
			onSecret: (card) => {
				this.card = card;
			}
		});
	}

	detach() {
		this.#unsub?.();
		this.#unsub = null;
	}

	async leave() {
		if (this.room && this.playerId) {
			await this.#backend.updatePublic(this.room.code, {
				[`players/${this.playerId}`]: null
			});
		}
		this.detach();
		this.room = null;
		this.card = null;
	}

	async kick(id: string) {
		if (!this.isHost || !this.room) return;
		await this.#backend.updatePublic(this.room.code, {
			[`players/${id}`]: null
		});
	}

	async setImposterCount(n: number) {
		if (!this.isHost || !this.room) return;
		const max = Math.max(1, Math.min(3, Math.floor((this.playerCount - 1) / 2) || 1));
		await this.#backend.updatePublic(this.room.code, {
			'settings/imposterCount': Math.min(max, Math.max(1, n))
		});
	}

	async setDiscussSeconds(seconds: number) {
		if (!this.isHost || !this.room) return;
		await this.#backend.updatePublic(this.room.code, {
			'settings/discussSeconds': seconds
		});
	}

	async togglePollTheme(themeId: string) {
		if (!this.isHost || !this.room) return;
		const current = this.room.poll.themeIds;
		const next = current.includes(themeId)
			? current.filter((id) => id !== themeId)
			: [...current, themeId];
		if (next.length < 2) return;
		await this.#backend.updatePublic(this.room.code, {
			'poll/themeIds': next
		});
	}

	async startPoll() {
		if (!this.isHost || !this.room) return;
		if (this.playerCount < 3) {
			this.error = 'Need at least 3 players';
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
		const suggested = suggestedImposters(this.playerCount);
		if (this.room.settings.imposterCount > this.playerCount - 2) {
			patch['settings/imposterCount'] = suggested;
		}
		await this.#backend.updatePublic(this.room.code, patch);
	}

	async voteTheme(themeId: string) {
		if (!this.room || !this.playerId) return;
		if (this.room.phase !== 'poll' || this.room.poll.status !== 'open') return;
		await this.#backend.updatePublic(this.room.code, {
			[`players/${this.playerId}/themeVote`]: themeId
		});
	}

	async lockPoll() {
		if (!this.isHost || !this.room) return;
		const counts = this.pollCounts;
		let winner = this.room.poll.themeIds[0] ?? THEMES[0]!.id;
		let best = -1;
		for (const id of this.room.poll.themeIds) {
			const n = counts[id] ?? 0;
			if (n > best) {
				best = n;
				winner = id;
			}
		}
		await this.#backend.updatePublic(this.room.code, {
			'poll/status': 'closed',
			'poll/winnerId': winner
		});
	}

	async chooseTheme(themeId: string) {
		if (!this.isHost || !this.room) return;
		await this.#backend.updatePublic(this.room.code, {
			'poll/status': 'closed',
			'poll/winnerId': themeId
		});
	}

	async deal() {
		if (!this.isHost || !this.room) return;
		let themeId = this.room.poll.winnerId ?? null;
		if (!themeId || this.room.poll.status === 'open') {
			const counts = this.pollCounts;
			let winner = this.room.poll.themeIds[0] ?? THEMES[0]!.id;
			let best = -1;
			for (const id of this.room.poll.themeIds) {
				const n = counts[id] ?? 0;
				if (n > best) {
					best = n;
					winner = id;
				}
			}
			themeId = winner;
			await this.#backend.updatePublic(this.room.code, {
				'poll/status': 'closed',
				'poll/winnerId': winner
			});
		}
		const theme = getTheme(themeId);
		if (!theme) {
			this.error = 'Pick a theme first';
			return;
		}
		const used = new Set(this.room.round.usedWords ?? []);
		const pool = theme.words.filter((word) => !used.has(word));
		const source = pool.length ? pool : theme.words;
		const secret = source[Math.floor(Math.random() * source.length)] ?? theme.words[0]!;
		const count = Math.min(this.room.settings.imposterCount, Math.max(1, this.playerCount - 2));
		const imposters = pickN(this.players, count);
		const imposterIds = new Set(imposters.map((p) => p.id));
		const deal = { secret, imposters: [...imposterIds] };
		const secrets: Record<string, PrivateCard> = {};
		for (const player of this.players) {
			secrets[player.id] = {
				isImposter: imposterIds.has(player.id),
				word: imposterIds.has(player.id) ? undefined : secret,
				themeId: theme.id,
				deal: player.id === this.room.hostId ? deal : undefined
			};
		}
		await this.#backend.setSecrets(this.room.code, secrets);
		const usedWords = [...used, secret];
		await this.#backend.updatePublic(this.room.code, {
			phase: 'reveal',
			'round/number': (this.room.round.number ?? 0) + 1,
			'round/themeId': theme.id,
			'round/timerEndsAt': null,
			'round/timerPausedMs': null,
			'round/usedWords': usedWords,
			result: null
		});
	}

	async setReady() {
		if (!this.room || !this.playerId) return;
		await this.#backend.updatePublic(this.room.code, {
			[`players/${this.playerId}/ready`]: true
		});
	}

	async startDiscuss() {
		if (!this.isHost || !this.room) return;
		const ends = Date.now() + this.room.settings.discussSeconds * 1000;
		await this.#backend.updatePublic(this.room.code, {
			phase: 'discuss',
			'round/timerEndsAt': ends,
			'round/timerPausedMs': null
		});
	}

	async pauseTimer() {
		if (!this.isHost || !this.room) return;
		const ends = this.room.round.timerEndsAt;
		if (!ends) return;
		const remaining = Math.max(0, ends - Date.now());
		await this.#backend.updatePublic(this.room.code, {
			'round/timerEndsAt': null,
			'round/timerPausedMs': remaining
		});
	}

	async resumeTimer() {
		if (!this.isHost || !this.room) return;
		const remaining = this.room.round.timerPausedMs ?? 0;
		await this.#backend.updatePublic(this.room.code, {
			'round/timerEndsAt': Date.now() + remaining,
			'round/timerPausedMs': null
		});
	}

	async addTime(seconds: number) {
		if (!this.isHost || !this.room) return;
		if (this.room.round.timerEndsAt) {
			await this.#backend.updatePublic(this.room.code, {
				'round/timerEndsAt': this.room.round.timerEndsAt + seconds * 1000
			});
			return;
		}
		if (this.room.round.timerPausedMs != null) {
			await this.#backend.updatePublic(this.room.code, {
				'round/timerPausedMs': this.room.round.timerPausedMs + seconds * 1000
			});
		}
	}

	async openVote() {
		if (!this.isHost || !this.room) return;
		const patch: Record<string, unknown> = {
			phase: 'vote',
			'round/timerEndsAt': null,
			'round/timerPausedMs': null
		};
		for (const player of this.players) {
			patch[`players/${player.id}/accused`] = null;
		}
		await this.#backend.updatePublic(this.room.code, patch);
	}

	async votePlayer(targetId: string | null) {
		if (!this.room || !this.playerId) return;
		if (this.room.phase !== 'vote') return;
		await this.#backend.updatePublic(this.room.code, {
			[`players/${this.playerId}/accused`]: targetId
		});
	}

	async reveal() {
		if (!this.isHost || !this.room) return;
		const deal = this.card?.deal;
		const secret = deal?.secret ?? this.card?.word;
		const imposters = deal?.imposters ?? [];
		const themeId = this.room.round.themeId ?? this.card?.themeId ?? '';
		if (!secret || imposters.length === 0) {
			this.error = 'Missing the round secret — start a new round.';
			return;
		}
		const { winner } = tallyVotes(this.players);
		const villageWon = Boolean(winner && imposters.includes(winner));
		await this.#backend.updatePublic(this.room.code, {
			phase: 'result',
			result: {
				secret,
				themeId,
				imposters,
				accused: winner,
				villageWon
			}
		});
		await this.#backend.clearSecrets(this.room.code);
	}

	async nextRound() {
		if (!this.isHost || !this.room) return;
		const patch: Record<string, unknown> = {
			phase: 'lobby',
			'poll/status': 'idle',
			result: null
		};
		for (const player of this.players) {
			patch[`players/${player.id}/themeVote`] = null;
			patch[`players/${player.id}/accused`] = null;
			patch[`players/${player.id}/ready`] = false;
		}
		await this.#backend.updatePublic(this.room.code, patch);
		await this.#backend.clearSecrets(this.room.code);
	}
}

let singleton: GameSession | null = null;

export function getSession(): GameSession {
	if (!singleton) singleton = new GameSession();
	return singleton;
}
