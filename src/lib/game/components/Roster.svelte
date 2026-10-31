<script lang="ts">
	import { matchProfile } from '$lib/game/profiles';
	import { portrait } from '$lib/game/portrait.svelte';
	import Face from './Face.svelte';

	let {
		people,
		meId = null
	}: {
		people: { id: string; name: string; color?: number }[];
		meId?: string | null;
	} = $props();
</script>

{#if people.length}
	<ul class="roster">
		{#each people as person (person.id)}
			{@const profile = matchProfile(person.name)}
			<li class:me={person.id === meId}>
				<button
					class="seat"
					type="button"
					aria-label={`View ${profile?.displayName ?? person.name}`}
					onclick={(event) =>
						portrait.show(
							{ id: person.id, name: person.name, color: person.color, profile },
							event.currentTarget
						)}
				>
					<Face name={person.name} color={person.color ?? 0} {profile} size={64} />
					<span class="nm">{profile?.shortName ?? person.name}</span>
				</button>
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted empty">Waiting for people to sign in…</p>
{/if}

<style>
	.roster {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14px 10px;
		margin: 0;
		padding: 8px 0 12px;
		list-style: none;
	}

	li {
		min-width: 0;
	}

	.seat {
		display: grid;
		justify-items: center;
		gap: 8px;
		width: 76px;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		cursor: pointer;
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

	.empty {
		padding: 12px 0 8px;
		font-size: 0.9rem;
	}
</style>
