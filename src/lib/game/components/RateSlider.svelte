<script lang="ts">
	import { gsap } from 'gsap';

	let { value = $bindable(0) }: { value?: number } = $props();

	const MAX = 10;
	const labels = [
		{ at: 10, text: 'God tier' },
		{ at: 5, text: 'Amazing' },
		{ at: 0, text: 'Great' }
	] as const;

	const t = $derived(gsap.utils.clamp(0, 1, value / MAX));
	const down = $derived(gsap.utils.clamp(0, 1, 1 - t * 2));
	const mid = $derived(gsap.utils.clamp(0, 1, 1 - Math.abs(t - 0.5) * 2));
	const up = $derived(gsap.utils.clamp(0, 1, t * 2 - 1));
	const fillPct = $derived(t * 100);

	function fromPointer(rail: HTMLElement, clientY: number) {
		const rect = rail.getBoundingClientRect();
		const pad = 20;
		const usable = Math.max(1, rect.height - pad * 2);
		const fromBottom = rect.bottom - pad - clientY;
		return gsap.utils.clamp(0, MAX, (fromBottom / usable) * MAX);
	}

	function labelWeight(at: number) {
		return gsap.utils.clamp(0, 1, 1 - Math.abs(value - at) / 4);
	}
</script>

	<div class="rate-block">
	<div class="faces" aria-hidden="true">
		<img src="/caleb_thumbs_down.png" alt="" style:opacity={`${down}`} />
		<img src="/caleb_thumbs_mid.png" alt="" style:opacity={`${mid}`} />
		<img src="/caleb_thumbs_up.png" alt="" style:opacity={`${up}`} />
	</div>
	<div class="meter">
		<ol class="scale">
			{#each labels as label (label.text)}
				<li style:color="color-mix(in srgb, var(--ink) {labelWeight(label.at) * 100}%, var(--muted))">
					{label.text}
				</li>
			{/each}
		</ol>
		<div
			class="rail"
			role="slider"
			tabindex="0"
			aria-valuemin={0}
			aria-valuemax={MAX}
			aria-valuenow={value}
			aria-valuetext={labels.find((label) => Math.abs(label.at - value) < 2.5)?.text ?? 'Great'}
			aria-label="App rating"
			onpointerdown={(event) => {
				event.currentTarget.setPointerCapture(event.pointerId);
				value = fromPointer(event.currentTarget, event.clientY);
			}}
			onpointermove={(event) => {
				if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
				value = fromPointer(event.currentTarget, event.clientY);
			}}
			onkeydown={(event) => {
				const step = event.shiftKey ? 1 : 0.1;
				if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
					event.preventDefault();
					value = Math.min(MAX, Math.round((value + step) * 10) / 10);
				} else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
					event.preventDefault();
					value = Math.max(0, Math.round((value - step) * 10) / 10);
				}
			}}
		>
			<div class="track">
				<div class="fill" style:height={`${fillPct}%`}></div>
				<div class="thumb" style:bottom={`${fillPct}%`}></div>
			</div>
		</div>
	</div>
</div>

<style>
	.rate-block {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 18px;
		width: 100%;
	}

	.faces {
		position: relative;
		flex: 0 0 auto;
		width: min(200px, 46vw);
		height: min(240px, 38dvh);
	}

	.faces img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		opacity: 0;
		pointer-events: none;
		user-select: none;
		transition: opacity 90ms linear;
	}

	.meter {
		display: grid;
		grid-template-columns: auto 56px;
		align-items: stretch;
		gap: 14px;
		height: min(38dvh, 280px);
		user-select: none;
	}

	.scale {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		margin: 0;
		padding: 10px 0;
		list-style: none;
		text-align: right;
		font-size: 1rem;
		font-weight: 800;
	}

	.rail {
		position: relative;
		width: 56px;
		padding: 20px 0;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		background: #fff;
		touch-action: none;
		cursor: ns-resize;
	}

	.track {
		position: relative;
		height: 100%;
	}

	.fill {
		position: absolute;
		left: 8px;
		right: 8px;
		bottom: 0;
		border-radius: 999px;
		background: linear-gradient(to top, var(--accent-2), var(--accent));
	}

	.thumb {
		position: absolute;
		left: 50%;
		width: 36px;
		height: 36px;
		border: 1.5px solid var(--line);
		border-radius: 50%;
		background: #fff;
		transform: translate(-50%, 50%);
		pointer-events: none;
		box-shadow: var(--raise-sm);
	}
</style>
