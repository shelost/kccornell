<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getSession } from '$lib/game/session.svelte';
	import { normalizeCode } from '$lib/game/ids';
	import { rise, lettersIn } from '$lib/game/motion';
	import { MAX_PLAYERS } from '$lib/game/types';

	const game = getSession();
	let name = $state(game.rememberedName());
	let code = $state('');

	const canGo = $derived(name.trim().length >= 2);

	async function create() {
		if (!canGo || game.busy) return;
		try {
			const room = await game.create(name.trim());
			await goto(resolve('/play/[code]', { code: room }));
		} catch {
			/* error is shown from session */
		}
	}

	async function join() {
		if (!canGo || game.busy) return;
		const clean = normalizeCode(code);
		if (clean.length < 4) {
			game.error = 'Enter the 4-character code';
			return;
		}
		await game.join(clean, name.trim());
		if (game.room) await goto(resolve('/play/[code]', { code: game.room.code }));
	}
</script>

<div class="home">
	<p class="play-kicker" {@attach rise()}>KCC parlor game</p>
	<h1 class="play-title" {@attach lettersIn()}>
		{#each 'Imposter'.split('') as ch, i (i)}
			<span class="letter">{ch}</span>
		{/each}
	</h1>
	<p class="play-lead" {@attach rise(0.15)}>
		One of you doesn’t know the word. Talk, bluff, vote. The game master runs the clock.
	</p>

	<form class="play-card stack" onsubmit={(e) => e.preventDefault()}>
		<label>
			<span>Your name</span>
			<input class="play-input" bind:value={name} maxlength="18" placeholder="e.g. Heewon" />
		</label>
		<button class="play-btn accent" type="button" disabled={!canGo || game.busy} onclick={create}>
			Create a room
		</button>
		<div class="or">or join</div>
		<label>
			<span>Room code</span>
			<input
				class="play-input code-in"
				bind:value={code}
				maxlength="4"
				placeholder="XXXX"
				autocapitalize="characters"
				oninput={() => (code = normalizeCode(code))}
			/>
		</label>
		<button class="play-btn primary" type="button" disabled={!canGo || game.busy} onclick={join}>
			Join
		</button>
		{#if game.error}
			<p class="warn">{game.error}</p>
		{/if}
	</form>

	<p class="note">
		{game.kind === 'firebase'
			? `Live across phones · up to ${MAX_PLAYERS} players.`
			: `Same-device mode until Firebase keys are added. Open extra tabs to try it. Up to ${MAX_PLAYERS} players.`}
	</p>
	<p class="note"><a href={resolve('/')}>Back to KCC</a></p>
</div>

<style>
	.home {
		display: grid;
		gap: 16px;
		padding-top: 12px;
	}

	.letter {
		display: inline-block;
	}

	.stack {
		display: grid;
		gap: 12px;
	}

	label {
		display: grid;
		gap: 6px;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.or {
		text-align: center;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.code-in {
		letter-spacing: 0.28em;
		text-transform: uppercase;
		text-align: center;
		font-family: var(--play-display);
		font-size: 1.4rem;
	}
</style>
