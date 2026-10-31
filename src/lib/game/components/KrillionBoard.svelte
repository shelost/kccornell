<script lang="ts">
	import PlayerStrip from './PlayerStrip.svelte';
	import Scoreboard from './Scoreboard.svelte';
	import { SPARK_GOAL } from '$lib/game/krillion';
	import { getSession } from '$lib/game/session.svelte';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { pop, rise } from '$lib/game/motion';

	const game = getSession();
	let guess = $state('');

	const table = $derived(game.krillion);
	const mine = $derived(game.isTurn && game.phase === 'krillion');
	const out = $derived((table?.lives[game.playerId] ?? 0) <= 0);
	const current = $derived(game.players.find((player) => player.id === table?.turnId) ?? null);
	const winner = $derived(game.players.find((player) => player.id === table?.winnerId) ?? null);
	const used = $derived((table?.used ?? []).slice(-10).reverse());
	const spark = $derived(table?.sparks[game.playerId] ?? 0);
	const prompt = $derived(game.theme?.label ?? 'this category');

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const text = guess.trim();
		if (!text || !mine || out) return;
		guess = '';
		await game.answerKrillion(text);
	}
</script>

{#if game.phase === 'krillion-final'}
	<section class="board-screen final" {@attach rise()}>
		<h1 class="title">Last floating</h1>
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
{:else}
	<section class="play" {@attach rise()}>
		<PlayerStrip
			players={game.players}
			scores={game.totals}
			meId={game.playerId}
			drawerId={table?.turnId ?? null}
			lives={table?.lives ?? {}}
		/>

		<div class="headline">
			<p class="label">{mine ? 'Your turn' : `${current?.name ?? 'Someone'}’s turn`}</p>
			<h1 class="heading">Name one from {prompt}</h1>
			{#if table?.lastWord}
				<p class="muted last">{table.lastWord} is taken</p>
			{/if}
		</div>

		{#key `${table?.turnId}-${table?.turnEndsAt}`}
			<div
				class="puffer"
				class:mine
				style:--ms="{table?.turnMs ?? 12000}ms"
				aria-hidden="true"
			>
				<span class="eye left"></span>
				<span class="eye right"></span>
				<span class="mouth"></span>
			</div>
		{/key}
		<p class="hint">
			{out ? 'You’re out — watch the rest' : mine ? 'Pass the puffer. Don’t repeat.' : 'Wait for your turn'}
		</p>
		{#if !out}
			<div class="spark" aria-label="Progress to an extra heart">
				<span class="bar" style:transform="scaleX({spark / SPARK_GOAL})"></span>
				<em>{spark}/{SPARK_GOAL} to a heart</em>
			</div>
		{/if}

		{#if used.length}
			<div class="used" aria-label="Used answers">
				{#each used as word (word)}
					<span class="chip on">{word}</span>
				{/each}
			</div>
		{/if}

		{#if mine && !out}
			<form class="guess" onsubmit={send}>
				<input
					class="field"
					bind:value={guess}
					maxlength="40"
					placeholder="Your answer"
					name="krillion"
					autocomplete="off"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					enterkeyhint="send"
					inputmode="text"
				/>
				<button class="btn accent small" type="submit" disabled={!guess.trim()}>Go</button>
			</form>
		{/if}
	</section>
{/if}

<style>
	.play,
	.board-screen {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.play:has(.guess) {
		padding-bottom: calc(70px + env(safe-area-inset-bottom));
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

	.headline {
		display: grid;
		gap: 2px;
	}

	.heading {
		font-size: clamp(1.35rem, 6vw, 1.9rem);
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.1;
		text-wrap: balance;
	}

	.last {
		font-size: 0.85rem;
	}

	.puffer {
		position: relative;
		width: min(42vw, 180px);
		aspect-ratio: 1;
		margin: 8px auto 0;
		border-radius: 50%;
		background: radial-gradient(circle at 32% 30%, #fff8, #f3c14b 42%, #e07a12);
		box-shadow: var(--raise);
		transform: scale(0.74);
		animation: swell var(--ms, 12s) linear forwards;
	}

	.puffer.mine {
		box-shadow:
			0 0 0 4px var(--bg),
			0 0 0 7px var(--accent),
			var(--raise);
	}

	.eye {
		position: absolute;
		top: 34%;
		width: 14%;
		height: 14%;
		border-radius: 50%;
		background: var(--ink);
	}

	.eye.left {
		left: 28%;
	}

	.eye.right {
		right: 28%;
	}

	.mouth {
		position: absolute;
		left: 38%;
		right: 38%;
		bottom: 28%;
		height: 8%;
		border-radius: 999px;
		background: var(--ink);
		opacity: 0.35;
	}

	.hint {
		color: var(--muted);
		font-size: 0.9rem;
		font-weight: 800;
	}

	.spark {
		position: relative;
		overflow: hidden;
		height: 28px;
		border-radius: 999px;
		box-shadow: var(--press-sm);
	}

	.spark .bar {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--gold) 55%, transparent);
		transform-origin: left center;
		transition: transform 0.4s ease;
	}

	.spark em {
		position: relative;
		font-size: 0.72rem;
		font-style: normal;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: var(--muted);
		line-height: 28px;
	}

	.used {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		min-height: 0;
		overflow: hidden;
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

	@keyframes swell {
		70% {
			transform: scale(1.06);
			background: radial-gradient(circle at 32% 30%, #fff8, #f3c14b 42%, #e07a12);
		}
		100% {
			transform: scale(1.2);
			background: radial-gradient(circle at 32% 30%, #fff8, #ff8197 40%, var(--danger));
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.puffer {
			animation: none;
			transform: scale(1);
		}
	}
</style>
