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

{#snippet face(player: Player)}
	<span
		class="avatar"
		class:host={player.id === hostId}
		style:background={PLAYER_COLORS[player.color] ?? '#6a4cf5'}
	>
		{player.name.slice(0, 1).toUpperCase()}
	</span>
	<span class="nm" class:me={player.id === meId}>{player.name}</span>
	{#if player.ready}<span class="tag">ready</span>{/if}
{/snippet}

<div class="players" {@attach staggerChildren('.player', 0.035)}>
	{#each players as player (player.id)}
		{#if selectable}
			<button
				class="player pick"
				class:on={selectedId === player.id}
				class:off={!player.connected}
				type="button"
				onclick={() => onSelect?.(player.id)}
			>
				{@render face(player)}
			</button>
		{:else}
			<div class="player" class:off={!player.connected}>
				{@render face(player)}
			</div>
		{/if}
	{/each}
</div>

<style>
	.players {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14px;
	}

	.player {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 6px;
		width: 84px;
		padding: 10px 4px;
		border-radius: 22px;
	}

	.player.pick {
		box-shadow: var(--raise-sm);
		transition: box-shadow 0.15s ease;
	}

	.player.pick.on {
		box-shadow: var(--press);
	}

	.player.pick.on .avatar {
		box-shadow: 0 0 0 3px var(--bg), 0 0 0 6px var(--danger);
	}

	.player.off {
		opacity: 0.45;
	}

	.avatar.host {
		box-shadow:
			0 0 0 3px var(--bg),
			0 0 0 5px var(--gold);
	}

	.nm {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 800;
	}

	.nm.me {
		color: var(--accent);
	}

	.tag {
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--good);
	}
</style>
