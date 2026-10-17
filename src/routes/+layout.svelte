<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { site } from '$lib/data';

	let { children } = $props();
	const isPlay = $derived(page.url.pathname.startsWith('/play'));

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content={site.description} />
</svelte:head>

{#if !isPlay}
	<Nav />
{/if}

<main class:is-play={isPlay}>
	{@render children()}
</main>

{#if !isPlay}
	<Footer />
{/if}

<style>
	main {
		padding-top: 64px;
		min-height: 100dvh;
	}

	main.is-play {
		padding-top: 0;
		height: 100dvh;
		max-height: 100dvh;
		overflow: hidden;
	}
</style>
