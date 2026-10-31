import { getSupabase, isSupabaseConfigured } from './supabase';

export type HallGuest = {
	id: string;
	name: string;
	profileId: string | null;
};

export type HallHandle = {
	update(me: HallGuest): void;
	stop(): void;
};

type PresenceMeta = {
	name?: string;
	profileId?: string | null;
};

const CHANNEL = 'kcc-parlor-hall';
const TTL = 12_000;
const BEAT = 4_000;

function compact(guests: HallGuest[], meId: string): HallGuest[] {
	const unique = new Map<string, HallGuest>();
	for (const guest of guests) {
		const key = guest.profileId ?? guest.id;
		if (!unique.has(key)) unique.set(key, guest);
	}
	return [...unique.values()].sort((a, b) => {
		if (a.id === meId) return -1;
		if (b.id === meId) return 1;
		return a.name.localeCompare(b.name);
	});
}

function watchLocal(me: HallGuest, onChange: (guests: HallGuest[]) => void): HallHandle {
	let current = me;
	const seen = new Map<string, HallGuest & { at: number }>();
	const bus = new BroadcastChannel(CHANNEL);

	const emit = () => {
		const now = Date.now();
		for (const [id, guest] of seen) {
			if (now - guest.at > TTL) seen.delete(id);
		}
		seen.set(current.id, { ...current, at: now });
		onChange(compact([...seen.values()], current.id));
	};

	const beat = () => {
		const packet = { ...current, at: Date.now() };
		seen.set(current.id, packet);
		bus.postMessage(packet);
		emit();
	};

	bus.onmessage = (event: MessageEvent<HallGuest & { at?: number; gone?: boolean }>) => {
		const packet = event.data;
		if (!packet?.id || packet.id === current.id) return;
		if (packet.gone) {
			seen.delete(packet.id);
			emit();
			return;
		}
		seen.set(packet.id, { id: packet.id, name: packet.name, profileId: packet.profileId, at: packet.at ?? Date.now() });
		emit();
	};

	const onHide = () => bus.postMessage({ ...current, at: Date.now(), gone: true });
	window.addEventListener('pagehide', onHide);
	beat();
	const timer = setInterval(beat, BEAT);

	return {
		update(next) {
			if (next.id !== current.id) seen.delete(current.id);
			current = next;
			beat();
		},
		stop() {
			clearInterval(timer);
			onHide();
			window.removeEventListener('pagehide', onHide);
			bus.close();
		}
	};
}

function watchRemote(me: HallGuest, onChange: (guests: HallGuest[]) => void): HallHandle {
	let current = me;
	const supabase = getSupabase();
	const chan = supabase
		.channel('parlor:hall', { config: { presence: { key: me.id } } })
		.on('presence', { event: 'sync' }, () => {
			const state = chan.presenceState() as Record<string, PresenceMeta[]>;
			const guests = Object.entries(state).map(([id, metas]) => ({
				id,
				name: metas[0]?.name?.trim() || 'Friend',
				profileId: metas[0]?.profileId ?? null
			}));
			onChange(compact(guests, current.id));
		})
		.subscribe((status) => {
			if (status !== 'SUBSCRIBED') return;
			void chan.track({ name: current.name, profileId: current.profileId });
		});

	onChange([current]);

	return {
		update(next) {
			current = next;
			void chan.track({ name: next.name, profileId: next.profileId });
		},
		stop() {
			void supabase.removeChannel(chan);
		}
	};
}

export function watchHall(me: HallGuest, onChange: (guests: HallGuest[]) => void): HallHandle {
	if (typeof window === 'undefined') {
		return { update() {}, stop() {} };
	}
	try {
		if (isSupabaseConfigured()) return watchRemote(me, onChange);
	} catch {
		/* same-browser fallback */
	}
	return watchLocal(me, onChange);
}
