<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import NameStep from '$lib/game/components/NameStep.svelte';
	import { getSession } from '$lib/game/session.svelte';

	const game = getSession();
	let name = $state(game.rememberedName());
	let started = $state(false);

	async function createRoom(from: string) {
		if (game.busy) return;
		try {
			const room = await game.create(from);
			await goto(resolve('/play/[code]', { code: room }));
		} catch {
			/* session surfaces the error */
		}
	}

	$effect(() => {
		const code = game.room?.code;
		if (!code) return;
		void goto(resolve('/play/[code]', { code }));
	});

	onMount(() => {
		const cached = game.rememberedName().trim();
		if (cached.length >= 2) {
			name = cached;
			started = true;
			void createRoom(cached);
		}
	});
</script>

<a class="exit-game" href={resolve('/play')}>Exit</a>

{#if started}
	<div class="stage">
		<p class="label">Create a room</p>
		<h1 class="title">{game.error ? 'Couldn’t open a room' : 'Opening a room…'}</h1>
		{#if game.error}
			<p class="warn">{game.error}</p>
			<button class="btn accent" type="button" onclick={() => createRoom(name)}>Try again</button>
		{/if}
	</div>
{:else}
	<div class="stage">
		<NameStep
			bind:value={name}
			cta="Create room"
			busy={game.busy}
			onSubmit={() => {
				game.saveName(name);
				started = true;
				void createRoom(name);
			}}
		/>
		{#if game.error}
			<p class="warn">{game.error}</p>
		{/if}
	</div>
{/if}

<style>
	.stage {
		flex: 1;
		display: grid;
		align-content: center;
		gap: 22px;
		background: var(--bg);
		color: var(--ink);
	}
</style>
