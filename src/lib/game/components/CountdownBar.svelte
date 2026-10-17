<script lang="ts">
	let {
		endsAt = null,
		pausedMs = null,
		totalMs
	}: { endsAt?: number | null; pausedMs?: number | null; totalMs: number } = $props();

	let now = $state(Date.now());

	const paused = $derived(pausedMs != null && !endsAt);
	const remaining = $derived(paused ? (pausedMs ?? 0) : endsAt ? Math.max(0, endsAt - now) : 0);
	const fraction = $derived(Math.min(1, remaining / Math.max(totalMs, remaining, 1)));
	const seconds = $derived(Math.ceil(remaining / 1000));
	const clock = $derived(`${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`);
	const urgent = $derived(!paused && remaining > 0 && remaining <= 10_000);

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 250);
		return () => clearInterval(id);
	});
</script>

<div class="countdown" class:urgent class:paused role="timer" aria-label="{seconds} seconds left">
	<div class="track">
		<div class="fill" style:transform="scaleX({fraction})"></div>
	</div>
	<span class="secs">{paused ? 'Paused' : clock}</span>
</div>

<style>
	.countdown {
		position: sticky;
		top: 0;
		z-index: 20;
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 12px;
		margin: calc(-16px - env(safe-area-inset-top)) calc(-1 * var(--pad-x)) 6px;
		padding: calc(14px + env(safe-area-inset-top)) var(--pad-x) 10px;
		background: var(--bg);
	}

	.track {
		height: 16px;
		padding: 3px;
		border-radius: 999px;
		box-shadow: var(--press-sm);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--accent), var(--accent-2));
		transform-origin: left center;
		transition: transform 0.25s linear;
	}

	.urgent .fill {
		background: linear-gradient(90deg, var(--danger), #ff9a7a);
	}

	.paused .fill {
		opacity: 0.45;
	}

	.secs {
		min-width: 3.4em;
		text-align: right;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.urgent .secs {
		color: var(--danger);
	}
</style>
