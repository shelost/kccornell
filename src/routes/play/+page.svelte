<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import NameStep from '$lib/game/components/NameStep.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { normalizeCode } from '$lib/game/ids';
	import { rise } from '$lib/game/motion';
	import { CODE_LENGTH } from '$lib/game/types';

	const game = getSession();
	let name = $state(game.rememberedName());
	let code = $state('');
	let step = $state<'name' | 'room'>('name');

	const codeReady = $derived(normalizeCode(code).length === CODE_LENGTH);

	async function create() {
		if (game.busy) return;
		try {
			const room = await game.create(name);
			await goto(resolve('/play/[code]', { code: room }));
		} catch {
			/* error is shown from session */
		}
	}

	async function join(event: SubmitEvent) {
		event.preventDefault();
		if (!codeReady || game.busy) return;
		await game.join(normalizeCode(code), name);
		if (game.room) await goto(resolve('/play/[code]', { code: game.room.code }));
	}
</script>

<div class="home">
	{#if step === 'name'}
		<div class="stage">
			<NameStep
				bind:value={name}
				cta="Continue"
				onSubmit={() => {
					game.saveName(name);
					step = 'room';
				}}
			/>
		</div>
	{:else}
		<div class="stage" {@attach rise()}>
			<h1 class="title">
				Welcome, {name.trim()}!
				<button class="edit" type="button" onclick={() => (step = 'name')}>edit</button>
			</h1>
			<form class="stack" onsubmit={join}>
				<input
					class="field code"
					bind:value={code}
					maxlength={CODE_LENGTH}
					placeholder="CODE"
					aria-label="Room code"
					autocapitalize="characters"
					autocomplete="off"
					enterkeyhint="go"
					oninput={() => (code = normalizeCode(code))}
				/>
				<button class="btn accent" type="submit" disabled={!codeReady || game.busy}>Join</button>
			</form>
		</div>
	{/if}

	{#if game.error}
		<p class="warn">{game.error}</p>
	{/if}
	{#if game.kind === 'local'}
		<p class="muted note">
			Same-device mode — rooms only sync between tabs of this browser until Supabase is connected.
		</p>
	{/if}
	{#if step === 'room'}
		<button class="create" type="button" disabled={game.busy} onclick={create}>Create a room</button>
		<a class="create" href={resolve('/charades')}>Charades</a>
	{/if}
</div>

<style>
	.home {
		min-height: calc(100dvh - 48px);
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 18px;
	}

	.stage {
		flex: 1;
		display: grid;
		align-content: center;
		gap: 28px;
	}

	.edit {
		display: block;
		margin: 10px auto 0;
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0;
	}

	.code {
		min-height: 92px;
		font-size: clamp(2.4rem, 12vw, 3.2rem);
		letter-spacing: 0.42em;
		text-transform: uppercase;
	}

	.note {
		font-size: 0.82rem;
	}

	.create {
		align-self: center;
		margin-top: auto;
		padding: 8px;
		color: var(--muted);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.create:disabled {
		opacity: 0.5;
	}
</style>
