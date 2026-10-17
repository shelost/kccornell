import type { RealtimeChannel } from '@supabase/supabase-js';
import { shortId } from './ids';
import { applyPatch } from './patch';
import { ensureAnonUser, getSupabase, isSupabaseConfigured } from './supabase';
import type { PrivateCard, RoomPatch, RoomPublic, Stroke } from './types';

export type SyncKind = 'supabase' | 'local';

export type SyncHandlers = {
	onPublic: (room: RoomPublic | null) => void;
	onSecret: (card: PrivateCard | null) => void;
	onInk: (stroke: Stroke) => void;
	onPresence: (online: Set<string>) => void;
};

export interface SyncBackend {
	kind: SyncKind;
	ensurePlayerId(): Promise<string>;
	roomExists(code: string): Promise<boolean>;
	subscribe(code: string, playerId: string, handlers: SyncHandlers): () => void;
	create(room: RoomPublic): Promise<void>;
	updatePublic(code: string, patch: RoomPatch): Promise<void>;
	/** Replaces every card in the room; players missing from `secrets` lose theirs. */
	setSecrets(code: string, secrets: Record<string, PrivateCard>): Promise<void>;
	sendInk(code: string, stroke: Stroke): void;
}

type LocalStore = {
	public: RoomPublic;
	secrets: Record<string, PrivateCard>;
};

type LocalMessage = { code: string; ink?: Stroke };

const LOCAL_PREFIX = 'kcc-imposter-room:';
const LOCAL_ID_KEY = 'kcc-imposter-id';
const CHANNEL = 'kcc-imposter-sync';

let localChannel: BroadcastChannel | null = null;

function channel(): BroadcastChannel {
	localChannel ??= new BroadcastChannel(CHANNEL);
	return localChannel;
}

function loadLocal(code: string): LocalStore | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(LOCAL_PREFIX + code);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as LocalStore;
	} catch {
		return null;
	}
}

function saveLocal(code: string, store: LocalStore) {
	localStorage.setItem(LOCAL_PREFIX + code, JSON.stringify(store));
	channel().postMessage({ code } satisfies LocalMessage);
}

function localId(): string {
	let id = sessionStorage.getItem(LOCAL_ID_KEY);
	if (!id) {
		id = shortId();
		sessionStorage.setItem(LOCAL_ID_KEY, id);
	}
	return id;
}

function setLocalConnected(code: string, playerId: string, connected: boolean) {
	const store = loadLocal(code);
	const player = store?.public.players[playerId];
	if (!store || !player || player.connected === connected) return;
	player.connected = connected;
	saveLocal(code, store);
}

function createLocalBackend(): SyncBackend {
	return {
		kind: 'local',
		async ensurePlayerId() {
			return localId();
		},
		async roomExists(code) {
			return loadLocal(code) !== null;
		},
		subscribe(code, playerId, handlers) {
			const emit = () => {
				const store = loadLocal(code);
				handlers.onSecret(store?.secrets?.[playerId] ?? null);
				handlers.onPublic(store?.public ?? null);
			};
			const bus = new BroadcastChannel(CHANNEL);
			bus.onmessage = (event: MessageEvent<LocalMessage>) => {
				if (event.data?.code !== code) return;
				if (event.data.ink) handlers.onInk(event.data.ink);
				else emit();
			};
			// Other tabs can get the BroadcastChannel ping before their copy of localStorage updates;
			// the storage event only fires once the new value is readable.
			const onStorage = (event: StorageEvent) => {
				if (event.key === LOCAL_PREFIX + code) emit();
			};
			const onHide = () => setLocalConnected(code, playerId, false);
			const onShow = () => setLocalConnected(code, playerId, true);
			window.addEventListener('storage', onStorage);
			window.addEventListener('pagehide', onHide);
			window.addEventListener('pageshow', onShow);
			emit();
			return () => {
				bus.close();
				window.removeEventListener('storage', onStorage);
				window.removeEventListener('pagehide', onHide);
				window.removeEventListener('pageshow', onShow);
			};
		},
		async create(room) {
			saveLocal(room.code, { public: room, secrets: {} });
		},
		async updatePublic(code, patch) {
			const store = loadLocal(code);
			if (!store) throw new Error('Room not found');
			store.public = applyPatch(store.public, patch);
			saveLocal(code, store);
		},
		async setSecrets(code, secrets) {
			const store = loadLocal(code);
			if (!store) throw new Error('Room not found');
			store.secrets = secrets;
			saveLocal(code, store);
		},
		sendInk(code, stroke) {
			channel().postMessage({ code, ink: stroke } satisfies LocalMessage);
		}
	};
}

