<script lang="ts">
	import DrawCanvas from './DrawCanvas.svelte';
	import PlayerStrip from './PlayerStrip.svelte';
	import Scoreboard from './Scoreboard.svelte';
	import { manualKeyboard } from '$lib/game/keyboard';
	import { getSession } from '$lib/game/session.svelte';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { pop, rise } from '$lib/game/motion';
	import { rankByScore } from '$lib/game/sketch';

	const game = getSession();
	let guess = $state('');
	let lastGuess = $state('');

	const sketch = $derived(game.sketch);
	const drawing = $derived(game.phase === 'sketch' && game.isDrawer);
	const drawer = $derived(game.players.find((player) => player.id === sketch?.drawerId) ?? null);
	const solved = $derived(Boolean(sketch?.guessed[game.playerId]));
	const winner = $derived(rankByScore(game.players, game.totals)[0] ?? null);
	const letters = $derived((sketch?.hint ?? '').replace(/\s/g, '').length);
	const recap = $derived.by(() => {
		const guessers = game.players.filter((player) => player.id !== sketch?.drawerId);
		const got = guessers.filter((player) => sketch?.guessed[player.id]).length;
		const artist = drawer?.id === game.playerId ? 'You drew' : `${drawer?.name ?? 'Someone'} drew`;
		if (got === 0) return `${artist} · nobody got it`;
		if (got === guessers.length) return `${artist} · everyone got it`;
		return `${artist} · ${got} of ${guessers.length} got it`;
	});

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const text = guess.trim();
		if (!text || solved) return;
		guess = '';
		lastGuess = text;
		await game.guessWord(text);
	}
</script>

{#if game.phase === 'sketch-final'}
	<section class="board-screen final" {@attach rise()}>
		<h1 class="title">That’s a wrap</h1>
		{#if winner}
			<div class="winner neu" {@attach pop(0.1)}>
				<span class="crown" aria-hidden="true">♛</span>
				<span class="avatar champ" style:background={PLAYER_COLORS[winner.color] ?? '#6a4cf5'}>
					{winner.name.slice(0, 1).toUpperCase()}
				</span>
				<p class="big">{winner.name}</p>
				<p class="muted">{game.totals[winner.id] ?? 0} points</p>
			</div>
		{/if}
		<Scoreboard
			players={game.players}
			scores={game.totals}
			meId={game.playerId}
			limit={game.players.length}
		/>
	</section>
{:else if game.phase === 'sketch-reveal'}
	<section class="board-screen" {@attach rise()}>
		<div class="answer neu" {@attach pop()}>
			<div class="thumb">
				<DrawCanvas strokes={sketch?.strokes ?? []} placeholder="No drawing" thumb />
			</div>
			<div class="said">
				<p class="label">The word was</p>
				<p class="word">{sketch?.revealWord ?? '—'}</p>
				<p class="muted">{recap}</p>
			</div>
		</div>
		<Scoreboard
			players={game.players}
			scores={game.totals}
			gained={sketch?.turnPoints ?? {}}
			meId={game.playerId}
			drawerId={sketch?.drawerId ?? null}
		/>
	</section>
{:else}
	<section class="sketch" {@attach rise()}>
		<PlayerStrip
			players={game.players}
			scores={game.totals}
			meId={game.playerId}
			drawerId={sketch?.drawerId ?? null}
			solved={sketch?.guessed ?? {}}
		/>

		<div class="headline">
			<h1 class="heading">
				{drawing ? 'Your turn to draw' : `${drawer?.name ?? 'Someone'} is drawing`}
			</h1>
			{#if drawing}
				<p class="word" {@attach pop()}>{game.card?.word ?? '…'}</p>
			{:else if solved}
				<p class="word good" {@attach pop()}>
					{lastGuess || 'Got it'} <small>+{sketch?.turnPoints[game.playerId] ?? 0}</small>
				</p>
			{:else}
				<p class="hint" aria-label="{letters} letters">{sketch?.hint}<small>{letters}</small></p>
			{/if}
		</div>

		<DrawCanvas
			strokes={sketch?.strokes ?? []}
			live={drawing ? null : game.ink}
			interactive={drawing}
			placeholder={drawing ? 'Draw anywhere' : `Waiting for ${drawer?.name ?? 'the artist'}…`}
			onInk={(stroke) => game.drawInk(stroke)}
			onCommit={(strokes) => game.commitStrokes(strokes)}
		/>

		{#if !drawing}
			<form class="guess" onsubmit={send}>
				<input
					class="field"
					bind:value={guess}
					maxlength="40"
					placeholder={solved ? 'Nice! Hang tight' : 'Your guess'}
					disabled={solved}
					autocomplete="off"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					enterkeyhint="send"
					inputmode="text"
					{@attach manualKeyboard()}
				/>
				<button class="btn accent small" type="submit" disabled={solved || !guess.trim()}>Go</button>
			</form>
		{/if}
	</section>
{/if}

<style>
	.sketch {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow: hidden;
	}

	.sketch:has(.guess) {
		padding-bottom: calc(70px + env(safe-area-inset-bottom));
	}

	.headline {
		display: grid;
		gap: 0;
	}

	.heading {
		font-size: clamp(1rem, 4.4vw, 1.25rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		line-height: 1.15;
		color: var(--muted);
	}

	.word,
	.hint {
		font-weight: 900;
		line-height: 1.1;
	}

	.word {
		font-size: clamp(1.6rem, 7vw, 2.1rem);
		letter-spacing: -0.03em;
		color: var(--accent);
		overflow-wrap: anywhere;
	}

	.word.good {
		color: var(--good);
	}

	.hint {
		font-size: clamp(1.35rem, 6vw, 1.7rem);
		letter-spacing: 0.32em;
		white-space: pre-wrap;
	}

	.word small,
	.hint small {
		margin-left: 6px;
		font-size: 0.75rem;
		letter-spacing: 0.04em;
		color: var(--muted);
		vertical-align: middle;
	}

	.guess {
		position: fixed;
		left: 50%;
		bottom: max(var(--kb-inset, 0px), env(keyboard-inset-bottom, 0px));
		z-index: 25;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px;
		align-items: center;
		width: min(440px, 100%);
		padding: 8px var(--pad-x) var(--kb-pad, calc(8px + env(safe-area-inset-bottom)));
		background: linear-gradient(to top, var(--bg) 78%, transparent);
		transform: translateX(-50%);
	}

	.guess .field {
		min-height: 54px;
	}

	.guess .btn {
		min-height: 54px;
		padding: 0 24px;
	}

	.board-screen {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.board-screen.final {
		min-height: 100%;
	}

	.board-screen > :global(:first-child) {
		margin-top: auto;
	}

	.board-screen > :global(:last-child) {
		margin-bottom: auto;
	}

	.answer {
		flex: none;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px;
		text-align: left;
	}

	.thumb {
		flex: none;
		display: flex;
		height: clamp(96px, 18dvh, 150px);
		aspect-ratio: 2 / 3;
	}

	.said {
		display: grid;
		gap: 4px;
		min-width: 0;
	}

	.winner {
		display: grid;
		justify-items: center;
		gap: 8px;
	}

	.crown {
		font-size: 2rem;
		line-height: 1;
		color: var(--gold);
	}

	.champ {
		width: 76px;
		height: 76px;
		font-size: 1.9rem;
		box-shadow:
			0 0 0 4px var(--bg),
			0 0 0 7px var(--gold);
	}
</style>
