<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import NameStep from '$lib/game/components/NameStep.svelte';
	import RateSlider from '$lib/game/components/RateSlider.svelte';
	import Roster from '$lib/game/components/Roster.svelte';
	import WelcomeBack from '$lib/game/components/WelcomeBack.svelte';
	import { matchProfile } from '$lib/game/profiles';
	import { getSession } from '$lib/game/session.svelte';
	import { normalizeCode } from '$lib/game/ids';
	import { reduceMotion, rise } from '$lib/game/motion';
	import { gsap } from 'gsap';
	import type { Attachment } from 'svelte/attachments';
	import { CODE_LENGTH } from '$lib/game/types';

	const game = getSession();
	let name = $state(game.rememberedName());
	let code = $state('');
	let rating = $state(0);
	let step = $state<'intro' | 'rate' | 'name' | 'welcome' | 'lobby'>('intro');
	const profile = $derived(matchProfile(name));
	const codeReady = $derived(normalizeCode(code).length === CODE_LENGTH);
	const introAnim = playIntro();

	function slamWord(word: Element, intensity: number) {
		const slam = gsap.timeline();
		slam
			.fromTo(
				word,
				{
					autoAlpha: 0,
					scale: 3.4 + intensity * 0.7,
					y: -80 - intensity * 18,
					rotation: -10 - intensity * 3
				},
				{
					autoAlpha: 1,
					scale: 1,
					y: 0,
					rotation: 0,
					duration: 0.32,
					ease: 'power4.in'
				}
			)
			.to(word, { scale: 1.1, duration: 0.07, ease: 'none' })
			.to(word, { scale: 1, duration: 0.16, ease: 'power2.out' });
		return slam;
	}

	function playIntro(): Attachment {
		return (element) => {
			const hidden = element.querySelectorAll('.kicker, .word, .tag, .rule, .feat, .spark, .go, .flash');
			const words = Array.from(element.querySelectorAll('.word'));
			const tags = Array.from(element.querySelectorAll('.tag'));
			const intro = element.querySelector('.intro');
			const flash = element.querySelector('.flash');

			const ctx = gsap.context(() => {
				gsap.set(hidden, { autoAlpha: 0 });

				if (reduceMotion() || words.length < 3) {
					gsap.set(hidden, { autoAlpha: 1 });
					gsap.set(flash, { autoAlpha: 0 });
					return;
				}

				const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
				tl.to({}, { duration: 0.7 })
					.fromTo(
						'.kicker',
						{ autoAlpha: 0, y: 26 },
						{ autoAlpha: 1, y: 0, duration: 2.6, ease: 'power1.out' }
					)
					.to({}, { duration: 0.55 })
					.add(slamWord(words[0], 0))
					.to(
						intro,
						{ x: 11, duration: 0.03, yoyo: true, repeat: 7, ease: 'none' },
						'<'
					)
					.add(slamWord(words[1], 1), '+=0.14')
					.to(
						intro,
						{ x: 14, duration: 0.03, yoyo: true, repeat: 9, ease: 'none' },
						'<'
					)
					.add(slamWord(words[2], 2), '+=0.18')
					.to(
						intro,
						{ x: 18, duration: 0.03, yoyo: true, repeat: 11, ease: 'none' },
						'<'
					)
					.fromTo(
						'.flash',
						{ autoAlpha: 0.88 },
						{ autoAlpha: 0, duration: 0.42, ease: 'power2.out' },
						'<'
					);
				tags.forEach((tag, index) => {
					if (!tag) return;
					tl.add(slamWord(tag, index), '+=0.08');
				});
				tl.fromTo(
						'.rule',
						{ scaleX: 0, autoAlpha: 0 },
						{ scaleX: 1, autoAlpha: 1, duration: 0.35, ease: 'power2.out' },
						'-=0.22'
					)
					.fromTo('.feat', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45 }, '-=0.06')
					.fromTo(
						'.spark',
						{ scale: 0, autoAlpha: 0 },
						{ scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(2.2)' },
						'-=0.35'
					)
					.fromTo('.go', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, '-=0.12');
			}, element);

			return () => ctx.revert();
		};
	}

	async function create() {
		if (game.busy) return;
		try {
			const room = await game.create(name);
			await goto(resolve('/play/[code]', { code: room }));
		} catch {
			/* error is shown from session */
		}
	}

	async function join(event: SubmitEvent) {
		event.preventDefault();
		if (!codeReady || game.busy) return;
		await game.join(normalizeCode(code), name);
		if (game.room) await goto(resolve('/play/[code]', { code: game.room.code }));
	}
</script>

