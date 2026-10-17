import {
	onDisconnect,
	onValue,
	ref,
	get,
	set,
	update,
	type OnDisconnect
} from 'firebase/database';
import { applyPatch } from './patch';
import { ensureAnonUser, getFirebase, isFirebaseConfigured } from './firebase';
import type { PrivateCard, RoomPatch, RoomPublic } from './types';

export type SyncKind = 'firebase' | 'local';

export type SyncHandlers = {
	onPublic: (room: RoomPublic | null) => void;
	onSecret: (card: PrivateCard | null) => void;
};

export interface SyncBackend {
	kind: SyncKind;
	ensurePlayerId(): Promise<string>;
	roomExists(code: string): Promise<boolean>;
	subscribe(code: string, playerId: string, handlers: SyncHandlers): () => void;
	create(room: RoomPublic): Promise<void>;
	updatePublic(code: string, patch: RoomPatch): Promise<void>;
	setSecrets(code: string, secrets: Record<string, PrivateCard>): Promise<void>;
	clearSecrets(code: string): Promise<void>;
	markDisconnect(code: string, playerId: string): void;
}

type LocalStore = {
	public: RoomPublic;
	secrets: Record<string, PrivateCard>;
};

const LOCAL_PREFIX = 'kcc-imposter-room:';
const LOCAL_ID_KEY = 'kcc-imposter-id';
const CHANNEL = 'kcc-imposter-sync';

let localChannel: BroadcastChannel | null = null;

function channel(): BroadcastChannel {
	if (!localChannel) localChannel = new BroadcastChannel(CHANNEL);
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
	channel().postMessage({ code });
}

function localId(): string {
	let id = localStorage.getItem(LOCAL_ID_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(LOCAL_ID_KEY, id);
	}
	return id;
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
				handlers.onPublic(store?.public ?? null);
				handlers.onSecret(store?.secrets?.[playerId] ?? null);
			};
			emit();
			const channel = new BroadcastChannel(CHANNEL);
			channel.onmessage = (event) => {
				if (event.data?.code === code) emit();
			};
			const onStorage = (event: StorageEvent) => {
				if (event.key === LOCAL_PREFIX + code) emit();
			};
			window.addEventListener('storage', onStorage);
			return () => {
				channel.close();
				window.removeEventListener('storage', onStorage);
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
		async clearSecrets(code) {
			const store = loadLocal(code);
			if (!store) return;
			store.secrets = {};
			saveLocal(code, store);
		},
		markDisconnect(code, playerId) {
			const store = loadLocal(code);
			if (!store?.public.players[playerId]) return;
			store.public.players[playerId]!.connected = false;
			saveLocal(code, store);
		}
	};
}

function createFirebaseBackend(): SyncBackend {
	let disconnectHandle: OnDisconnect | null = null;

	return {
		kind: 'firebase',
		ensurePlayerId: ensureAnonUser,
		async roomExists(code) {
			const { db } = getFirebase();
			const snap = await get(ref(db, `rooms/${code}/public/code`));
			return snap.exists();
		},
		subscribe(code, playerId, handlers) {
			const { db } = getFirebase();
			const publicRef = ref(db, `rooms/${code}/public`);
			const secretRef = ref(db, `rooms/${code}/secrets/${playerId}`);
			const unsubPublic = onValue(publicRef, (snap) => {
				handlers.onPublic((snap.val() as RoomPublic | null) ?? null);
			});
			const unsubSecret = onValue(secretRef, (snap) => {
				handlers.onSecret((snap.val() as PrivateCard | null) ?? null);
			});
			return () => {
				unsubPublic();
				unsubSecret();
			};
		},
		async create(room) {
			const { db } = getFirebase();
			await set(ref(db, `rooms/${room.code}/public`), room);
		},
		async updatePublic(code, patch) {
			const { db } = getFirebase();
			await update(ref(db, `rooms/${code}/public`), patch);
		},
		async setSecrets(code, secrets) {
			const { db } = getFirebase();
			await set(ref(db, `rooms/${code}/secrets`), secrets);
		},
		async clearSecrets(code) {
			const { db } = getFirebase();
			await set(ref(db, `rooms/${code}/secrets`), null);
		},
		markDisconnect(code, playerId) {
			const { db } = getFirebase();
			void disconnectHandle?.cancel();
			disconnectHandle = onDisconnect(ref(db, `rooms/${code}/public/players/${playerId}/connected`));
			void disconnectHandle.set(false);
		}
	};
}

let backend: SyncBackend | null = null;

export function getBackend(): SyncBackend {
	if (backend) return backend;
	backend = isFirebaseConfigured() ? createFirebaseBackend() : createLocalBackend();
	return backend;
}

export function syncKind(): SyncKind {
	return isFirebaseConfigured() ? 'firebase' : 'local';
}
