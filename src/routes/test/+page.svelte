<script lang="ts">
	import { resolve } from '$app/paths';
	import NameStep from '$lib/game/components/NameStep.svelte';
	import ProfileShot from '$lib/game/components/ProfileShot.svelte';
	import WelcomeBack from '$lib/game/components/WelcomeBack.svelte';
	import { matchProfile, PROFILES } from '$lib/game/profiles';
	import { pop } from '$lib/game/motion';

	let name = $state('');
	let submitted = $state(false);
	const profile = $derived(matchProfile(name));
	const showWelcome = $derived(submitted && Boolean(profile));
	const popHit = pop();
</script>

<div class="lab" class:centered={showWelcome}>
	<p class="label">Profile test</p>

	{#if showWelcome && profile}
		<div class="center">
			<WelcomeBack
				{profile}
				cta="Try another"
				onContinue={() => {
					submitted = false;
					name = '';
				}}
			/>
			<a class="muted back" href={resolve('/play')}>Back to play</a>
		</div>
	{:else}
		<NameStep
			bind:value={name}
			cta="See profile"
			onSubmit={() => {
				submitted = true;
			}}
		/>

		{#if name.trim()}
			{#if profile}
				{#key profile.id}
					<div class="hit" {@attach popHit}>
						<ProfileShot {profile} size="lg" />
						<p class="title mini">Would match {profile.displayName}</p>
						<p class="muted">id · {profile.id}</p>
					</div>
				{/key}
			{:else}
				<p class="muted empty">No profile for “{name.trim()}”.</p>
			{/if}
		{/if}

		<div class="roster">
			<p class="label">Everyone</p>
			<ul>
				{#each PROFILES as person (person.id)}
					<li class:on={profile?.id === person.id}>
						<button
							type="button"
							onclick={() => {
								name = person.displayName;
								submitted = false;
							}}
						>
							<ProfileShot profile={person} size="sm" />
							<span class="who">
								<strong>{person.displayName}</strong>
								<em>{person.id}</em>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<a class="muted back" href={resolve('/play')}>Back to play</a>
</div>

<style>
	.lab {
		display: grid;
		gap: 22px;
		padding-bottom: 32px;
	}

	.lab.centered {
		flex: 1;
		min-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0;
		padding-bottom: 0;
		position: relative;
	}

	.lab.centered > .label {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
	}

	.center {
		flex: 1;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 8px;
		min-height: 0;
	}

	.hit {
		display: grid;
		justify-items: center;
		gap: 10px;
	}

	.mini {
		font-size: 1.35rem;
	}

	.empty {
		padding: 8px 0 4px;
	}

	.roster ul {
		display: grid;
		gap: 8px;
		margin: 10px 0 0;
		padding: 0;
		list-style: none;
	}

	.roster button {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 14px;
		width: 100%;
		padding: 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: 22px;
		background: var(--surface);
		text-align: left;
	}

	.roster li.on button {
		border-color: var(--accent);
	}

	.who {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.who strong {
		font-size: 1rem;
		font-weight: 800;
	}

	.who em {
		color: var(--muted);
		font-size: 0.78rem;
		font-style: normal;
		font-weight: 700;
	}

	.back {
		justify-self: center;
		padding: 8px;
		font-size: 0.82rem;
	}
</style>
