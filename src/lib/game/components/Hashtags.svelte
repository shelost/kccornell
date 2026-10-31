<script lang="ts">
	import { gsap } from 'gsap';
	import type { Attachment } from 'svelte/attachments';
	import { reduceMotion } from '$lib/game/motion';

	let { tags }: { tags: string[] } = $props();

	function slam(): Attachment {
		return (node) => {
			const items = node.querySelectorAll('.tag');
			if (!items.length || reduceMotion()) return;
			const ctx = gsap.context(() => {
				const tl = gsap.timeline();
				items.forEach((item, index) => {
					tl.fromTo(
						item,
						{ autoAlpha: 0, scale: 2.6, y: -28, rotation: index % 2 ? 8 : -8 },
						{ autoAlpha: 1, scale: 1, y: 0, rotation: 0, duration: 0.26, ease: 'power4.in' },
						index === 0 ? 0 : '+=0.07'
					)
						.to(item, { scale: 1.12, duration: 0.05, ease: 'none' })
						.to(item, { scale: 1, duration: 0.12, ease: 'power2.out' });
				});
			}, node);
			return () => ctx.revert();
		};
	}
</script>

{#if tags.length}
	<p class="hash" {@attach slam()}>
		{#each tags as tag (tag)}
			<span class="tag">{tag}</span>
		{/each}
	</p>
{/if}

<style>
	.hash {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin: 0;
	}

	.tag {
		padding: 10px 16px;
		border: 1.5px solid var(--pill-line);
		border-radius: 999px;
		background: var(--pill);
		color: var(--ink);
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
</style>
