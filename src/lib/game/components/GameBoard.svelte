<script lang="ts">
	import { resolve } from '$app/paths';
	import PlayerGrid from './PlayerGrid.svelte';
	import TimerFace from './TimerFace.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { THEMES, getTheme } from '$lib/game/themes';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { rise, pop, flipCard } from '$lib/game/motion';
	import { MAX_PLAYERS } from '$lib/game/types';

	const game = getSession();
	let copied = $state(false);

	const shareUrl = $derived(
		typeof location === 'undefined' ? '' : `${location.origin}/play/${game.code}`
	);
	const votedThemes = $derived(game.players.filter((p) => p.themeVote).length);
	const votedPeople = $derived(game.players.filter((p) => p.accused).length);
	const readyCount = $derived(game.players.filter((p) => p.ready).length);
	const pollThemes = $derived(THEMES.filter((t) => game.room?.poll.themeIds.includes(t.id)));

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(game.code);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			copied = false;
		}
	}

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: 'Imposter', text: `Join ${game.code}`, url: shareUrl });
			return;
		}
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

</script>

{#if game.room}
	<header class="top" {@attach rise()}>
		<a href={resolve('/play')} class="back">Leave</a>
		<div>
			<p class="play-kicker">{game.phase}</p>
			<p class="code">{game.code}</p>
		</div>
		<span class="count">{game.playerCount}/{MAX_PLAYERS}</span>
	</header>

	{#if game.error}
		<p class="warn">{game.error}</p>
	{/if}

	{#key game.phase}
		<div class="stage">
			{#if game.phase === 'lobby'}
				<section class="stack" {@attach rise()}>
					<div class="play-card">
						<p class="play-kicker">Room code</p>
						<p class="play-code">{game.code}</p>
						<div class="row">
							<button class="play-btn ghost" type="button" onclick={copyCode}>
								{copied ? 'Copied' : 'Copy code'}
							</button>
							<button class="play-btn ghost" type="button" onclick={share}>Share link</button>
						</div>
					</div>

					<PlayerGrid players={game.players} hostId={game.room.hostId} meId={game.playerId} />

					{#if game.isHost}
						<div class="play-card stack-s">
							<p class="play-kicker">Themes in the poll</p>
							<div class="chip-row">
								{#each THEMES as theme (theme.id)}
									<button
										class="mini"
										class:on={game.room.poll.themeIds.includes(theme.id)}
										type="button"
										onclick={() => game.togglePollTheme(theme.id)}
									>
										{theme.label}
									</button>
								{/each}
							</div>
							<label class="set">
								Imposters
								<select
									value={game.room.settings.imposterCount}
									onchange={(e) =>
										game.setImposterCount(Number((e.currentTarget as HTMLSelectElement).value))}
								>
									<option value={1}>1</option>
									<option value={2}>2</option>
									<option value={3}>3</option>
								</select>
							</label>
							<label class="set">
								Timer
								<select
									value={game.room.settings.discussSeconds}
									onchange={(e) =>
										game.setDiscussSeconds(Number((e.currentTarget as HTMLSelectElement).value))}
								>
									<option value={60}>1 min</option>
									<option value={90}>1.5 min</option>
									<option value={120}>2 min</option>
									<option value={180}>3 min</option>
									<option value={300}>5 min</option>
								</select>
							</label>
						</div>
					{:else}
						<p class="note">Waiting on the game master to start a theme poll.</p>
					{/if}
				</section>
			{:else if game.phase === 'poll'}
				<section class="stack" {@attach rise()}>
					<div>
						<p class="play-kicker">Vote a theme</p>
						<h2 class="h">What are we playing?</h2>
						<p class="note">{votedThemes}/{game.playerCount} voted</p>
					</div>
					<div class="theme-grid">
						{#each pollThemes as theme (theme.id)}
							<button
								class="choice"
								class:on={game.me?.themeVote === theme.id}
								class:win={game.room.poll.winnerId === theme.id}
								type="button"
								onclick={() =>
									game.room?.poll.status === 'open'
										? game.voteTheme(theme.id)
										: game.isHost
											? game.chooseTheme(theme.id)
											: null}
							>
								<strong>{theme.label}</strong>
								<span>{theme.korean}</span>
								<em>{game.pollCounts[theme.id] ?? 0}</em>
							</button>
						{/each}
					</div>
					{#if game.room.poll.status === 'closed'}
						<p class="note">
							Winner: {getTheme(game.room.poll.winnerId)?.label ?? '—'}. Host can still tap another.
						</p>
					{/if}
				</section>
			{:else if game.phase === 'reveal'}
				<section class="stack" {@attach pop()}>
					<p class="play-kicker">{getTheme(game.card?.themeId)?.label ?? 'Theme'}</p>
					<div class="role-card" class:imposter={game.card?.isImposter} {@attach flipCard()}>
						{#if game.card?.isImposter}
							<p class="play-kicker">Shh</p>
							<p class="secret">You’re the imposter</p>
							<p class="play-lead">You don’t know the word. Bluff. Guess. Survive the vote.</p>
						{:else}
							<p class="play-kicker">The word</p>
							<p class="secret">{game.card?.word ?? '…'}</p>
							<p class="play-lead">Describe it without saying it. Find the faker.</p>
						{/if}
					</div>
					<p class="note">{readyCount}/{game.playerCount} looked</p>
					{#if !game.me?.ready}
						<button class="play-btn primary" type="button" onclick={() => game.setReady()}>
							I looked
						</button>
					{/if}
				</section>
			{:else if game.phase === 'discuss'}
				<section class="stack" {@attach rise()}>
					<p class="play-kicker">{game.theme?.label ?? 'Discuss'}</p>
					<TimerFace
						endsAt={game.room.round.timerEndsAt}
						pausedMs={game.room.round.timerPausedMs}
					/>
					<div class="tiny-card" class:imposter={game.card?.isImposter}>
						{#if game.card?.isImposter}
							You’re the imposter
						{:else}
							Word: {game.card?.word}
						{/if}
					</div>
					<PlayerGrid players={game.players} hostId={game.room.hostId} meId={game.playerId} />
				</section>
			{:else if game.phase === 'vote'}
				<section class="stack" {@attach rise()}>
					<div>
						<p class="play-kicker">Vote</p>
						<h2 class="h">Who is faking it?</h2>
						<p class="note">{votedPeople}/{game.playerCount} in</p>
					</div>
					<PlayerGrid
						players={game.players}
						hostId={game.room.hostId}
						meId={game.playerId}
						selectable
						selectedId={game.me?.accused ?? null}
						onSelect={(id) => game.votePlayer(id === game.me?.accused ? null : id)}
					/>
				</section>
			{:else if game.phase === 'result'}
				<section class="stack" {@attach pop()}>
					<p class="play-kicker">{game.room.result?.villageWon ? 'Caught' : 'Got away'}</p>
					<h2 class="h secret">
						{game.room.result?.villageWon ? 'Village wins' : 'Imposters win'}
					</h2>
					<div class="play-card">
						<p class="note">The word was</p>
						<p class="secret">{game.room.result?.secret}</p>
					</div>
					<div class="chip-row">
						{#each game.room.result?.imposters ?? [] as id (id)}
							{@const p = game.room.players[id]}
							{#if p}
								<span class="pill" style:background={PLAYER_COLORS[p.color]}>
									{p.name}
								</span>
							{/if}
						{/each}
					</div>
					{#if game.room.result?.accused}
						<p class="note">
							Voted out: {game.room.players[game.room.result.accused]?.name ?? 'a tie'}
						</p>
					{:else}
						<p class="note">It was a tie — imposters slip away.</p>
					{/if}
				</section>
			{/if}
		</div>
	{/key}

	{#if game.isHost}
		<div class="dock">
			{#if game.phase === 'lobby'}
				<button
					class="play-btn accent"
					type="button"
					disabled={game.playerCount < 3}
					onclick={() => game.startPoll()}
				>
					{game.playerCount < 3 ? 'Need 3 players' : 'Start theme poll'}
				</button>
			{:else if game.phase === 'poll' && game.room.poll.status === 'open'}
				<button class="play-btn primary" type="button" onclick={() => game.lockPoll()}>
					Close poll
				</button>
			{:else if game.phase === 'poll'}
				<button class="play-btn accent" type="button" onclick={() => game.deal()}>
					Deal cards
				</button>
			{:else if game.phase === 'reveal'}
				<button class="play-btn accent" type="button" onclick={() => game.startDiscuss()}>
					Start discussion
				</button>
			{:else if game.phase === 'discuss'}
				<div class="row">
					{#if game.room.round.timerEndsAt}
						<button class="play-btn ghost" type="button" onclick={() => game.pauseTimer()}>Pause</button>
					{:else}
						<button class="play-btn ghost" type="button" onclick={() => game.resumeTimer()}>Resume</button>
					{/if}
					<button class="play-btn ghost" type="button" onclick={() => game.addTime(30)}>+30s</button>
				</div>
				<button class="play-btn accent" type="button" onclick={() => game.openVote()}>
					Go to vote
				</button>
			{:else if game.phase === 'vote'}
				<button class="play-btn danger" type="button" onclick={() => game.reveal()}>
					Reveal
				</button>
			{:else if game.phase === 'result'}
				<button class="play-btn accent" type="button" onclick={() => game.nextRound()}>
					Next round
				</button>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 18px;
	}

	.back,
	.count {
		font-size: 0.82rem;
		font-weight: 800;
		color: var(--muted);
	}

	.code {
		font-family: var(--play-display);
		font-size: 1.35rem;
		letter-spacing: 0.14em;
		font-weight: 700;
	}

	.stack {
		display: grid;
		gap: 14px;
	}

	.stack-s {
		display: grid;
		gap: 12px;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.h {
		font-family: var(--play-display);
		font-size: clamp(1.8rem, 7vw, 2.4rem);
		letter-spacing: -0.04em;
		line-height: 1;
	}

	.mini {
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 999px;
		padding: 8px 12px;
		font-size: 0.82rem;
		font-weight: 800;
	}

	.mini.on {
		background: var(--ink);
		color: #fff;
		border-color: var(--ink);
	}

	.set {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-weight: 800;
		font-size: 0.92rem;
	}

	.set select {
		font: inherit;
		font-weight: 800;
		border-radius: 12px;
		border: 1px solid var(--line);
		background: #fff;
		padding: 8px 10px;
	}

	.theme-grid {
		display: grid;
		gap: 8px;
	}

	.choice {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		column-gap: 10px;
		align-items: center;
	}

	.choice strong {
		font-size: 1.05rem;
	}

	.choice span {
		grid-column: 1;
		font-size: 0.8rem;
		color: var(--muted);
		font-weight: 700;
	}

	.choice em {
		grid-row: 1 / span 2;
		grid-column: 2;
		font-style: normal;
		font-family: var(--play-display);
		font-size: 1.6rem;
	}

	.choice.win {
		border-color: var(--gold);
	}

	.role-card {
		display: grid;
		gap: 10px;
		padding: 28px 22px;
		border-radius: 32px;
		background: #fff;
		border: 1px solid var(--line);
		min-height: 220px;
		align-content: center;
		text-align: center;
	}

	.role-card.imposter {
		background: #1a1012;
		color: #fff;
		border-color: #1a1012;
	}

	.role-card.imposter .play-kicker,
	.role-card.imposter .play-lead {
		color: rgba(255, 255, 255, 0.7);
	}

	.tiny-card {
		text-align: center;
		font-weight: 800;
		padding: 12px;
		border-radius: 16px;
		background: #fff;
		border: 1px solid var(--line);
	}

	.tiny-card.imposter {
		background: #1a1012;
		color: #fff;
		border-color: #1a1012;
	}

	.pill {
		color: #fff;
		border-radius: 999px;
		padding: 8px 12px;
		font-size: 0.85rem;
		font-weight: 800;
	}

	.stage {
		min-height: 52dvh;
	}
</style>
