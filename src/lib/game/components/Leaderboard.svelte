<script lang="ts">
	import { flip } from 'svelte/animate';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { staggerChildren } from '$lib/game/motion';
	import { rankByScore } from '$lib/game/sketch';
	import type { Player } from '$lib/game/types';

	let {
		players,
		scores,
		meId,
		drawerId = null,
		solved = {}
	}: {
		players: Player[];
		scores: Record<string, number>;
		meId: string;
		drawerId?: string | null;
		solved?: Record<string, boolean>;
	} = $props();

	const ranked = $derived(rankByScore(players, scores));
</script>

<ol class="board neu-in" {@attach staggerChildren('li', 0.04)}>
	{#each ranked as player, i (player.id)}
		<li
			class:me={player.id === meId}
			class:solved={solved[player.id]}
			class:off={!player.connected}
			animate:flip={{ duration: 450 }}
		>
			<span class="rank">{i + 1}</span>
			<span class="dot" style:background={PLAYER_COLORS[player.color] ?? '#6a4cf5'}>
				{player.name.slice(0, 1).toUpperCase()}
			</span>
			<span class="nm">{player.name}</span>
			<span class="tag">
				{#if player.id === drawerId}✎{:else if solved[player.id]}✓{/if}
			</span>
			<strong>{scores[player.id] ?? 0}</strong>
		</li>
	{/each}
</ol>

<style>
	.board {
		list-style: none;
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 10px;
	}

	li {
		display: grid;
		grid-template-columns: 1.4rem 30px 1fr auto auto;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border-radius: 16px;
		text-align: left;
	}

	li.me {
		box-shadow: var(--raise-sm);
	}

	li.off {
		opacity: 0.45;
	}

	.rank {
		color: var(--muted);
		font-weight: 900;
	}

	.dot {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 0.8rem;
		font-weight: 900;
	}

	.nm {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 800;
	}

	.tag {
		color: var(--good);
		font-weight: 900;
	}

	strong {
		font-size: 1.1rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	li.solved strong {
		color: var(--good);
	}
</style>
