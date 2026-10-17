<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import GameBoard from '$lib/game/components/GameBoard.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { normalizeCode } from '$lib/game/ids';
	import { rise } from '$lib/game/motion';

	let { params }: { params: { code: string } } = $props();
	const game = getSession();
	let name = $state(game.rememberedName());
	let joining = $state(false);

	const code = $derived(normalizeCode(params.code));
	const inRoom = $derived(game.room?.code === code);

	async function enter() {
		if (name.trim().length < 2 || game.busy) return;
		joining = true;
		await game.join(code, name.trim());
		joining = false;
		if (!game.room) return;
	}

	onMount(() => {
		if (inRoom) return;
		const remembered = game.rememberedName();
		if (remembered) {
			name = remembered;
			void game.join(code, remembered);
		}
	});
</script>

{#if inRoom}
	<GameBoard />
{:else}
	<div class="gate" {@attach rise()}>
		<p class="play-kicker">Join {code || 'room'}</p>
		<h1 class="play-title">What’s your name?</h1>
		<form
			class="play-card stack"
			onsubmit={(e) => {
				e.preventDefault();
				void enter();
			}}
		>
			<input class="play-input" bind:value={name} maxlength="18" placeholder="Your name" />
			<button class="play-btn accent" type="submit" disabled={name.trim().length < 2 || game.busy}>
				{joining || game.busy ? 'Joining…' : 'Sit down'}
			</button>
			{#if game.error}
				<p class="warn">{game.error}</p>
			{/if}
		</form>
		<button class="play-btn ghost" type="button" onclick={() => goto(resolve('/play'))}>Back</button>
	</div>
{/if}

<style>
	.gate,
	.stack {
		display: grid;
		gap: 14px;
	}
</style>
