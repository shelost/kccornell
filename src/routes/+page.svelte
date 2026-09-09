<script lang="ts">
	import { reveal } from '$lib/reveal';
	import { site, services, values, events } from '$lib/data';
	import Shape from '$lib/components/Shape.svelte';
	import EventCard from '$lib/components/EventCard.svelte';

	const upcoming = events.slice(0, 2);

	const shapeColors: Record<string, string> = {
		red: 'var(--red)',
		blue: 'var(--blue)',
		yellow: 'var(--yellow)',
		green: 'var(--green)',
		purple: 'var(--purple)'
	};
</script>

<svelte:head>
	<title>{site.fullName} — {site.tagline}</title>
</svelte:head>

<!-- hero -->
<section class="hero">
	<div class="hero-bg" aria-hidden="true">
		<span class="blob b1"></span>
		<span class="blob b2"></span>
		<span class="blob b3"></span>
	</div>
	<div class="container hero-inner">
		<span class="chip purple" {@attach reveal()}>{site.korean} · Est. Ithaca, NY</span>
		<h1 class="display" {@attach reveal({ delay: 90 })}>
			A home away<br />from <em>home</em>.
		</h1>
		<p class="lead" {@attach reveal({ delay: 180 })}>{site.description}</p>
		<div class="hero-cta" {@attach reveal({ delay: 270 })}>
			<a href="/contact" class="btn btn-primary">Plan a visit</a>
			<a href="/about" class="btn btn-ghost">Who we are</a>
		</div>
		<p class="hero-note" {@attach reveal({ delay: 360 })}>
			Sundays · 1:30 PM · Anabel Taylor Hall
		</p>
	</div>
</section>

<!-- services -->
<section class="section">
	<div class="container">
		<div class="section-head" {@attach reveal()}>
			<span class="eyebrow">Gather with us</span>
			<h2 class="h2">Every week, three ways in.</h2>
			<p class="lead">Whenever you show up, you're already welcome.</p>
		</div>
		<div class="grid-3">
			{#each services as service, i (service.title)}
				<article class="card service" {@attach reveal({ delay: i * 90 })}>
					<span class="chip {service.color}">{service.day}</span>
					<p class="time">{service.time}</p>
					<h3 class="h3">{service.title}</h3>
					<p class="note">{service.note}</p>
					<p class="loc">{service.location}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<!-- values -->
<section class="section values-section">
	<div class="container">
		<div class="section-head" {@attach reveal()}>
			<span class="eyebrow">What we're about</span>
			<h2 class="h2">Four things we hold onto.</h2>
		</div>
		<div class="grid-4">
			{#each values as value, i (value.title)}
				<article class="card value" {@attach reveal({ delay: i * 80 })}>
					<span class="value-shape" style:background="color-mix(in srgb, {shapeColors[value.color]} 10%, white)">
						<Shape shape={value.shape} color={shapeColors[value.color]} size={20} />
					</span>
					<h3 class="h3">{value.title} <span class="korean">{value.korean}</span></h3>
					<p class="note">{value.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<!-- events preview -->
<section class="section">
	<div class="container">
		<div class="events-head" {@attach reveal()}>
			<div class="section-head" style:margin-bottom="0">
				<span class="eyebrow">Coming up</span>
				<h2 class="h2">Mark your calendar.</h2>
			</div>
			<a href="/events" class="btn btn-ghost">All events</a>
		</div>
		<div class="grid-2">
			{#each upcoming as event, i (event.title)}
				<div {@attach reveal({ delay: i * 100 })}>
					<EventCard {event} />
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- cta banner -->
<section class="section">
	<div class="container">
		<div class="banner" {@attach reveal()}>
			<h2 class="h2">New to Cornell?<br />Come as you are.</h2>
			<p class="lead banner-lead">
				No pressure, no expectations — just a warm meal and people who want to know you.
			</p>
			<a href="/contact" class="btn banner-btn">Say hello</a>
		</div>
	</div>
</section>

<style>
	/* hero */
	.hero {
		position: relative;
		padding-block: clamp(84px, 16vw, 150px) clamp(40px, 8vw, 80px);
		overflow: clip;
	}

	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: -1;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(70px);
		opacity: 0.5;
		animation: float 14s ease-in-out infinite alternate;
	}

	.b1 {
		width: 420px;
		height: 420px;
		top: -160px;
		right: -120px;
		background: rgba(90, 33, 214, 0.28);
	}

	.b2 {
		width: 320px;
		height: 320px;
		bottom: -140px;
		left: -110px;
		background: rgba(19, 104, 206, 0.2);
		animation-delay: -5s;
	}

	.b3 {
		width: 240px;
		height: 240px;
		top: 30%;
		left: 55%;
		background: rgba(255, 166, 2, 0.16);
		animation-delay: -9s;
	}

	@keyframes float {
		from {
			transform: translate3d(0, 0, 0) scale(1);
		}
		to {
			transform: translate3d(30px, 40px, 0) scale(1.12);
		}
	}

	.hero-inner {
		display: grid;
		gap: 22px;
		justify-items: start;
		max-width: 720px;
	}

	.display em {
		font-style: normal;
		background: linear-gradient(100deg, var(--purple) 10%, var(--red) 90%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.hero-cta {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 6px;
	}

	.hero-note {
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		color: var(--muted);
	}

	/* grids */
	.grid-3 {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}

	.grid-4 {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 18px;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 18px;
	}

	/* services */
	.service {
		display: grid;
		gap: 10px;
		align-content: start;
	}

	.time {
		font-size: clamp(2rem, 7vw, 2.5rem);
		font-weight: 700;
		letter-spacing: var(--track-tight);
		line-height: 1;
		margin-top: 6px;
	}

	.note {
		color: var(--ink-soft);
		font-size: 0.96rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.loc {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--muted);
	}

	/* values */
	.values-section {
		background: var(--surface);
	}

	.value {
		display: grid;
		gap: 12px;
		align-content: start;
	}

	.value-shape {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: 15px;
	}

	.korean {
		font-size: 0.85em;
		font-weight: 500;
		color: var(--muted);
		margin-left: 4px;
	}

	/* events */
	.events-head {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 20px;
		margin-bottom: clamp(32px, 6vw, 56px);
	}

	/* banner */
	.banner {
		display: grid;
		gap: 16px;
		justify-items: start;
		padding: clamp(36px, 8vw, 72px);
		border-radius: var(--r-lg);
		background:
			radial-gradient(120% 160% at 90% -20%, rgba(226, 27, 60, 0.5) 0%, transparent 55%),
			linear-gradient(120deg, var(--purple) 0%, var(--purple-deep) 100%);
		color: #fff;
		box-shadow: var(--shadow-lg);
	}

	.banner-lead {
		color: rgba(255, 255, 255, 0.82);
		max-width: 460px;
	}

	.banner-btn {
		background: #fff;
		color: var(--purple-deep);
		margin-top: 8px;
	}

	.banner-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	/* responsive */
	@media (max-width: 900px) {
		.grid-4 {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 760px) {
		.grid-3,
		.grid-2 {
			grid-template-columns: 1fr;
		}

		.events-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 520px) {
		.grid-4 {
			grid-template-columns: 1fr;
		}
	}
</style>
