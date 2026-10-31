<script lang="ts">
	import { pop, rise } from '$lib/game/motion';
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

<button class="hello" type="button" onclick={onContinue} {@attach enter}>
	<span class="pic" {@attach popIn}>
		<ProfileShot {profile} size="xl" />
	</span>
	<h1 class="title">Welcome Back, {profile.shortName}!</h1>
	<Hashtags tags={profile.tags} />
	<p class="muted">{profile.displayName}</p>
	{#if showCta}
		<span class="btn accent">{cta}</span>
	{/if}
</button>

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
	}
</style>
