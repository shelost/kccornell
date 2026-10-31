<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import CountdownBar from '$lib/game/components/CountdownBar.svelte';
	import { hintFor } from '$lib/game/hints';
	import { shuffle } from '$lib/game/ids';
	import { flipCard, pop, rise } from '$lib/game/motion';
	import { THEMES, themeLook, type Theme } from '$lib/game/themes';

	const TIMES = [
		{ ms: 30_000, label: '0:30' },
		{ ms: 60_000, label: '1:00' },
		{ ms: 90_000, label: '1:30' },
		{ ms: 120_000, label: '2:00' }
	];

	let theme = $state<Theme | null>(null);
	let deck = $state.raw<string[]>([]);
	let index = $state(0);
	let durationMs = $state(60_000);
	let endsAt = $state<number | null>(null);
	let pausedMs = $state<number | null>(null);
	let phase = $state<'pick' | 'play' | 'done'>('pick');
	let got = $state<string[]>([]);
	let catalog = $state.raw<Theme[]>(THEMES);

	const word = $derived(deck[index] ?? '');
	const hint = $derived(hintFor(word));
	const paused = $derived(pausedMs != null && endsAt == null);

	function start(next: Theme) {
		theme = next;
		deck = shuffle(next.words);
		index = 0;
		got = [];
		pausedMs = null;
		endsAt = Date.now() + durationMs;
		phase = 'play';
	}

	function nextCard() {
		if (!deck.length || phase !== 'play' || paused) return;
		if (index + 1 >= deck.length) {
			deck = shuffle(deck);
			index = 0;
			return;
		}
		index += 1;
	}

	function markGot() {
		if (!word || phase !== 'play' || paused) return;
		got = [...got, word];
		nextCard();
	}

	function togglePause() {
		if (phase !== 'play') return;
		if (paused) {
			endsAt = Date.now() + (pausedMs ?? 0);
			pausedMs = null;
			return;
		}
		if (endsAt == null) return;
		pausedMs = Math.max(0, endsAt - Date.now());
		endsAt = null;
	}

	function finish() {
		if (phase !== 'play') return;
		phase = 'done';
		endsAt = null;
		pausedMs = null;
	}

	function again() {
		if (!theme) return;
		start(theme);
	}

	function backToThemes() {
		theme = null;
		phase = 'pick';
		endsAt = null;
		pausedMs = null;
		catalog = shuffle(THEMES);
	}

	onMount(() => {
		catalog = shuffle(THEMES);
	});

	$effect(() => {
		if (phase !== 'play' || endsAt == null) return;
		const deadline = endsAt;
		const id = setTimeout(() => finish(), Math.max(0, deadline - Date.now()));
		return () => clearTimeout(id);
	});
</script>