type RoomRow = { state: RoomPublic; version: number };
type SecretRow = { code: string; card: PrivateCard | null };

function explain(message: string): string {
	return /parlor_|schema cache/i.test(message)
		? 'Supabase is missing the game tables — run supabase/parlor.sql in the SQL editor.'
		: message;
}

function createSupabaseBackend(): SyncBackend {
	const supabase = getSupabase();
	const channels = new Map<string, RealtimeChannel>();
	const removals = new Map<string, Promise<unknown>>();

	async function rpc(fn: string, args: Record<string, unknown>) {
		const { error } = await supabase.rpc(fn, args);
		if (error) throw new Error(explain(error.message));
	}

	return {
		kind: 'supabase',
		ensurePlayerId: ensureAnonUser,
		async roomExists(code) {
			const { data, error } = await supabase
				.from('parlor_rooms')
				.select('code')
				.eq('code', code)
				.maybeSingle();
			if (error) throw new Error(explain(error.message));
			return data !== null;
		},
		subscribe(code, playerId, handlers) {
			let live: RealtimeChannel | null = null;
			let closed = false;
			let version = -1;

			const applyRoom = (row: RoomRow | null) => {
				if (closed) return;
				if (!row) {
					handlers.onPublic(null);
					return;
				}
				if (row.version < version) return;
				version = row.version;
				handlers.onPublic(row.state);
			};

			const refresh = async () => {
				const [room, secret] = await Promise.all([
					supabase.from('parlor_rooms').select('state, version').eq('code', code).maybeSingle(),
					supabase
						.from('parlor_secrets')
						.select('code, card')
						.eq('code', code)
						.eq('player_id', playerId)
						.maybeSingle()
				]);
				if (closed) return;
				if (!secret.error) handlers.onSecret((secret.data as SecretRow | null)?.card ?? null);
				if (!room.error) applyRoom(room.data as RoomRow | null);
			};

			const open = async () => {
				await removals.get(code);
				// supabase.channel() hands back an existing channel for the same topic, and a joined
				// channel rejects new listeners, so any leftover subscription must be removed first.
				const stale = supabase.getChannels().filter((c) => c.topic === `realtime:parlor:${code}`);
				await Promise.all(stale.map((c) => supabase.removeChannel(c)));
				if (closed) return;
				const chan: RealtimeChannel = supabase
					.channel(`parlor:${code}`, { config: { presence: { key: playerId } } })
					.on<RoomRow>(
						'postgres_changes',
						{ event: 'UPDATE', schema: 'public', table: 'parlor_rooms', filter: `code=eq.${code}` },
						(payload) => applyRoom(payload.new)
					)
					.on<SecretRow>(
						'postgres_changes',
						{
							event: '*',
							schema: 'public',
							table: 'parlor_secrets',
							filter: `player_id=eq.${playerId}`
						},
						(payload) => {
							if (payload.eventType === 'DELETE' || payload.new.code !== code) return;
							handlers.onSecret(payload.new.card ?? null);
						}
					)
					.on('broadcast', { event: 'ink' }, ({ payload }) => handlers.onInk(payload as Stroke))
					.on('presence', { event: 'sync' }, () => {
						handlers.onPresence(new Set(Object.keys(chan.presenceState())));
					})
					.subscribe((status) => {
						if (status !== 'SUBSCRIBED') return;
						void chan.track({ online: true });
						void refresh();
					});
				live = chan;
				channels.set(code, chan);
			};

			const onVisible = () => {
				if (document.visibilityState === 'visible') void refresh();
			};
			document.addEventListener('visibilitychange', onVisible);
			void open();
			void refresh();

			return () => {
				closed = true;
				document.removeEventListener('visibilitychange', onVisible);
				if (!live) return;
				if (channels.get(code) === live) channels.delete(code);
				removals.set(code, supabase.removeChannel(live));
			};
		},
		create: (room) => rpc('parlor_create', { p_code: room.code, p_state: room }),
		updatePublic: (code, patch) => rpc('parlor_patch', { p_code: code, p_patch: patch }),
		setSecrets: (code, secrets) => rpc('parlor_set_secrets', { p_code: code, p_cards: secrets }),
		sendInk(code, stroke) {
			const chan = channels.get(code);
			if (chan?.state !== 'joined') return;
			void chan.send({ type: 'broadcast', event: 'ink', payload: stroke });
		}
	};
}

let backend: SyncBackend | null = null;

export function getBackend(): SyncBackend {
	backend ??= isSupabaseConfigured() ? createSupabaseBackend() : createLocalBackend();
	return backend;
}

export function syncKind(): SyncKind {
	return isSupabaseConfigured() ? 'supabase' : 'local';
}
