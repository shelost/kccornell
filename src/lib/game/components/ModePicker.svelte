<script lang="ts">
	import { GAMES, type GameMode } from '$lib/game/types';

	let { value, onPick }: { value: GameMode; onPick: (mode: GameMode) => void } = $props();

	const modes = Object.keys(GAMES) as GameMode[];
</script>

<div class="seg neu-in">
	{#each modes as mode (mode)}
		<button class="opt" class:on={value === mode} type="button" onclick={() => onPick(mode)}>
			<strong>{GAMES[mode].label}</strong>
			<span>{GAMES[mode].blurb}</span>
		</button>
	{/each}
</div>

<style>
	.seg {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 8px;
	}

	.opt {
		display: grid;
		gap: 2px;
		padding: 14px 10px;
		border-radius: 18px;
		color: var(--muted);
		transition:
			box-shadow 0.15s ease,
			color 0.15s ease;
	}

	.opt.on {
		box-shadow: var(--raise-sm);
		color: var(--ink);
	}

	.opt.on strong {
		color: var(--accent);
	}

	strong {
		font-size: 1.08rem;
		font-weight: 900;
	}

	span {
		font-size: 0.78rem;
		font-weight: 700;
	}
</style>
