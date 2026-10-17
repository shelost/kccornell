<script lang="ts">
	import type { Snippet } from 'svelte';
	import { shortId } from '$lib/game/ids';
	import { ERASER, PEN_COLORS, PEN_SIZES } from '$lib/game/sketch';
	import type { Point, Stroke } from '$lib/game/types';

	let {
		strokes,
		live = null,
		interactive = false,
		thumb = false,
		placeholder = '',
		onInk,
		onCommit,
		children
	}: {
		strokes: Stroke[];
		live?: Stroke | null;
		interactive?: boolean;
		/** Fits whatever box the parent gives it instead of claiming most of the screen. */
		thumb?: boolean;
		placeholder?: string;
		onInk?: (stroke: Stroke) => void;
		onCommit?: (strokes: Stroke[]) => void;
		children?: Snippet;
	} = $props();

	const MAX_POINTS = 240;

	let color = $state(PEN_COLORS[0]!);
	let size = $state(PEN_SIZES[1]!);
	let mine = $state.raw<Stroke[] | null>(null);
	let current = $state.raw<Stroke | null>(null);
	let pointerId = -1;

	const committed = $derived(mine ?? strokes);
	const shown = $derived.by(() => {
		const list = current ? [...committed, current] : committed;
		return live && !list.some((stroke) => stroke.id === live.id) ? [...list, live] : list;
	});

	function paint(canvas: HTMLCanvasElement, list: Stroke[]) {
		const ctx = canvas.getContext('2d');
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (!ctx || w === 0 || h === 0) return;
		const dpr = window.devicePixelRatio || 1;
		if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.fillStyle = ERASER;
		ctx.fillRect(0, 0, w, h);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (const stroke of list) {
			const [first, ...rest] = stroke.points;
			if (!first) continue;
			const width = Math.max(1.5, (stroke.width * w) / 320);
			ctx.strokeStyle = stroke.color;
			ctx.fillStyle = stroke.color;
			ctx.lineWidth = width;
			ctx.beginPath();
			if (rest.length === 0) {
				ctx.arc(first.x * w, first.y * h, width / 2, 0, Math.PI * 2);
				ctx.fill();
				continue;
			}
			ctx.moveTo(first.x * w, first.y * h);
			for (let i = 0; i < rest.length - 1; i++) {
				const a = rest[i]!;
				const b = rest[i + 1]!;
				ctx.quadraticCurveTo(a.x * w, a.y * h, ((a.x + b.x) / 2) * w, ((a.y + b.y) / 2) * h);
			}
			const last = rest[rest.length - 1]!;
			ctx.lineTo(last.x * w, last.y * h);
			ctx.stroke();
		}
	}

	function surface(canvas: HTMLCanvasElement) {
		const observer = new ResizeObserver(() => paint(canvas, shown));
		observer.observe(canvas);
		return () => observer.disconnect();
	}

	function toPoint(event: PointerEvent, canvas: HTMLCanvasElement): Point {
		const rect = canvas.getBoundingClientRect();
		const snap = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
		return {
			x: snap((event.clientX - rect.left) / rect.width),
			y: snap((event.clientY - rect.top) / rect.height)
		};
	}

	function apart(a: Point | undefined, b: Point) {
		if (!a) return true;
		return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 >= 0.000025;
	}

	function commit(next: Stroke[]) {
		mine = next;
		onCommit?.(next);
	}

	function down(event: PointerEvent) {
		if (!interactive || current || event.button > 0) return;
		const canvas = event.currentTarget as HTMLCanvasElement;
		try {
			canvas.setPointerCapture(event.pointerId);
		} catch {
			/* pointer already released; the stroke still works without capture */
		}
		pointerId = event.pointerId;
		current = { id: shortId(), color, width: size, points: [toPoint(event, canvas)] };
		onInk?.(current);
	}

	function move(event: PointerEvent) {
		if (!current || event.pointerId !== pointerId) return;
		const canvas = event.currentTarget as HTMLCanvasElement;
		const samples = event.getCoalescedEvents?.() ?? [];
		let points = current.points;
		for (const sample of samples.length ? samples : [event]) {
			const point = toPoint(sample, canvas);
			if (apart(points[points.length - 1], point)) points = [...points, point];
		}
		if (points === current.points) return;
		current = { ...current, points };
		if (points.length >= MAX_POINTS) {
			commit([...committed, current]);
			current = { ...current, id: shortId(), points: points.slice(-1) };
		}
		onInk?.(current);
	}

	function up(event: PointerEvent) {
		if (!current || event.pointerId !== pointerId) return;
		const done = current;
		current = null;
		pointerId = -1;
		commit([...committed, done]);
	}

	function undo() {
		if (!current && committed.length > 0) commit(committed.slice(0, -1));
	}

	function clear() {
		if (!current && committed.length > 0) commit([]);
	}
