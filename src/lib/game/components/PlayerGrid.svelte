<script lang="ts">
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { staggerChildren } from '$lib/game/motion';
	import type { Player } from '$lib/game/types';

	let {
		players,
		hostId,
		meId,
		selectable = false,
		selectedId = null,
		onSelect
	}: {
		players: Player[];
		hostId: string;
		meId: string;
		selectable?: boolean;
		selectedId?: string | null;
		onSelect?: (id: string) => void;
	} = $props();
</script>

<div class="players" {@attach staggerChildren('.player', 0.035)}>
	{#each players as player (player.id)}
		{#if selectable}
			<button
				class="player"
				class:host={player.id === hostId}
				class:me={player.id === meId}
				class:on={selectedId === player.id}
				class:off={!player.connected}
				onclick={() => onSelect?.(player.id)}
				type="button"
			>
				<span class="av" style:background={PLAYER_COLORS[player.color] ?? '#5a21d6'}>
					{player.name.slice(0, 1).toUpperCase()}
				</span>
				<span class="nm">{player.name}</span>
				{#if player.id === hostId}<span class="tag">host</span>{/if}
			</button>
		{:else}
			<div
				class="player"
				class:host={player.id === hostId}
				class:me={player.id === meId}
				class:off={!player.connected}
			>
				<span class="av" style:background={PLAYER_COLORS[player.color] ?? '#5a21d6'}>
					{player.name.slice(0, 1).toUpperCase()}
				</span>
				<span class="nm">{player.name}</span>
				{#if player.id === hostId}<span class="tag">host</span>{/if}
				{#if player.ready}<span class="tag">ready</span>{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.player {
		position: relative;
	}

	.player.off {
		opacity: 0.45;
	}

	.player.me .nm {
		color: var(--accent);
	}

	.player.on {
		border-color: var(--danger);
		background: color-mix(in srgb, var(--danger) 8%, white);
	}

	.tag {
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--gold);
	}
</style>
