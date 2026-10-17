<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import CountUp from './CountUp.svelte';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { pop, staggerChildren } from '$lib/game/motion';
	import { rankByScore } from '$lib/game/sketch';
	import type { Player } from '$lib/game/types';

	let {
		players,
		scores,
		gained = {},
		meId,
		drawerId = null,
		limit = 5
	}: {
		players: Player[];
		scores: Record<string, number>;
		/** Points from the turn that just ended: the board opens on the old standings, then re-ranks. */
		gained?: Record<string, number>;
		meId: string;
		drawerId?: string | null;
		limit?: number;
	} = $props();

	let settled = $state(false);

	const shown = $derived.by((): Record<string, number> => {
		if (settled) return scores;
		return Object.fromEntries(
			players.map((player) => [player.id, (scores[player.id] ?? 0) - (gained[player.id] ?? 0)])
		);
	});
	const ranked = $derived(rankByScore(players, shown));
	const top = $derived(ranked.slice(0, limit));
	const mine = $derived(ranked.findIndex((player) => player.id === meId));
	const extra = $derived(mine >= limit ? (ranked[mine] ?? null) : null);
	const best = $derived(Math.max(1, ...ranked.map((player) => shown[player.id] ?? 0)));
	const status = $derived.by(() => {
		if (!settled || mine < 0) return '';
		const score = shown[meId] ?? 0;
		const ahead = ranked.filter((player) => (shown[player.id] ?? 0) > score);
		const next = ahead[ahead.length - 1];
		if (next) {
			return `You’re ${ordinal(ahead.length + 1)} · ${(shown[next.id] ?? 0) - score} behind ${next.name}`;
		}
		if (score === 0) return '';
		const tied = ranked.some((player) => player.id !== meId && (shown[player.id] ?? 0) === score);
		return tied ? 'Tied for 1st place' : 'You’re in 1st place';
	});

	function place(id: string): number {
		const score = shown[id] ?? 0;
		return 1 + ranked.filter((player) => (shown[player.id] ?? 0) > score).length;
	}

	function ordinal(n: number): string {
		const tens = n % 100;
		if (tens >= 11 && tens <= 13) return `${n}th`;
		return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
	}

	onMount(() => {
		if (prefersReducedMotion.current) {
			settled = true;
			return;
		}
		const timer = setTimeout(() => (settled = true), 900);
		return () => clearTimeout(timer);
	});
</script>

{#snippet line(player: Player)}
	{@const score = shown[player.id] ?? 0}
	{@const gain = gained[player.id] ?? 0}
	<span class="bar" style:transform="scaleX({score / best})"></span>
	<span class="rank">{place(player.id)}</span>
	<span class="avatar" style:background={PLAYER_COLORS[player.color] ?? '#6a4cf5'}>
		{player.name.slice(0, 1).toUpperCase()}
	</span>
	<span class="name">{player.name}</span>
	{#if player.id === drawerId}
		<span class="tag" aria-label="drew this turn">✎</span>
	{/if}
	{#if settled && gain > 0}
		<span class="gain" {@attach pop()}>+{gain}</span>
	{/if}
	<strong class="score"><CountUp value={score} /></strong>
{/snippet}

<div class="scoreboard" {@attach staggerChildren('li', 0.05)}>
	<ol>
		{#each top as player (player.id)}
			<li
				class:me={player.id === meId}
				class:lead={place(player.id) === 1 && (shown[player.id] ?? 0) > 0}
				class:off={!player.connected}
				animate:flip={{ duration: prefersReducedMotion.current ? 0 : 650, easing: cubicOut }}
			>
				{@render line(player)}
			</li>
		{/each}
	</ol>
	{#if extra}
		<p class="more" aria-hidden="true">⋯</p>
		<ol>
			<li class="me" class:off={!extra.connected}>{@render line(extra)}</li>
		</ol>
	{/if}
	{#if status}
		<p class="status" {@attach pop()}>{status}</p>
	{/if}
</div>

<style>
	.scoreboard {
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		padding: 6px 8px 10px;
	}

	.scoreboard::-webkit-scrollbar {
		display: none;
	}

	ol {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 54px;
		padding: 8px 14px 8px 10px;
		border-radius: 18px;
		background: var(--bg);
		box-shadow: var(--raise-sm);
		text-align: left;
	}

	li.me {
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent),
			var(--raise-sm);
	}

	li.off {
		opacity: 0.5;
	}

	.bar {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: color-mix(in srgb, var(--accent) 11%, transparent);
		transform-origin: left center;
		transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
	}

	li.lead .bar {
		background: color-mix(in srgb, var(--gold) 22%, transparent);
	}

	.rank {
		flex: none;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		box-shadow: var(--press-sm);
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	li.lead .rank {
		background: var(--gold);
		box-shadow: none;
		color: #fff;
	}

	.avatar {
		flex: none;
		width: 34px;
		height: 34px;
		font-size: 0.85rem;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 800;
	}

	li.me .name {
		color: var(--accent);
	}

	.tag {
		flex: none;
		color: var(--muted);
		font-weight: 900;
	}

	.gain {
		flex: none;
		padding: 3px 8px;
		border-radius: 999px;
		background: var(--good);
		color: #fff;
		font-size: 0.75rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.score {
		flex: none;
		min-width: 3ch;
		text-align: right;
		font-size: 1.1rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.more {
		margin: 6px 0;
		color: var(--muted);
		font-weight: 900;
		line-height: 1;
	}

	.status {
		margin-top: 12px;
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 800;
		text-wrap: balance;
	}

	@media (prefers-reduced-motion: reduce) {
		.bar {
			transition: none;
		}
	}
</style>
