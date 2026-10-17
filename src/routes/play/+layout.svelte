<script lang="ts">
	import '$lib/game/play.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Imposter · KCC</title>
	<meta name="theme-color" content="#f3eee6" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Nunito:wght@600;700;800&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="play-root">
	<div class="play-bg" aria-hidden="true">
		<span class="c1"></span>
		<span class="c2"></span>
		<span class="c3"></span>
	</div>
	<div class="play-frame">
		{@render children()}
	</div>
</div>
