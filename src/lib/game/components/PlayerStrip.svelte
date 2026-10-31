<script lang="ts">
	import { flip } from 'svelte/animate';
	import { pop } from '$lib/game/motion';
	import Face from './Face.svelte';
	import { rankByScore } from '$lib/game/sketch';
	import type { Player } from '$lib/game/types';

	let {
		players,
		scores,
		meId,
		drawerId = null,
		solved = {},
		lives = null
	}: {
		players: Player[];
		scores: Record<string, number>;
		meId: string;
		drawerId?: string | null;
		solved?: Record<string, boolean>;
		lives?: Record<string, number> | null;
	} = $props();

	const ranked = $derived(rankByScore(players, scores));
</script>

<div class="strip" aria-label="Players">
	<ul>
		{#each ranked as player (player.id)}
			<li
				class:off={!player.connected || (lives != null && (lives[player.id] ?? 0) <= 0)}
				animate:flip={{ duration: 400 }}
			>
				<span class="face">
					{#if solved[player.id] || player.id === drawerId}
						<span class="halo" aria-hidden="true" {@attach pop()}><span class="ring"></span></span>
					{/if}
					<Face name={player.name} color={player.color} size={36} />
					{#if player.id === drawerId}
						<span class="badge" aria-label={lives ? 'their turn' : 'drawing'}>{lives ? '•' : '✎'}</span>
					{/if}
				</span>
				<span class="nm" class:me={player.id === meId}>{player.name}</span>
				{#if lives}
					<span class="hearts" aria-label="{(lives[player.id] ?? 0) + ' hearts'}">
						{'♥'.repeat(Math.max(0, lives[player.id] ?? 0)) || '–'}
					</span>
				{:else}
					<strong class:good={solved[player.id]}>{scores[player.id] ?? 0}</strong>
				{/if}
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

	.hearts {
		color: var(--danger);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		line-height: 1;
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
