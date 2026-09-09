<script lang="ts">
	import { reveal } from '$lib/reveal';
	import { site, events } from '$lib/data';
	import EventCard from '$lib/components/EventCard.svelte';
</script>

<svelte:head>
	<title>Events — {site.fullName}</title>
</svelte:head>

<section class="section page-hero">
	<div class="container">
		<span class="chip purple" {@attach reveal()}>This semester</span>
		<h1 class="display" {@attach reveal({ delay: 90 })}>Things worth<br />showing up for.</h1>
		<p class="lead intro" {@attach reveal({ delay: 180 })}>
			Retreats, potlucks, serve days, and worship nights — everything happening at {site.name} this
			semester, all in one place.
		</p>
	</div>
</section>

<section class="section list">
	<div class="container">
		<div class="grid">
			{#each events as event, i (event.title)}
				<div {@attach reveal({ delay: (i % 2) * 90 })}>
					<EventCard {event} />
				</div>
			{/each}
		</div>
		<p class="hint" {@attach reveal()}>
			Questions about an event? <a href="/contact">Reach out</a> — we'll get you the details.
		</p>
	</div>
</section>

<style>
	.page-hero {
		padding-block: clamp(70px, 13vw, 120px) 0;
	}

	.page-hero .container {
		display: grid;
		gap: 22px;
		justify-items: start;
	}

	.intro {
		max-width: 600px;
	}

	.list {
		padding-top: clamp(40px, 8vw, 72px);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 18px;
	}

	.hint {
		margin-top: clamp(32px, 6vw, 48px);
		color: var(--muted);
		font-size: 0.95rem;
	}

	.hint a {
		color: var(--purple);
		font-weight: 700;
	}

	@media (max-width: 760px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
