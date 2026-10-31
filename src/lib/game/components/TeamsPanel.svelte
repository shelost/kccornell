<script lang="ts">
	import { getSession } from '$lib/game/session.svelte';
	import type { TeamPlan } from '$lib/game/types';

	const game = getSession();

	const teams = $derived(game.room?.teams ?? null);
	const mine = $derived(teams?.assignments[game.playerId] ?? null);
	const mates = $derived(
		game.players.filter((player) => mine != null && teams?.assignments[player.id] === mine)
	);
	const groups = $derived.by(() => {
		const assignments = teams?.assignments ?? {};
		const buckets: Record<number, string[]> = {};
		for (const player of game.players) {
			const team = assignments[player.id];
			if (!team) continue;
			buckets[team] = [...(buckets[team] ?? []), player.name];
		}
		return Object.entries(buckets)
			.map(([team, names]) => [Number(team), names] as const)
			.sort((a, b) => a[0] - b[0]);
	});

	const sizeChoices = [2, 3, 4, 5, 6];
	const countChoices = $derived(
		Array.from({ length: Math.max(0, game.playerCount - 1) }, (_, index) => index + 2)
	);

	function pick(plan: TeamPlan, value: number) {
		void game.setTeamPlan(plan, value);
	}
</script>

{#if teams}
	<section class="teams neu">
		{#if teams.status === 'forming'}
			<p class="label">Create teams</p>
			{#if game.isHost}
				<div class="row">
					<button
						class="chip"
						class:on={teams.plan === 'size'}
						type="button"
						onclick={() => pick('size', teams.perTeam)}
					>
						Players per team
					</button>
					<button
						class="chip"
						class:on={teams.plan === 'count'}
						type="button"
						onclick={() => pick('count', teams.teamCount)}
					>
						Number of teams
					</button>
				</div>
				<div class="row">
					{#each teams.plan === 'size' ? sizeChoices : countChoices as value (value)}
						<button
							class="chip"
							class:on={(teams.plan === 'size' ? teams.perTeam : teams.teamCount) === value}
							type="button"
							onclick={() => pick(teams.plan, value)}
						>
							{value}
						</button>
					{/each}
				</div>
				<button class="btn accent" type="button" disabled={game.playerCount < 2} onclick={() => game.assignTeams()}>
					Assign teams
				</button>
			{:else}
				<p class="muted">{game.players.find((player) => player.id === game.room?.hostId)?.name ?? 'The host'} is making teams.</p>
			{/if}
		{:else if mine}
			<p class="label">Your team</p>
			<p class="big">Team {mine}</p>
			<p class="mates">{mates.map((player) => (player.id === game.playerId ? 'You' : player.name)).join(' · ')}</p>
			{#if game.isHost}
				<ul class="all">
					{#each groups as [team, names] (team)}
						<li><strong>Team {team}</strong> {names.join(', ')}</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<p class="muted">You’re not on a team yet.</p>
		{/if}
		{#if game.isHost}
			<button class="ghost" type="button" onclick={() => game.clearTeams()}>Clear teams</button>
		{/if}
	</section>
{/if}

<style>
	.teams {
		display: grid;
		gap: 12px;
		text-align: center;
	}

	.mates {
		font-weight: 800;
	}

	.all {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 6px;
		text-align: left;
		font-size: 0.92rem;
	}

	.ghost {
		color: var(--muted);
		font-size: 0.82rem;
		font-weight: 800;
	}
</style>
