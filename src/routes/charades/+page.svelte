<script lang="ts">
	import { resolve } from '$app/paths';
	import CharadesBoard from '$lib/game/components/CharadesBoard.svelte';
</script>

<div class="page">
	<a class="exit-game" href={resolve('/play')}>Exit</a>
	<CharadesBoard />
</div>

<style>
	.page {
		flex: 1;
		min-height: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
