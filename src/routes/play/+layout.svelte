<script lang="ts">
	import '$lib/game/play.css';
	import { onDestroy } from 'svelte';
	import { pinKeyboard } from '$lib/game/keyboard';
	import { GameSession, setSession } from '$lib/game/session.svelte';

	let { children } = $props();

	const session = setSession(new GameSession());
	onDestroy(() => session.detach());
</script>

<svelte:head>
	<title>Play · KCC</title>
	<meta name="theme-color" content="#e7ebf2" />
	<link
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="play-root" {@attach pinKeyboard()}>
	<div class="play-frame">
		{@render children()}
	</div>
</div>
