<script lang="ts">
	import { PROFILES } from '$lib/game/profiles';
	import Face from './Face.svelte';

	let { activeId = null }: { activeId?: string | null } = $props();
</script>

<ul class="roster">
	{#each PROFILES as person (person.id)}
		<li class:me={person.id === activeId}>
			<Face name={person.displayName} profile={person} size={56} />
			<span class="nm">{person.shortName}</span>
		</li>
	{/each}
</ul>

<style>
	.roster {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px 6px;
		margin: 0;
		padding: 4px 0 8px;
		list-style: none;
	}

	li {
		display: grid;
		justify-items: center;
		gap: 6px;
		min-width: 0;
	}

	.nm {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--muted);
	}

	li.me .nm {
		color: var(--accent);
	}

	li.me :global(.face) {
		box-shadow:
			0 0 0 3px var(--bg),
			0 0 0 5px var(--accent);
	}
</style>
