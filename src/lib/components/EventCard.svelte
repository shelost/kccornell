<script lang="ts">
	import type { EventItem } from '$lib/data';

	interface Props {
		event: EventItem;
	}

	let { event }: Props = $props();
</script>

<article class="card event">
	<div class="meta">
		<span class="chip {event.color}">{event.tag}</span>
		<span class="date">{event.date}</span>
	</div>
	<h3 class="h3">{event.title}</h3>
	<p class="body">{event.description}</p>
	<p class="where">{event.time} · {event.location}</p>
</article>

<style>
	.event {
		display: grid;
		gap: 12px;
		align-content: start;
	}

	.meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.date {
		font-size: 0.88rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--ink);
	}

	.body {
		color: var(--ink-soft);
		font-size: 0.97rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.where {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--muted);
	}
</style>