<div class="shell">
	<a class="exit-game" href={resolve('/play')}>Exit</a>
	{#if phase === 'pick' || !theme}
		<section class="pick" {@attach rise()}>
			<div class="mast">
				<h1 class="title">Charades</h1>
				<p class="muted">Pick a time, then a theme. Act it out. Don’t say the word.</p>
				<div class="times" role="group" aria-label="Round length">
					{#each TIMES as option (option.ms)}
						<button
							class="chip"
							class:on={durationMs === option.ms}
							type="button"
							aria-pressed={durationMs === option.ms}
							onclick={() => (durationMs = option.ms)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="themes">
				{#each catalog as item (item.id)}
					{@const look = themeLook(item.id)}
					<button class="theme" type="button" onclick={() => start(item)}>
						<span class="glyph" style:background={look.tint} aria-hidden="true">{look.icon}</span>
						<strong>{item.label}</strong>
						<span>{item.korean}</span>
					</button>
				{/each}
			</div>
		</section>
	{:else if phase === 'done'}
		<section class="done" {@attach rise()}>
			<p class="label">{theme.label}</p>
			<h1 class="title">{got.length}</h1>
			<p class="muted">{got.length === 1 ? 'They got it.' : 'They got these.'}</p>
			{#if got.length}
				<ul class="got">
					{#each got as item, i (i)}
						<li>{item}</li>
					{/each}
				</ul>
			{:else}
				<p class="muted empty">None this round. The clock won.</p>
			{/if}
			<button class="btn accent" type="button" onclick={again}>Same theme</button>
			<button class="ghost again" type="button" onclick={backToThemes}>Themes</button>
		</section>
	{:else}
		<section class="table">
			<CountdownBar {endsAt} {pausedMs} totalMs={durationMs} />
			<header class="bar">
				<button class="ghost" type="button" onclick={backToThemes}>Themes</button>
				<span class="label">{theme.label}</span>
				<button class="ghost pause" type="button" onclick={togglePause}>
					{paused ? 'Resume' : 'Pause'}
				</button>
			</header>

			<div class="board">
				{#key `${index}-${word}`}
					<div class="card neu" class:hidden={paused} {@attach flipCard()}>
						{#if paused}
							<p class="word">Paused</p>
						{:else}
							<p class="word">{word}</p>
							{#if hint}
								<p class="gloss">{hint}</p>
							{/if}
						{/if}
					</div>
				{/key}
				<p class="score" {@attach pop(0.15)}>{got.length} got</p>
			</div>

			<div class="actions">
				<button class="btn accent" type="button" disabled={paused} onclick={markGot}>Got it</button>
				<button class="btn danger" type="button" disabled={paused} onclick={nextCard}>Skip</button>
			</div>
		</section>
	{/if}
</div>

<style>
	.shell {
		flex: 1;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.pick,
	.table,
	.done {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.pick {
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		-webkit-overflow-scrolling: touch;
		text-align: center;
	}

	.pick::-webkit-scrollbar {
		display: none;
	}

	.table {
		overflow: hidden;
	}

	.done {
		gap: 16px;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		text-align: center;
		padding-bottom: 8px;
	}

	.done::-webkit-scrollbar {
		display: none;
	}

	.mast {
		position: sticky;
		top: 0;
		z-index: 2;
		display: grid;
		gap: 12px;
		padding-top: 18px;
		padding-bottom: 14px;
		background: var(--bg);
	}

	.ghost {
		color: var(--muted);
		font-size: 0.85rem;
		font-weight: 800;
	}

	.times {
		display: flex;
		justify-content: center;
		gap: 8px;
	}

	.themes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-content: start;
		gap: 10px;
		padding-bottom: calc(32px + env(safe-area-inset-bottom));
	}

	.theme {
		display: grid;
		justify-items: center;
		gap: 4px;
		min-height: 118px;
		padding: 14px 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: 22px;
		background: #fff;
	}

	.glyph {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: 16px;
		font-size: 1.45rem;
		line-height: 1;
	}

	.theme strong {
		font-size: 0.92rem;
		font-weight: 800;
		line-height: 1.15;
	}

	.theme span:not(.glyph) {
		font-size: 0.74rem;
		color: var(--muted);
		font-weight: 700;
	}

	.bar {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		margin-bottom: 8px;
	}

	.ghost {
		justify-self: start;
		padding: 6px 0;
	}

	.pause {
		justify-self: end;
	}

	.board {
		flex: 1;
		min-height: 0;
		display: grid;
		align-content: center;
		gap: 14px;
		width: 100%;
		perspective: 900px;
	}

	.card {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 12px;
		min-height: min(42dvh, 340px);
		padding: 28px 22px;
	}

	.card.hidden .word {
		color: var(--muted);
	}

	.word {
		font-size: clamp(2.1rem, 11vw, 3.4rem);
		font-weight: 900;
		letter-spacing: -0.045em;
		line-height: 1.02;
		text-wrap: balance;
		color: var(--ink);
	}

	.gloss {
		max-width: 28ch;
		color: var(--muted);
		font-size: 0.92rem;
		font-weight: 700;
		line-height: 1.35;
		text-wrap: balance;
	}

	.score {
		color: var(--muted);
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.actions {
		display: grid;
		gap: 10px;
		padding-top: 8px;
	}

	.got {
		flex: 1;
		min-height: 0;
		overflow: auto;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-content: start;
		gap: 8px;
	}

	.got li {
		padding: 8px 12px;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		background: #fff;
		font-weight: 800;
		font-size: 0.9rem;
	}

	.done .btn,
	.done .again {
		flex-shrink: 0;
	}

	.empty {
		flex: 1;
	}

	.again {
		align-self: center;
		padding: 8px;
	}
</style>
