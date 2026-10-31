export type Profile = {
	id: string;
	displayName: string;
	shortName: string;
	photo: string;
	aliases: string[];
	tags: string[];
};

type Seed = {
	id: string;
	displayName: string;
	photo: string;
	shortName?: string;
	/** Extra nicknames, initials, and spellings. First names are added automatically when unique. */
	tags?: string[];
	extras?: string[];
	/** Set false when the first name is shared (James Tu vs James Kim). */
	claimFirst?: boolean;
};

const SEEDS: Seed[] = [
	{
		id: 'alice',
		displayName: 'Alice Um',
		photo: '/alice.png',
		tags: ['#xc', '#onepieceday1'],
		extras: ['au', 'um', 'aliceum']
	},
	{
		id: 'ashley',
		displayName: 'Ashley Kwon',
		photo: '/ashley.png',
		tags: ['#loko', '#kis', '#mauritius'],
		extras: ['ash', 'ak', 'kwon', 'ashleykwon']
	},
	{
		id: 'caleb',
		displayName: 'Caleb Kim',
		photo: '/caleb.png',
		tags: ['#ck'],
		extras: ['cal', 'ck', 'calebkim']
	},
	{
		id: 'danielle',
		displayName: 'Danielle Hong',
		photo: '/danielle.png',
		tags: ['#bme', '#realscience'],
		extras: ['dani', 'danny', 'dh', 'hong', 'daniellehong']
	},
	{
		id: 'hailey',
		displayName: 'Hailey Lee',
		photo: '/hailey.png',
		tags: ['#government', '#futurepresident'],
		extras: ['hayley', 'hailee', 'hl', 'haileylee']
	},
	{
		id: 'heewon',
		displayName: 'Heewon Ahn',
		photo: '/heewon.png',
		tags: ['#juniorahn'],
		extras: ['hw', 'hee won', 'heewonahn', 'junior', 'junior ahn']
	},
	{
		id: 'james_kim',
		displayName: 'James Kim',
		photo: '/james_kim.png',
		tags: ['#theogjames', '#csgenius'],
		extras: ['james', 'jk', 'jkim', 'jamesk', 'the og', 'og']
	},
	{
		id: 'james_tu',
		displayName: 'James Tu',
		shortName: 'James 2',
		photo: '/james_tu.png',
		tags: ['#james2', '#electricboogaloo'],
		claimFirst: false,
		extras: ['james 2', 'james2', 'j2', 'jt', 'jtu', 'tu', 'james two']
	},
	{
		id: 'matthew',
		displayName: 'Matthew',
		photo: '/matthew.png',
		extras: ['matt', 'mathew', 'mat']
	},
	{
		id: 'noel',
		displayName: 'Noel Lee',
		photo: '/noel.png',
		tags: ['#newface', '#stonybrook'],
		extras: ['nl', 'noellee']
	},
	{
		id: 'sunghoon',
		displayName: 'Sunghoon Elder Ahn',
		photo: '/sunghoon_elder_ahn.png',
		tags: ['#bestdad', '#appa'],
		extras: [
			'elder',
			'elder ahn',
			'sung hoon',
			'sunghoon ahn',
			'sunghoonelderahn',
			'sha',
			'sea',
			'sa'
		]
	},
	{
		id: 'yongjin',
		displayName: 'Yongjin Lee',
		photo: '/yongjin.png',
		tags: ['#yj', '#dictador', '#kccmbappe'],
		extras: ['yj', 'yjl', 'yong', 'yong jin', 'yjlee', 'yongjinlee']
	}
];

export function normalizeName(raw: string): string {
	return raw
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/[_./\\-]+/g, ' ')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function compactName(raw: string): string {
	return normalizeName(raw).replace(/\s+/g, '');
}

function keysFor(alias: string): string[] {
	const n = normalizeName(alias);
	if (!n) return [];
	const c = compactName(alias);
	return n === c ? [n] : [n, c];
}

