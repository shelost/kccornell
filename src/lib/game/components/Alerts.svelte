<script lang="ts">
	import { fade } from 'svelte/transition';
	import { pop } from '$lib/game/motion';
	import type { Alert } from '$lib/game/types';

	let { items }: { items: Alert[] } = $props();
</script>

<div class="alerts" role="status" aria-live="assertive">
	{#each items as item (item.id)}
		<p
			class="alert"
			class:good={item.tone === 'good'}
			class:warn={item.tone === 'warn'}
			{@attach pop()}
			out:fade={{ duration: 180 }}
		>
			{item.text}
		</p>
	{/each}
</div>

<style>
	.alerts {
		position: fixed;
		top: calc(70px + env(safe-area-inset-top));
		left: 50%;
		z-index: 40;
		display: grid;
		justify-items: center;
		gap: 8px;
		width: min(420px, calc(100% - 32px));
		transform: translateX(-50%);
		pointer-events: none;
	}

	.alert {
		padding: 12px 22px;
		border-radius: 999px;
		background: var(--bg);
		box-shadow: var(--raise);
		font-size: 1.05rem;
		font-weight: 900;
	}

	.alert.good {
		background: linear-gradient(135deg, #46dfa0, var(--good));
		color: #fff;
		box-shadow:
			6px 6px 16px color-mix(in srgb, var(--good) 40%, transparent),
			-6px -6px 14px var(--sl);
	}

	.alert.warn {
		background: linear-gradient(135deg, #ffd36a, var(--gold));
		color: #1c2130;
		box-shadow:
			6px 6px 16px color-mix(in srgb, var(--gold) 40%, transparent),
			-6px -6px 14px var(--sl);
	}
</style>