{#if step !== 'intro'}
	<button class="exit-game" type="button" onclick={() => (step = 'intro')}>Exit</button>
{/if}

<div class={['home', { cinema: step === 'intro' }]}>
	{#if step === 'intro'}
		<div class="intro-wrap" {@attach introAnim}>
			<div class="flash" aria-hidden="true"></div>
			<div class="intro">
				<span class="spark s1" aria-hidden="true"></span>
				<span class="spark s2" aria-hidden="true"></span>
				<span class="spark s3" aria-hidden="true"></span>
				<span class="spark s4" aria-hidden="true"></span>
				<span class="spark s5" aria-hidden="true"></span>
				<p class="kicker">Welcome to…</p>
				<h1 class="headline">
					<span class="word">Young</span>
					<span class="word">Adult</span>
					<span class="word">CG</span>
				</h1>
				<p class="hash-row">
					{#each ['#bestcellgroup', '#youngadult', '#292sevenmiledr', '#2026'] as tag (tag)}
						<span class="tag">{tag}</span>
					{/each}
				</p>
				<span class="rule" aria-hidden="true"></span>
				<p class="feat">feat. Junior Ahn</p>
			</div>
			<button class="btn accent go" type="button" onclick={() => (step = 'rate')}>Next</button>
		</div>
	{:else if step === 'rate'}
		<div class="stage rate">
			<h1 class="title">Rate the app</h1>
			<RateSlider bind:value={rating} />
			<button class="btn accent" type="button" onclick={() => (step = 'name')}>Next</button>
		</div>
	{:else if step === 'name'}
		<div class="stage">
			<NameStep
				bind:value={name}
				cta="Next"
				onSubmit={() => {
					game.saveName(name);
					step = profile ? 'welcome' : 'lobby';
				}}
			/>
		</div>
	{:else if step === 'welcome' && profile}
		<WelcomeBack {profile} cta="Next" onContinue={() => (step = 'lobby')} />
	{:else}
		<div class="lobby" {@attach rise()}>
			<p class="label">Lobby</p>
			<h1 class="hello">
				{profile ? `Welcome Back, ${profile.shortName}` : `Welcome, ${name.trim()}`}
			</h1>
			<button class="edit" type="button" onclick={() => (step = 'name')}>edit name</button>
			<Roster activeId={profile?.id ?? null} />
			<form class="stack join" onsubmit={join}>
				<input
					class="field code"
					bind:value={code}
					maxlength={CODE_LENGTH}
					placeholder="CODE"
					aria-label="Room code"
					name="room-code"
					inputmode="text"
					autocapitalize="characters"
					autocomplete="off"
					autocorrect="off"
					spellcheck="false"
					enterkeyhint="go"
					oninput={() => (code = normalizeCode(code))}
				/>
				<button class="btn accent" type="submit" disabled={!codeReady || game.busy}>Enter</button>
			</form>
			<button class="create" type="button" disabled={game.busy} onclick={create}>Create a room</button>
			{#if game.error}
				<p class="warn">{game.error}</p>
			{/if}
			{#if game.kind === 'local'}
				<p class="muted note">
					Same-device mode — rooms only sync between tabs of this browser until Supabase is connected.
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.home {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		overflow: hidden;
	}

	.stage,
	.intro-wrap {
		flex: 1;
		min-height: 0;
		display: grid;
		align-content: center;
		gap: 22px;
	}

	.intro-wrap {
		position: relative;
		align-content: stretch;
		grid-template-rows: 1fr auto;
		margin: calc(-16px - env(safe-area-inset-top)) calc(-1 * var(--pad-x))
			calc(-20px - env(safe-area-inset-bottom));
		padding: calc(16px + env(safe-area-inset-top)) var(--pad-x)
			calc(20px + env(safe-area-inset-bottom));
		background: #000;
		color: #f6f1ea;
	}

	:global(.play-root:has(.cinema)) {
		background: #000;
	}

	.lobby {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		padding-bottom: 8px;
	}

	.lobby::-webkit-scrollbar {
		display: none;
	}

	.hello {
		font-size: clamp(1.5rem, 6vw, 2rem);
		font-weight: 900;
		letter-spacing: -0.04em;
		line-height: 1.05;
	}

	.edit {
		color: var(--muted);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.join {
		margin-top: 8px;
	}

	.code {
		min-height: 92px;
		font-size: clamp(2.4rem, 12vw, 3.2rem);
		letter-spacing: 0.42em;
		text-transform: uppercase;
	}

	.note {
		font-size: 0.82rem;
	}

	.create {
		align-self: center;
		padding: 8px;
		color: var(--muted);
		font-size: 0.82rem;
		font-weight: 700;
	}

	.create:disabled {
		opacity: 0.5;
	}

	.rate {
		justify-items: center;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.intro {
		position: relative;
		display: grid;
		align-content: center;
		justify-items: center;
		gap: 8px;
		padding: 24px 8px;
	}

	.flash {
		position: absolute;
		inset: 0;
		background: #fff;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		z-index: 4;
	}

	.kicker,
	.word,
	.tag,
	.rule,
	.feat,
	.spark,
	.go {
		visibility: hidden;
	}

	@media (prefers-reduced-motion: reduce) {
		.kicker,
		.word,
		.tag,
		.rule,
		.feat,
		.spark,
		.go {
			visibility: visible;
		}

		.flash {
			display: none;
		}
	}

	.kicker {
		font-size: 0.92rem;
		font-weight: 800;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: #9a93a4;
	}

	.headline {
		display: grid;
		justify-items: center;
		margin: 6px 0 2px;
	}

	.word {
		display: block;
		font-size: clamp(3.5rem, 18vw, 5.8rem);
		font-weight: 900;
		letter-spacing: -0.055em;
		line-height: 0.86;
		color: #fff;
		will-change: transform;
		transform-origin: center center;
	}

	.hash-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		max-width: 18rem;
		margin-top: 16px;
	}

	.tag {
		padding: 6px 10px;
		border: 1.5px solid #3a3644;
		border-radius: 999px;
		background: #16151c;
		color: #f3efe6;
		font-size: 0.82rem;
		font-weight: 800;
	}

	.rule {
		width: 72px;
		height: 3px;
		margin: 6px 0;
		border-radius: 999px;
		background: var(--accent);
		transform-origin: center;
	}

	.feat {
		font-size: 1.15rem;
		font-weight: 800;
		font-style: italic;
	}

	.spark {
		position: absolute;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
	}

	.s1 {
		top: 12%;
		left: 12%;
		background: var(--gold);
	}

	.s2 {
		top: 16%;
		right: 14%;
	}

	.s3 {
		bottom: 22%;
		left: 18%;
		background: var(--danger);
	}

	.s4 {
		top: 38%;
		right: 8%;
		background: var(--gold);
	}

	.s5 {
		bottom: 30%;
		right: 20%;
		background: var(--accent-2);
	}
</style>
