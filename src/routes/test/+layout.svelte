<script lang="ts">
	import '$lib/game/play.css';
	import Portrait from '$lib/game/components/Portrait.svelte';
	import { pinKeyboard } from '$lib/game/keyboard';

	let { children } = $props();
</script>

<svelte:head>
	<title>Profile test · KCC</title>
	<meta name="theme-color" content="#000000" />
	<link
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="play-root scrollable" {@attach pinKeyboard()}>
	<div class="play-frame">
		{@render children()}
	</div>
	<Portrait />
</div>
