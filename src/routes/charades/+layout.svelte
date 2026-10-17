<script lang="ts">
	import '$lib/game/play.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Charades · KCC</title>
	<meta name="theme-color" content="#e7ebf2" />
	<link
		href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="play-root">
	<div class="play-frame">
		{@render children()}
	</div>
</div>
