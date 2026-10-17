<script lang="ts">
	import { resolve } from '$app/paths';
	import Alerts from './Alerts.svelte';
	import CountdownBar from './CountdownBar.svelte';
	import ModePicker from './ModePicker.svelte';
	import PlayerGrid from './PlayerGrid.svelte';
	import SketchBoard from './SketchBoard.svelte';
	import { getSession } from '$lib/game/session.svelte';
	import { THEMES, getTheme } from '$lib/game/themes';
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { rise, pop, flipCard } from '$lib/game/motion';
	import { GAMES, MAX_PLAYERS } from '$lib/game/types';

	type Options = [value: number, label: string][];

	const IMPOSTER_OPTIONS: Options = [
		[1, '1'],
		[2, '2'],
		[3, '3']
	];
	const DISCUSS_OPTIONS: Options = [
		[60, '1 min'],
		[90, '1.5 min'],
		[120, '2 min'],
		[180, '3 min'],
		[300, '5 min']
	];
	const DRAW_OPTIONS: Options = [
		[45, '45 sec'],
		[60, '1 min'],
		[120, '2 min'],
		[180, '3 min'],
		[300, '5 min'],
		[600, '10 min']
	];
	const ROUND_OPTIONS: Options = [
		[1, '1 round'],
		[2, '2 rounds'],
		[3, '3 rounds']
	];

	function withCurrent(options: Options, value: number): Options {
		if (options.some(([option]) => option === value)) return options;
		const label = value % 60 === 0 ? `${value / 60} min` : `${value} sec`;
		const extra: Options[number] = [value, label];
		return [...options, extra].sort((a, b) => a[0] - b[0]);
	}

	const game = getSession();
	let copied = $state(false);

	const meta = $derived(GAMES[game.mode]);
	const host = $derived(game.players.find((p) => p.id === game.room?.hostId) ?? null);
	const shareUrl = $derived(
		typeof location === 'undefined' ? '' : `${location.origin}/play/${game.code}`
	);
	const votedThemes = $derived(game.players.filter((p) => p.themeVote).length);
	const votedPeople = $derived(game.players.filter((p) => p.accused).length);
	const readyCount = $derived(game.players.filter((p) => p.ready).length);
	const pollThemes = $derived(THEMES.filter((t) => game.room?.poll.themeIds.includes(t.id)));
	const choice = $derived(getTheme(game.pollChoice));
	const lastTurn = $derived(
		Boolean(game.sketch && game.sketch.turnIndex + 1 >= game.sketch.order.length)
	);
	const fill = $derived(game.phase === 'sketch' || game.phase === 'sketch-reveal');
	const subtitle = $derived.by(() => {
		const sketch = game.sketch;
		if (!fill || !sketch?.order.length) return '';
		const turn = Math.min(sketch.turnIndex + 1, sketch.order.length);
		return `${game.theme?.label ?? 'Sketch'} · ${turn}/${sketch.order.length}`;
	});
	const timer = $derived.by(() => {
		const room = game.room;
		if (room?.phase === 'discuss') {
			return {
				endsAt: room.round.timerEndsAt ?? null,
				pausedMs: room.round.timerPausedMs ?? null,
				totalMs: room.settings.discussSeconds * 1000
			};
		}
		if (room?.phase === 'sketch') {
			return {
				endsAt: room.sketch?.turnEndsAt ?? null,
				pausedMs: null,
				totalMs: room.settings.drawSeconds * 1000
			};
		}
		return null;
	});

	function flash() {
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(game.code);
			flash();
		} catch {
			copied = false;
		}
	}

	async function share() {
		if (navigator.share) {
			await navigator.share({ title: 'Join my game', text: `Room ${game.code}`, url: shareUrl });
			return;
		}
		await navigator.clipboard.writeText(shareUrl);
		flash();
	}
</script>

