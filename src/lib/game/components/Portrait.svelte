<script lang="ts">
	import { gsap } from 'gsap';
	import type { Attachment } from 'svelte/attachments';
	import { reduceMotion } from '$lib/game/motion';
	import { portrait } from '$lib/game/portrait.svelte';
	import Face from './Face.svelte';
	import Hashtags from './Hashtags.svelte';

	let closing = false;
	let timeline: gsap.core.Timeline | null = null;

	const person = $derived(portrait.person);

	const fly: Attachment = (node) => {
		closing = false;
		const shot = node.querySelector<HTMLElement>('.shot');
		const veil = node.querySelector<HTMLElement>('.veil');
		const meta = node.querySelector<HTMLElement>('.meta');
		const from = portrait.from;
		if (!shot || !veil || !meta) return;

		const ctx = gsap.context(() => {
			const end = shot.getBoundingClientRect();
			if (reduceMotion() || !from || end.width < 1) {
				gsap.set([veil, shot, meta], { autoAlpha: 1, x: 0, y: 0, scale: 1 });
				return;
			}

			const dx = from.left + from.width / 2 - (end.left + end.width / 2);
			const dy = from.top + from.height / 2 - (end.top + end.height / 2);

			gsap.set(veil, { autoAlpha: 0 });
			gsap.set(meta, { autoAlpha: 0, y: 22 });
			gsap.set(shot, {
				x: dx,
				y: dy,
				scale: from.width / end.width,
				autoAlpha: 1,
				transformOrigin: '50% 50%'
			});

			timeline = gsap
				.timeline({ defaults: { ease: 'power3.out' } })
				.to(veil, { autoAlpha: 1, duration: 0.38 }, 0)
				.to(shot, { x: 0, y: 0, scale: 1, duration: 0.64, ease: 'power4.out' }, 0)
				.to(meta, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.2);
		}, node);

		return () => {
			timeline = null;
			ctx.revert();
		};
	};

	function dismiss() {
		if (!person || closing) return;
		closing = true;
		const tl = timeline;
		if (!tl || reduceMotion()) {
			portrait.close();
			closing = false;
			return;
		}
		tl.eventCallback('onReverseComplete', () => {
			portrait.close();
			closing = false;
		});
		tl.reverse();
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') dismiss();
	}
</script>

<svelte:window onkeydown={onKey} />

{#if person}
	{#key person.id}
		<div
			class="layer"
			role="dialog"
			aria-modal="true"
			aria-label={person.profile?.displayName ?? person.name}
			{@attach fly}
		>
			<button class="veil" type="button" aria-label="Close portrait" onclick={dismiss}></button>
			<button class="shot" type="button" aria-label="Close portrait" onclick={dismiss}>
				{#if person.profile}
					<img src={person.profile.photo} alt={person.profile.displayName} />
				{:else}
					<Face name={person.name} color={person.color ?? 0} size={280} />
				{/if}
			</button>
			<div class="meta">
				<p class="who">{person.profile?.shortName ?? person.name}</p>
				{#if person.profile && person.profile.displayName !== person.profile.shortName}
					<p class="full">{person.profile.displayName}</p>
				{/if}
				{#if person.profile?.tags.length}
					<Hashtags tags={person.profile.tags} />
				{/if}
			</div>
		</div>
	{/key}
{/if}

<style>
	:global(.portrait-hidden) {
		visibility: hidden !important;
	}

	.layer {
		position: absolute;
		inset: 0;
		z-index: 80;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 18px;
		padding: 24px;
		pointer-events: auto;
	}

	.veil {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(5, 5, 8, 0.78);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		cursor: pointer;
	}

	.shot {
		position: relative;
		z-index: 1;
		width: min(72vw, 300px);
		height: min(72vw, 300px);
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: 50%;
		background: #1a1a1a;
		box-shadow:
			0 18px 50px rgba(0, 0, 0, 0.45),
			0 0 0 3px rgba(255, 255, 255, 0.08);
		cursor: pointer;
	}

	.shot :global(.face) {
		width: 100% !important;
		height: 100% !important;
		box-shadow: none;
	}

	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.meta {
		position: relative;
		z-index: 1;
		display: grid;
		justify-items: center;
		gap: 8px;
		max-width: 20rem;
	}

	.who {
		font-size: clamp(1.8rem, 8vw, 2.4rem);
		font-weight: 900;
		letter-spacing: -0.05em;
		line-height: 1;
	}

	.full {
		color: var(--muted);
		font-size: 0.95rem;
		font-weight: 700;
	}
</style>
