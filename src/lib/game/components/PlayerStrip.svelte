<script lang="ts">
	import { flip } from 'svelte/animate';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { pop } from '$lib/game/motion';
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

<div class="strip" aria-label="Players">
	<ul>
		{#each ranked as player (player.id)}
			<li class:off={!player.connected} animate:flip={{ duration: 400 }}>
				<span class="face">
					{#if solved[player.id]}
						<span class="halo" aria-hidden="true" {@attach pop()}><span class="ring"></span></span>
					{/if}
					<span class="avatar" style:background={PLAYER_COLORS[player.color] ?? '#6a4cf5'}>
						{player.name.slice(0, 1).toUpperCase()}
					</span>
					{#if player.id === drawerId}
						<span class="badge" aria-label="drawing">✎</span>
					{/if}
				</span>
				<span class="nm" class:me={player.id === meId}>{player.name}</span>
				<strong class:good={solved[player.id]}>{scores[player.id] ?? 0}</strong>
			</li>
		{/each}
	</ul>
</div>

<style>
	.strip {
		overflow-x: auto;
		overflow-y: hidden;
		overscroll-behavior: contain;
		scrollbar-width: none;
		margin-inline: calc(-1 * var(--pad-x));
		padding-inline: var(--pad-x);
		flex-shrink: 0;
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	ul {
		display: flex;
		gap: 10px;
		width: max-content;
		margin: 0 auto;
		padding: 6px 2px 2px;
		list-style: none;
	}

	li {
		display: grid;
		justify-items: center;
		gap: 2px;
		width: 52px;
	}

	li.off {
		opacity: 0.45;
	}

	.face {
		position: relative;
		display: grid;
		place-items: center;
	}

	.avatar {
		width: 36px;
		height: 36px;
		font-size: 0.9rem;
	}

	.halo {
		position: absolute;
		inset: -6px;
	}

	.ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: conic-gradient(var(--good), #9af2c9, var(--gold), #9af2c9, var(--good));
		-webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));
		mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px));
		animation: spin 1.4s linear infinite;
	}

	.badge {
		position: absolute;
		right: -4px;
		bottom: -4px;
		width: 20px;
		height: 20px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--bg);
		box-shadow: var(--raise-sm);
		font-size: 0.7rem;
	}

	.nm {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--muted);
	}

	.nm.me {
		color: var(--accent);
	}

	strong {
		font-size: 0.85rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	strong.good {
		color: var(--good);
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ring {
			animation: none;
		}
	}
</style>