{#snippet setting(label: string, value: number, options: Options, pick: (value: number) => void)}
	<label class="set">
		<span>{label}</span>
		<select {value} onchange={(e) => pick(Number(e.currentTarget.value))}>
			{#each options as [optionValue, optionLabel] (optionValue)}
				<option value={optionValue}>{optionLabel}</option>
			{/each}
		</select>
	</label>
{/snippet}

{#snippet sketchSettings(includeRounds: boolean)}
	{@render setting(
		'Draw time',
		game.room?.settings.drawSeconds ?? 600,
		withCurrent(DRAW_OPTIONS, game.room?.settings.drawSeconds ?? 600),
		(n) => game.setDrawSeconds(n)
	)}
	{#if includeRounds}
		{@render setting(
			'Rounds',
			game.room?.settings.sketchRounds ?? 1,
			ROUND_OPTIONS,
			(n) => game.setSetting('sketchRounds', n)
		)}
	{/if}
{/snippet}

{#snippet liveSketchSettings()}
	<details class="settings live">
		<summary class="btn small">Settings</summary>
		<div class="stack panel">
			{@render sketchSettings(false)}
		</div>
	</details>
{/snippet}

{#snippet hostMenu()}
	<details class="host-menu">
		<summary class="pill-btn">Host</summary>
		<div class="menu stack">
			{@render sketchSettings(false)}
			<button class="btn small" type="button" onclick={() => game.endSketchTurn()}>End turn</button>
		</div>
	</details>
{/snippet}

{#if game.room}
<div class="shell" class:fill>
	{#if timer}
		<CountdownBar endsAt={timer.endsAt} pausedMs={timer.pausedMs} totalMs={timer.totalMs} />
	{/if}

	<header class="top">
		<a href={resolve('/play')} class="leave" onclick={() => void game.leave()}>Leave</a>
		{#if subtitle}
			<span class="subtitle">{subtitle}</span>
		{:else}
			<strong class="room">{game.code}</strong>
		{/if}
		{#if game.isHost && game.phase === 'sketch'}
			{@render hostMenu()}
		{:else}
			<span class="count">{game.playerCount}/{MAX_PLAYERS}</span>
		{/if}
	</header>

	<Alerts items={game.alerts} />

	{#if game.error}
		<p class="warn">{game.error}</p>
	{/if}

	{#key game.phase}
		<main class="stage">
			{#if game.phase === 'lobby'}
				<section class="stack" {@attach rise()}>
					<button class="code-card neu" type="button" onclick={copyCode} {@attach pop()}>
						<span class="label">{copied ? 'Copied' : 'Room code · tap to copy'}</span>
						<strong>{game.code}</strong>
					</button>
					<button class="btn small share" type="button" onclick={share}>Share invite link</button>

					<PlayerGrid players={game.players} hostId={game.room.hostId} meId={game.playerId} />

					{#if game.isHost}
						<ModePicker value={game.mode} onPick={(mode) => game.setMode(mode)} />
						<details class="settings">
							<summary class="btn small">Settings</summary>
							<div class="stack panel">
								<p class="label">Themes in the poll</p>
								<div class="row">
									{#each THEMES as theme (theme.id)}
										<button
											class="chip"
											class:on={game.room.poll.themeIds.includes(theme.id)}
											type="button"
											onclick={() => game.togglePollTheme(theme.id)}
										>
											{theme.label}
										</button>
									{/each}
								</div>
								{#if game.mode === 'imposter'}
									{@render setting('Imposters', game.room.settings.imposterCount, IMPOSTER_OPTIONS, (n) =>
										game.setImposterCount(n)
									)}
									{@render setting('Discussion', game.room.settings.discussSeconds, DISCUSS_OPTIONS, (n) =>
										game.setSetting('discussSeconds', n)
									)}
								{:else}
									{@render sketchSettings(true)}
								{/if}
							</div>
						</details>
					{:else}
						<p class="game-tag">{meta.label}</p>
						<p class="muted">Waiting for {host?.name ?? 'the host'} to start…</p>
					{/if}
				</section>
			{:else if game.phase === 'poll'}
				<section class="poll" {@attach rise()}>
					<h1 class="title">{game.isHost ? 'Pick a theme' : 'Vote for a theme'}</h1>
					<p class="muted">
						{votedThemes}/{game.playerCount} voted · {game.isHost
							? 'your pick is final'
							: `${host?.name ?? 'The host'} makes the final call`}
					</p>
					<div class="themes">
						{#each pollThemes as theme (theme.id)}
							{@const votes = game.pollCounts[theme.id] ?? 0}
							{@const picked = game.room.poll.winnerId === theme.id}
							<button
								class="theme"
								class:on={game.me?.themeVote === theme.id}
								class:pick={picked}
								type="button"
								aria-pressed={game.isHost ? picked : game.me?.themeVote === theme.id}
								onclick={() => (game.isHost ? game.pickTheme(theme.id) : game.voteTheme(theme.id))}
							>
								{#if picked}<i {@attach pop()}>Host pick</i>{/if}
								<strong>{theme.label}</strong>
								<span>{theme.korean}</span>
								{#if votes > 0}<em>{votes}</em>{/if}
							</button>
						{/each}
					</div>
				</section>
			{:else if game.phase === 'reveal'}
				<section class="stack" {@attach pop()}>
					<p class="label">{getTheme(game.card?.themeId)?.label ?? 'Your card'}</p>
					<div class="role neu" class:imposter={game.card?.isImposter} {@attach flipCard()}>
						{#if game.card?.isImposter}
							<p class="label">Shh…</p>
							<p class="big">You’re the imposter</p>
							<p class="muted">Blend in and figure out the word.</p>
						{:else}
							<p class="label">The word</p>
							<p class="big">{game.card?.word ?? '…'}</p>
							<p class="muted">Describe it without saying it.</p>
						{/if}
					</div>
					<p class="muted">{readyCount}/{game.playerCount} ready</p>
					{#if !game.me?.ready}
						<button class="btn accent" type="button" onclick={() => game.setReady()}>Got it</button>
					{/if}
				</section>
			{:else if game.phase === 'discuss'}
				<section class="stack" {@attach rise()}>
					<h1 class="title">Discuss</h1>
					<p class="reminder" class:imposter={game.card?.isImposter}>
						{game.card?.isImposter ? 'You’re the imposter' : game.card?.word}
					</p>
					<PlayerGrid players={game.players} hostId={game.room.hostId} meId={game.playerId} />
				</section>
			{:else if game.phase === 'vote'}
				<section class="stack" {@attach rise()}>
					<h1 class="title">Who’s the imposter?</h1>
					<p class="muted">{votedPeople}/{game.playerCount} voted</p>
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
					<p class="label">{game.room.result?.villageWon ? 'Caught!' : 'Got away'}</p>
					<h1 class="title">
						{game.room.result?.villageWon ? 'Players win' : 'Imposter wins'}
					</h1>
					<div class="neu">
						<p class="label">The word was</p>
						<p class="big">{game.room.result?.secret}</p>
					</div>
					<div class="row">
						{#each game.room.result?.imposters ?? [] as id (id)}
							{@const p = game.room.players[id]}
							{#if p}
								<span class="pill" style:background={PLAYER_COLORS[p.color]}>{p.name}</span>
							{/if}
						{/each}
					</div>
					<p class="muted">
						{#if game.room.result?.accused}
							Voted out: {game.room.players[game.room.result.accused]?.name ?? 'someone'}
						{:else}
							Tie vote — the imposter slips away.
						{/if}
					</p>
				</section>
			{:else if game.phase.startsWith('sketch')}
				<SketchBoard />
			{/if}
		</main>
	{/key}

	{#if game.isHost && game.phase !== 'sketch'}
		<div class="dock">
			{#if game.phase === 'lobby'}
				<button
					class="btn accent"
					type="button"
					disabled={game.playerCount < meta.minPlayers}
					onclick={() => game.startPoll()}
				>
					{game.playerCount < meta.minPlayers ? `Need ${meta.minPlayers} players` : 'Start'}
				</button>
			{:else if game.phase === 'poll'}
				{#if game.mode === 'sketch'}
					{@render liveSketchSettings()}
				{/if}
				<button class="btn accent" type="button" onclick={() => game.deal()}>
					{choice ? `Start with ${choice.label}` : 'Start game'}
				</button>
			{:else if game.phase === 'reveal'}
				<button class="btn accent" type="button" onclick={() => game.startDiscuss()}>
					Start discussion
				</button>
			{:else if game.phase === 'discuss'}
				<div class="pair">
					{#if game.room.round.timerEndsAt}
						<button class="btn" type="button" onclick={() => game.pauseTimer()}>Pause</button>
					{:else}
						<button class="btn" type="button" onclick={() => game.resumeTimer()}>Resume</button>
					{/if}
					<button class="btn" type="button" onclick={() => game.addTime(30)}>+30s</button>
				</div>
				<button class="btn accent" type="button" onclick={() => game.openVote()}>Vote now</button>
			{:else if game.phase === 'vote'}
				<button class="btn danger" type="button" onclick={() => game.reveal()}>Reveal</button>
			{:else if game.phase === 'result' || game.phase === 'sketch-final'}
				<button class="btn accent" type="button" onclick={() => game.nextRound()}>Play again</button>
			{:else if game.phase === 'sketch-reveal'}
				{@render liveSketchSettings()}
				<button class="btn accent" type="button" onclick={() => game.nextDrawer()}>
					{lastTurn ? 'Final scores' : 'Next drawer'}
				</button>
			{/if}
		</div>
	{/if}
</div>
{/if}

<style>
	.shell {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.shell.fill {
		height: 100%;
		max-height: 100%;
		overflow: hidden;
	}

	.top {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		margin-bottom: 22px;
	}

	.fill .top {
		margin-bottom: 2px;
	}

	.leave,
	.count {
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--muted);
	}

	.leave {
		justify-self: start;
	}

	.count {
		justify-self: end;
	}

	.room {
		font-size: 1.15rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		padding-left: 0.2em;
	}

	.subtitle {
		max-width: 52vw;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.host-menu {
		position: relative;
		justify-self: end;
	}

	.host-menu summary {
		list-style: none;
		cursor: pointer;
	}

	.host-menu summary::-webkit-details-marker {
		display: none;
	}

	.pill-btn {
		padding: 6px 14px;
		border-radius: 999px;
		box-shadow: var(--raise-sm);
		font-size: 0.85rem;
		font-weight: 800;
	}

	.host-menu[open] .pill-btn {
		box-shadow: var(--press-sm);
		color: var(--accent);
	}

	.menu {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		z-index: 30;
		width: min(280px, 80vw);
		padding: 16px;
		border-radius: 22px;
		background: var(--bg);
		box-shadow: var(--raise);
	}

	.stage {
		flex: 1;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.stage::-webkit-scrollbar {
		display: none;
	}

	.fill .stage {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.fill .dock {
		margin-top: 10px;
		padding-top: 4px;
	}

	.code-card {
		display: grid;
		gap: 6px;
		width: 100%;
	}

	.code-card strong {
		font-size: clamp(3rem, 16vw, 4.4rem);
		font-weight: 900;
		letter-spacing: 0.18em;
		line-height: 1;
		padding-left: 0.18em;
	}

	.share {
		justify-self: center;
	}

	.settings {
		display: grid;
		justify-items: center;
	}

	.settings summary {
		list-style: none;
		cursor: pointer;
	}

	.settings summary::-webkit-details-marker {
		display: none;
	}

	.settings[open] summary {
		box-shadow: var(--press-sm);
		color: var(--accent);
	}

	.settings.live {
		width: 100%;
	}

	.panel {
		width: 100%;
		margin-top: 16px;
		padding: 18px;
		border-radius: 24px;
		box-shadow: var(--press);
	}

	.set {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-weight: 800;
	}

	.set select {
		padding: 10px 14px;
		border: none;
		border-radius: 14px;
		background: var(--bg);
		box-shadow: var(--raise-sm);
		color: var(--ink);
		font: inherit;
		font-weight: 800;
	}

	.game-tag {
		justify-self: center;
		padding: 10px 20px;
		border-radius: 999px;
		box-shadow: var(--press-sm);
		color: var(--accent);
		font-weight: 900;
	}

	.poll {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.themes {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-content: start;
		gap: 14px;
		padding: 14px 6px 18px;
	}

	.themes::-webkit-scrollbar {
		display: none;
	}

	.theme {
		position: relative;
		display: grid;
		gap: 2px;
		padding: 16px 10px;
		border-radius: 22px;
		box-shadow: var(--raise-sm);
		transition: box-shadow 0.15s ease;
	}

	.theme strong {
		font-size: 1rem;
		font-weight: 800;
	}

	.theme span {
		font-size: 0.78rem;
		color: var(--muted);
		font-weight: 700;
	}

	.theme em {
		position: absolute;
		top: 8px;
		right: 10px;
		min-width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-size: 0.78rem;
		font-style: normal;
		font-weight: 900;
	}

	.theme.on {
		box-shadow: var(--press);
	}

	.theme.on strong {
		color: var(--accent);
	}

	.theme.pick {
		box-shadow:
			0 0 0 3px var(--gold),
			var(--raise-sm);
	}

	.theme.on.pick {
		box-shadow:
			0 0 0 3px var(--gold),
			var(--press);
	}

	.theme i {
		position: absolute;
		top: -9px;
		inset-inline: 0;
		width: max-content;
		margin-inline: auto;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--gold);
		color: #fff;
		font-size: 0.62rem;
		font-style: normal;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.role {
		display: grid;
		gap: 12px;
		min-height: 240px;
		align-content: center;
	}

	.role.imposter {
		background: var(--ink);
		color: #fff;
	}

	.reminder {
		justify-self: center;
		padding: 12px 22px;
		border-radius: 999px;
		box-shadow: var(--press-sm);
		font-size: 1.15rem;
		font-weight: 900;
	}

	.reminder.imposter {
		color: var(--danger);
	}

	.pill {
		padding: 8px 14px;
		border-radius: 999px;
		color: #fff;
		font-weight: 800;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
</style>