function aliasesFor(seed: Seed): string[] {
	const n = normalizeName(seed.displayName);
	const parts = n.split(' ').filter(Boolean);
	const first = parts[0] ?? '';
	const last = parts.length > 1 ? (parts.at(-1) ?? '') : '';
	const out = new Set<string>([n, compactName(n)]);

	if (seed.claimFirst !== false && first) out.add(first);
	if (first && last) {
		out.add(`${first} ${last}`);
		out.add(`${first[0]}${last[0]}`);
	}

	out.add(normalizeName(seed.id.replaceAll('_', ' ')));
	out.add(compactName(seed.id));

	for (const extra of seed.extras ?? []) {
		const e = normalizeName(extra);
		if (e) out.add(e);
	}

	return [...out].filter(Boolean);
}

export const PROFILES: Profile[] = SEEDS.map((seed) => {
	const parts = seed.displayName.split(/\s+/);
	return {
		id: seed.id,
		displayName: seed.displayName,
		shortName: seed.shortName ?? parts[0] ?? seed.displayName,
		photo: seed.photo,
		aliases: aliasesFor(seed),
		tags: seed.tags ?? []
	};
});

const INDEX = new Map<string, Profile>();
const BY_ID = new Map<string, Profile>();

for (const profile of PROFILES) {
	BY_ID.set(profile.id, profile);
	for (const alias of profile.aliases) {
		for (const key of keysFor(alias)) {
			const prior = INDEX.get(key);
			if (prior && prior.id !== profile.id) {
				throw new Error(`Profile alias "${key}" on ${profile.id} collides with ${prior.id}`);
			}
			INDEX.set(key, profile);
		}
	}
}

const JAMES_KIM = BY_ID.get('james_kim')!;
const JAMES_TU = BY_ID.get('james_tu')!;
const JAMES_TU_TOKENS = new Set(['2', 'tu', 'two', 'jt', 'j2', 'jtu']);

function looksLikeJames(tokens: string[], compact: string): boolean {
	return (
		tokens.includes('james') ||
		tokens.includes('jk') ||
		compact.startsWith('james') ||
		compact.startsWith('jkim')
	);
}

function looksLikeJamesTu(tokens: string[], compact: string): boolean {
	if (tokens.some((token) => JAMES_TU_TOKENS.has(token))) return true;
	if (tokens.some((token) => /^(?:2|two|tu)\w*/.test(token))) return true;
	if (/james(?:2|tu|two)/.test(compact)) return true;
	if (compact.includes('2') && looksLikeJames(tokens, compact)) return true;
	return false;
}

function looseMatch(tokens: string[], compact: string): Profile | null {
	let best: { profile: Profile; score: number } | null = null;

	for (const profile of PROFILES) {
		if (profile.id === 'james_kim' || profile.id === 'james_tu') continue;

		for (const alias of profile.aliases) {
			for (const key of keysFor(alias)) {
				if (key.length < 2) continue;

				let score = 0;
				if (tokens.includes(key)) {
					score = 1000 + key.length;
				} else if (key.length >= 4 && compact.startsWith(key)) {
					score = 500 + key.length;
				} else if (key.length >= 4 && tokens.some((token) => token.startsWith(key))) {
					score = 300 + key.length;
				}

				if (score > 0 && (!best || score > best.score)) {
					best = { profile, score };
				}
			}
		}
	}

	return best?.profile ?? null;
}

export function matchProfile(raw: string): Profile | null {
	const n = normalizeName(raw);
	if (!n) return null;
	const c = compactName(raw);
	const exact = INDEX.get(n) ?? INDEX.get(c);
	if (exact) return exact;

	const tokens = n.split(' ').filter(Boolean);
	if (looksLikeJames(tokens, c)) {
		return looksLikeJamesTu(tokens, c) ? JAMES_TU : JAMES_KIM;
	}

	return looseMatch(tokens, c);
}
