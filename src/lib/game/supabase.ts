import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

function readConfig() {
	return {
		url: env.PUBLIC_SUPABASE_URL ?? '',
		key: env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
	};
}

export function isSupabaseConfigured(): boolean {
	const { url, key } = readConfig();
	if (!url.startsWith('https://') || url.includes('YOUR_')) return false;
	return key.length > 0 && !key.startsWith('YOUR_');
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (client) return client;
	if (!isSupabaseConfigured()) {
		throw new Error('Supabase is not configured');
	}
	const { url, key } = readConfig();
	client = createClient(url, key);
	return client;
}

export async function ensureAnonUser(): Promise<string> {
	const supabase = getSupabase();
	const { data } = await supabase.auth.getSession();
	if (data.session) return data.session.user.id;
	const { data: signedIn, error } = await supabase.auth.signInAnonymously();
	if (error || !signedIn.user) {
		throw new Error(
			/anonymous/i.test(error?.message ?? '')
				? 'Turn on anonymous sign-ins in Supabase → Authentication → Sign In / Providers.'
				: (error?.message ?? 'Could not sign in')
		);
	}
	return signedIn.user.id;
}
