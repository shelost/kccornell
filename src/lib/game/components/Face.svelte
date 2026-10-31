<script lang="ts">
	import { PLAYER_COLORS } from '$lib/game/ids';
	import { matchProfile, type Profile } from '$lib/game/profiles';

	let {
		name,
		color = 0,
		profile = null,
		size = 48
	}: {
		name: string;
		color?: number;
		profile?: Profile | null;
		size?: number;
	} = $props();

	const hit = $derived(profile ?? matchProfile(name));
</script>

<span
	class="face"
	style:width="{size}px"
	style:height="{size}px"
	style:background={hit ? '#1a1a1a' : (PLAYER_COLORS[color] ?? '#6a4cf5')}
>
	{#if hit}
		<img src={hit.photo} alt="" />
	{:else}
		{name.slice(0, 1).toUpperCase()}
	{/if}
</span>

<style>
	.face {
		display: grid;
		place-items: center;
		overflow: hidden;
		border-radius: 50%;
		color: #fff;
		font-weight: 900;
		font-size: 1.1rem;
		box-shadow: var(--raise-sm);
		flex-shrink: 0;
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
