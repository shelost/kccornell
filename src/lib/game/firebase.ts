import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { env } from '$env/dynamic/public';

export type FirebaseServices = {
	app: FirebaseApp;
	auth: Auth;
	db: Database;
};

function readConfig() {
	return {
		apiKey: env.PUBLIC_FIREBASE_API_KEY ?? '',
		authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
		databaseURL: env.PUBLIC_FIREBASE_DATABASE_URL ?? '',
		projectId: env.PUBLIC_FIREBASE_PROJECT_ID ?? '',
		storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
		messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
		appId: env.PUBLIC_FIREBASE_APP_ID ?? ''
	};
}

export function isFirebaseConfigured(): boolean {
	const { apiKey, databaseURL, projectId } = readConfig();
	if (!apiKey || !databaseURL || !projectId) return false;
	if (apiKey.startsWith('YOUR_')) return false;
	if (projectId.startsWith('YOUR_')) return false;
	return true;
}

let cached: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices {
	if (cached) return cached;
	if (!isFirebaseConfigured()) {
		throw new Error('Firebase is not configured');
	}
	const existing = getApps()[0];
	const app = existing ?? initializeApp(readConfig());
	cached = {
		app,
		auth: getAuth(app),
		db: getDatabase(app)
	};
	return cached;
}

export async function ensureAnonUser(): Promise<string> {
	const { auth } = getFirebase();
	if (auth.currentUser) return auth.currentUser.uid;
	const cred = await signInAnonymously(auth);
	return cred.user.uid;
}
