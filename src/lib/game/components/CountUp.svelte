<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';

	let { value, duration = 900 }: { value: number; duration?: number } = $props();

	const shown = Tween.of(() => value, {
		duration: () => (prefersReducedMotion.current ? 0 : duration),
		easing: cubicOut
	});
</script>

{Math.round(shown.current)}
