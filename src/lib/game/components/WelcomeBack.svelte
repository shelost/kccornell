<script lang="ts">
	import { pop, rise } from '$lib/game/motion';
	import { portrait } from '$lib/game/portrait.svelte';
	import type { Profile } from '$lib/game/profiles';
	import ProfileShot from './ProfileShot.svelte';
	import Hashtags from './Hashtags.svelte';

	let {
		profile,
		onContinue,
		cta = 'Continue',
		showCta = true
	}: {
		profile: Profile;
		onContinue: () => void;
		cta?: string;
		showCta?: boolean;
	} = $props();

	const enter = rise();
	const popIn = pop();
</script>

<div class="hello" {@attach enter}>
	<button
		class="pic"
		type="button"
		aria-label={`View ${profile.displayName}`}
		onclick={(event) =>
			portrait.show({ id: profile.id, name: profile.displayName, profile }, event.currentTarget)}
		{@attach popIn}
	>
		<ProfileShot {profile} size="xl" />
	</button>
	<h1 class="title">Welcome Back, {profile.shortName}!</h1>
	<Hashtags tags={profile.tags} />
	<p class="muted">{profile.displayName}</p>
	{#if showCta}
		<button class="btn accent" type="button" onclick={onContinue}>{cta}</button>
	{/if}
</div>

<style>
	.hello {
		flex: 1;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 16px;
		width: 100%;
		min-height: 0;
		padding: 12px 0;
	}

	.pic {
		display: grid;
		margin-bottom: 8px;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
</style>
