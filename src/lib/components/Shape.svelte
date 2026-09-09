<script lang="ts">
	interface Props {
		shape: 'triangle' | 'diamond' | 'circle' | 'square';
		color?: string;
		size?: number;
	}

	let { shape, color = 'currentColor', size = 22 }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
	{#if shape === 'triangle'}
		<path d="M12 2.5c.9 0 1.7.47 2.15 1.25l8.4 14.5c.9 1.56-.22 3.5-2.02 3.5H3.47c-1.8 0-2.92-1.94-2.02-3.5l8.4-14.5A2.48 2.48 0 0 1 12 2.5Z" />
	{:else if shape === 'diamond'}
		<path d="M10.3 1.7a2.4 2.4 0 0 1 3.4 0l8.6 8.6a2.4 2.4 0 0 1 0 3.4l-8.6 8.6a2.4 2.4 0 0 1-3.4 0l-8.6-8.6a2.4 2.4 0 0 1 0-3.4l8.6-8.6Z" />
	{:else if shape === 'circle'}
		<circle cx="12" cy="12" r="10.5" />
	{:else}
		<rect x="1.5" y="1.5" width="21" height="21" rx="4.5" />
	{/if}
</svg>
