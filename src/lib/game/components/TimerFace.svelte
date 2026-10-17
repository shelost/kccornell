<script lang="ts">
	import { pop } from '$lib/game/motion';

	let { endsAt, pausedMs }: { endsAt?: number | null; pausedMs?: number | null } = $props();

	let now = $state(Date.now());

	const remaining = $derived.by(() => {
		if (pausedMs != null && !endsAt) return pausedMs;
		if (!endsAt) return 0;
		return Math.max(0, endsAt - now);
	});
	const label = $derived.by(() => {
		const total = Math.ceil(remaining / 1000);
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});
	const urgent = $derived(remaining > 0 && remaining <= 10_000);

	$effect(() => {
		const id = setInterval(() => {
			now = Date.now();
		}, 200);
		return () => clearInterval(id);
	});
</script>

<div class="face" class:urgent class:paused={pausedMs != null && !endsAt} {@attach pop()}>
	<span class="time">{label}</span>
	<span class="sub">{pausedMs != null && !endsAt ? 'paused' : remaining <= 0 ? 'time' : 'left'}</span>
</div>

<style>
	.face {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 18px 10px 14px;
		border-radius: 28px;
		background: #fff;
		border: 1px solid var(--line);
	}

	.time {
		font-family: var(--play-display);
		font-size: clamp(3rem, 14vw, 4.4rem);
		font-weight: 700;
		letter-spacing: -0.05em;
		line-height: 0.9;
		font-variant-numeric: tabular-nums;
	}

	.sub {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.urgent .time {
		color: var(--danger);
	}

	.paused {
		opacity: 0.7;
	}
</style>
