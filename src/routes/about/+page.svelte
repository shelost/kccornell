<script lang="ts">
	import { reveal } from '$lib/reveal';
	import { site, ministries } from '$lib/data';

	const steps = [
		{
			title: 'Show up',
			body: 'Walk in any Sunday at 1:30 PM. Someone at the door will help you find a seat — no sign-up needed.'
		},
		{
			title: 'Worship with us',
			body: 'Services blend Korean and English, with translation available. Expect music, a message, and prayer.'
		},
		{
			title: 'Stay for lunch',
			body: 'Every service ends with a shared meal. This is where most friendships here actually begin.'
		}
	];
</script>

<svelte:head>
	<title>About — {site.fullName}</title>
</svelte:head>

<section class="section page-hero">
	<div class="container">
		<span class="chip purple" {@attach reveal()}>About us</span>
		<h1 class="display" {@attach reveal({ delay: 90 })}>Rooted in Christ,<br />grown at Cornell.</h1>
		<p class="lead intro" {@attach reveal({ delay: 180 })}>
			{site.fullName} ({site.korean}) has been a spiritual home for Korean and Korean-American
			students, scholars, and families in Ithaca for decades. We're a small church with a big
			table — bilingual, intergenerational, and built around genuine friendship.
		</p>
	</div>
</section>

<section class="section alt">
	<div class="container">
		<div class="section-head" {@attach reveal()}>
			<span class="eyebrow">Your first visit</span>
			<h2 class="h2">What to expect.</h2>
		</div>
		<div class="steps">
			{#each steps as step, i (step.title)}
				<article class="card step" {@attach reveal({ delay: i * 90 })}>
					<span class="num">{i + 1}</span>
					<h3 class="h3">{step.title}</h3>
					<p class="body">{step.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<section class="section">
	<div class="container">
		<div class="section-head" {@attach reveal()}>
			<span class="eyebrow">Get involved</span>
			<h2 class="h2">Ministries.</h2>
			<p class="lead">There's a place for you to serve and belong, whatever your gifts.</p>
		</div>
		<div class="grid">
			{#each ministries as ministry, i (ministry.title)}
				<article class="card" {@attach reveal({ delay: i * 80 })}>
					<span class="chip {ministry.color}">{ministry.title}</span>
					<p class="body ministry-body">{ministry.body}</p>
				</article>
			{/each}
		</div>
	</div>
</section>

<style>
	.page-hero {
		padding-block: clamp(70px, 13vw, 120px) clamp(50px, 9vw, 90px);
	}

	.page-hero .container {
		display: grid;
		gap: 22px;
		justify-items: start;
	}

	.intro {
		max-width: 640px;
	}

	.alt {
		background: var(--surface);
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}

	.step {
		display: grid;
		gap: 12px;
		align-content: start;
	}

	.num {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 13px;
		background: var(--ink);
		color: #fff;
		font-weight: 700;
		font-size: 1rem;
	}

	.body {
		color: var(--ink-soft);
		font-size: 0.97rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 18px;
	}

	.ministry-body {
		margin-top: 12px;
	}

	@media (max-width: 760px) {
		.steps,
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
