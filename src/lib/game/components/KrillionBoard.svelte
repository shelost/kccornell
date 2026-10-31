<script lang="ts">
	import PlayerStrip from './PlayerStrip.svelte';
	import Scoreboard from './Scoreboard.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { pop, rise } from '$lib/game/motion';

	const game = getSession();
	let guess = $state('');

	const table = $derived(game.krillion);
	const playing = $derived(game.phase === 'krillion');
	const winner = $derived(game.players.find((player) => player.id === table?.winnerId) ?? null);
	const rule = $derived(table?.prompt?.label ?? game.theme?.label ?? 'Name one from the list');
	const mine = $derived(
		Object.values(table?.answers ?? {}).find((answer) => answer.playerId === game.playerId) ?? null
	);
	const board = $derived(table?.board ?? []);

	function nameOf(id: string): string {
		return game.players.find((player) => player.id === id)?.name ?? 'Someone';
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		const text = guess.trim();
		if (!text || !playing) return;
		await game.answerKrillion(text);
	}
</script>

{#if game.phase === 'krillion-final'}
	<section class="board-screen final" {@attach rise()}>
		<h1 class="title">Final scores</h1>
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
{:else if game.phase === 'krillion-reveal'}
	<section class="board-screen final" {@attach rise()}>
		<p class="label">Most unique</p>
		<h1 class="title">{rule}</h1>
		<ol class="ranks">
			{#each board as row (row.playerId)}
				<li class:unique={row.count === 1} class:miss={!row.word}>
					<span>
						<strong>{row.word ?? row.text}</strong>
						<em>{nameOf(row.playerId)}{row.word && row.count > 1 ? ` · ${row.count} said it` : ''}</em>
					</span>
					<b>{row.points}</b>
				</li>
			{:else}
				<li class="miss"><span><strong>No answers</strong></span></li>
			{/each}
		</ol>
		<p class="muted">A word only counts if it is on the list and matches the rule. Said by one person: 100. Two: 40. Three: 15. More: 5.</p>
	</section>
{:else}
	<section class="play" {@attach rise()}>
		<PlayerStrip players={game.players} scores={game.totals} meId={game.playerId} />
		<div class="headline">
			<p class="label">One answer. Rarest wins.</p>
			<h1 class="heading">{rule}</h1>
			<p class="muted last">Letters only, ignoring spaces. It has to be on the list.</p>
		</div>
		<form class="guess" onsubmit={send}>
			<input
				class="field"
				bind:value={guess}
				maxlength="40"
				placeholder={mine ? `Locked in: ${mine.text}` : 'Your answer'}
				name="krillion"
				autocomplete="off"
				autocapitalize="off"
				autocorrect="off"
				spellcheck="false"
				enterkeyhint="send"
				inputmode="text"
			/>
			<button class="btn accent small" type="submit" disabled={!guess.trim()}>
				{mine ? 'Change' : 'Go'}
			</button>
		</form>
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

	.ranks {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.ranks li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		background: #fff;
	}

	.ranks li span {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.ranks em {
		font-style: normal;
		color: var(--muted);
		font-size: 0.85rem;
	}

	.ranks .unique {
		border-color: var(--accent);
	}

	.ranks .miss {
		opacity: 0.7;
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

</style>