</script>

<div class="board" class:thumb>
	<div class="area">
		<div class="paper neu-in">
			<canvas
				class:live={interactive}
				{@attach surface}
				{@attach (canvas) => paint(canvas, shown)}
				onpointerdown={down}
				onpointermove={move}
				onpointerup={up}
				onpointercancel={up}
				aria-label={interactive ? 'Drawing board' : 'Live drawing'}
			></canvas>
			{#if placeholder && shown.length === 0}
				<p class="empty">{placeholder}</p>
			{/if}
			{@render children?.()}
		</div>
	</div>
	{#if interactive}
		<div class="tools">
			<div class="row">
				{#each PEN_COLORS as swatch (swatch)}
					<button
						class="swatch"
						class:on={color === swatch}
						class:eraser={swatch === ERASER}
						style:--swatch={swatch}
						type="button"
						aria-label={swatch === ERASER ? 'Eraser' : `Color ${swatch}`}
						onclick={() => (color = swatch)}
					></button>
				{/each}
			</div>
			<div class="row">
				{#each PEN_SIZES as pen (pen)}
					<button
						class="nib"
						class:on={size === pen}
						type="button"
						aria-label={`Brush size ${pen}`}
						onclick={() => (size = pen)}
					>
						<span style:width="{pen + 4}px" style:height="{pen + 4}px"></span>
					</button>
				{/each}
				<button class="btn small" type="button" onclick={undo}>Undo</button>
				<button class="btn small" type="button" onclick={clear}>Clear</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.board {
		--inset: 5px;
		--round: 26px;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.board.thumb {
		--inset: 3px;
		--round: 14px;
	}

	.area {
		flex: 1;
		min-height: 40dvh;
		container-type: size;
		display: grid;
		place-items: center;
	}

	.thumb .area {
		min-height: 0;
	}

	.paper {
		position: relative;
		width: min(100cqw, calc((100cqh - 2 * var(--inset)) * 2 / 3 + 2 * var(--inset)));
		padding: var(--inset);
		border-radius: var(--round);
	}

	canvas {
		display: block;
		width: 100%;
		aspect-ratio: 2 / 3;
		background: #fff;
		border-radius: calc(var(--round) - var(--inset));
		touch-action: none;
	}

	.thumb .empty {
		padding: 4px;
		font-size: 0.68rem;
	}

	canvas.live {
		cursor: crosshair;
	}

	.empty {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 16px;
		color: var(--muted);
		font-weight: 800;
		pointer-events: none;
	}

	.tools {
		display: grid;
		gap: 8px;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 9px;
	}

	.row .btn {
		min-height: 36px;
		padding: 0 14px;
	}

	.swatch {
		width: 29px;
		height: 29px;
		border-radius: 50%;
		background: var(--swatch);
		box-shadow: var(--raise-sm);
		transition: box-shadow 0.15s ease;
	}

	.swatch.eraser {
		background: repeating-conic-gradient(#fff 0 25%, #dfe3ea 0 50%) 50% / 10px 10px;
	}

	.swatch.on {
		box-shadow:
			0 0 0 4px var(--bg),
			0 0 0 7px var(--accent);
	}

	.nib {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		box-shadow: var(--raise-sm);
	}

	.nib span {
		display: block;
		border-radius: 50%;
		background: var(--ink);
	}

	.nib.on {
		box-shadow: var(--press-sm);
	}

	.nib.on span {
		background: var(--accent);
	}
</style>
