<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import GameBoard from '$lib/game/components/GameBoard.svelte';
	import NameStep from '$lib/game/components/NameStep.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { normalizeCode } from '$lib/game/ids';
	import { rise } from '$lib/game/motion';

	let { params }: { params: { code: string } } = $props();
	const game = getSession();
	let name = $state(game.rememberedName());
	let status = $state<'checking' | 'joined' | 'join' | 'missing' | 'error'>('checking');
	let problem = $state('');

	const code = $derived(normalizeCode(params.code));
	const inRoom = $derived(game.room?.code === code && Boolean(game.me));

	onMount(() => {
		if (inRoom) {
			status = 'join';
			return;
		}
		void game.resume(code).then((result) => {
			problem = game.error;
			status = result;
		});
	});
</script>

{#if inRoom}
	<GameBoard />
{:else if status === 'checking' || status === 'joined'}
	<p class="muted gate">Finding room {code}…</p>
{:else if status === 'join'}
	<div class="gate">
		<p class="label">Room {code}</p>
		<NameStep bind:value={name} cta="Join" busy={game.busy} onSubmit={() => game.join(code, name)} />
		{#if game.error}
			<p class="warn">{game.error}</p>
		{/if}
		<a class="muted" href={resolve('/play')}>Back</a>
	</div>
{:else}
	<div class="gate" {@attach rise()}>
		<p class="label">Room {code}</p>
		<h1 class="title">{status === 'missing' ? 'Room not found' : 'Can’t connect'}</h1>
		<p class="muted">
			{status === 'missing' ? 'It may have ended, or the code is off by a letter.' : problem}
		</p>
		<a class="btn accent" href={resolve('/play')}>Enter a code</a>
	</div>
{/if}

<style>
	.gate {
		min-height: calc(100dvh - 48px);
		display: grid;
		align-content: center;
		gap: 20px;
	}
</style>
