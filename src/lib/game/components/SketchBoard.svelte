<script lang="ts">
	import DrawCanvas from './DrawCanvas.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import PlayerStrip from './PlayerStrip.svelte';
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
	const awards = $derived(
		Object.entries(sketch?.turnPoints ?? {})
			.filter(([, points]) => points > 0)
			.sort((a, b) => b[1] - a[1])
	);
	const winner = $derived(rankByScore(game.players, game.totals)[0] ?? null);
	const letters = $derived((sketch?.hint ?? '').replace(/\s/g, '').length);
	const placeholder = $derived(
		drawing
			? 'Draw anywhere'
			: game.phase === 'sketch'
				? `Waiting for ${drawer?.name ?? 'the artist'}…`
				: 'Nothing was drawn'
	);

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
	<section class="stack" {@attach rise()}>
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
		<Leaderboard players={game.players} scores={game.totals} meId={game.playerId} />
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
				{#if game.phase === 'sketch'}
					{drawing ? 'Your turn to draw' : `${drawer?.name ?? 'Someone'} is drawing`}
				{:else}
					The word was
				{/if}
			</h1>
			{#if game.phase === 'sketch-reveal'}
				<p class="word" {@attach pop()}>{sketch?.revealWord ?? '—'}</p>
			{:else if drawing}
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
			{placeholder}
			onInk={(stroke) => game.drawInk(stroke)}
			onCommit={(strokes) => game.commitStrokes(strokes)}
		/>

		{#if game.phase === 'sketch' && !drawing}
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

		{#if game.phase === 'sketch-reveal' && awards.length > 0}
			<div class="row">
				{#each awards as [id, points] (id)}
					{@const player = game.room?.players[id]}
					{#if player}
						<span class="pill" style:background={PLAYER_COLORS[player.color] ?? '#6a4cf5'}>
							{player.name} +{points}{id === sketch?.drawerId ? ' ✎' : ''}
						</span>
					{/if}
				{/each}
			</div>
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

	.pill {
		padding: 8px 14px;
		border-radius: 999px;
		color: #fff;
		font-weight: 800;
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
