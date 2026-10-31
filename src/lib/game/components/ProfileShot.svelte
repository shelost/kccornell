<script lang="ts">
	import type { Profile } from '$lib/game/profiles';

	let { profile, size = 'lg' }: { profile: Profile; size?: 'sm' | 'lg' | 'xl' } = $props();
</script>

<span class={['shot', size]}>
	<img src={profile.photo} alt={profile.displayName} />
</span>

<style>
	.shot {
		display: grid;
		place-items: center;
		overflow: hidden;
		border-radius: 50%;
		background: #1a1a1a;
		box-shadow: var(--raise-sm);
		flex-shrink: 0;
	}

	.shot.sm {
		width: 72px;
		height: 72px;
	}

	.shot.lg {
		width: 148px;
		height: 148px;
	}

	.shot.xl {
		width: min(220px, 56vw);
		height: min(220px, 56vw);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
