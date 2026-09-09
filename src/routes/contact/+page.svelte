<script lang="ts">
	import { reveal } from '$lib/reveal';
	import { site } from '$lib/data';

	let name = $state('');
	let message = $state('');

	const mailto = $derived(
		`mailto:${site.email}?subject=${encodeURIComponent(`Hello from ${name || 'a new friend'}`)}&body=${encodeURIComponent(message)}`
	);
</script>

<svelte:head>
	<title>Contact — {site.fullName}</title>
</svelte:head>

<section class="section page-hero">
	<div class="container">
		<span class="chip purple" {@attach reveal()}>Contact</span>
		<h1 class="display" {@attach reveal({ delay: 90 })}>Say hello.<br />We'll save you a seat.</h1>
		<p class="lead intro" {@attach reveal({ delay: 180 })}>
			Planning a visit, new to Ithaca, or just curious? Drop us a note — a real person will get
			back to you, usually within a day.
		</p>
	</div>
</section>

<section class="section contact">
	<div class="container grid">
		<form
			class="card form"
			{@attach reveal()}
			onsubmit={(e) => {
				e.preventDefault();
				window.location.href = mailto;
			}}
		>
			<label>
				<span>Your name</span>
				<input type="text" bind:value={name} placeholder="Jane Kim" required />
			</label>
			<label>
				<span>Message</span>
				<textarea
					bind:value={message}
					rows="5"
					placeholder="Hi! I'm a sophomore and I'd love to visit this Sunday…"
					required
				></textarea>
			</label>
			<button type="submit" class="btn btn-primary">Send message</button>
			<p class="fine">Opens your mail app — no accounts, no forms lost to the void.</p>
		</form>

		<div class="info">
			<div class="card info-card" {@attach reveal({ delay: 90 })}>
				<span class="chip purple">Visit</span>
				<h3 class="h3">Sundays · 1:30 PM</h3>
				<p class="body">{site.address}</p>
			</div>
			<div class="card info-card" {@attach reveal({ delay: 180 })}>
				<span class="chip red">Email</span>
				<h3 class="h3">Write to us</h3>
				<a class="link" href="mailto:{site.email}">{site.email}</a>
			</div>
			<div class="card info-card" {@attach reveal({ delay: 270 })}>
				<span class="chip yellow">Instagram</span>
				<h3 class="h3">Follow along</h3>
				<a
					class="link"
					href="https://instagram.com/{site.instagram}"
					target="_blank"
					rel="noopener noreferrer"
				>
					@{site.instagram}
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	.page-hero {
		padding-block: clamp(70px, 13vw, 120px) 0;
	}

	.page-hero .container {
		display: grid;
		gap: 22px;
		justify-items: start;
	}

	.intro {
		max-width: 600px;
	}

	.contact {
		padding-top: clamp(40px, 8vw, 72px);
	}

	.grid {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 18px;
		align-items: start;
	}

	.form {
		display: grid;
		gap: 18px;
	}

	label {
		display: grid;
		gap: 8px;
	}

	label span {
		font-size: 0.88rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	input,
	textarea {
		font: inherit;
		letter-spacing: -0.01em;
		color: var(--ink);
		background: var(--surface);
		border: 1.5px solid transparent;
		border-radius: var(--r-sm);
		padding: 14px 16px;
		width: 100%;
		resize: vertical;
		transition:
			border-color 0.2s ease,
			background 0.2s ease;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--purple);
		background: #fff;
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--muted);
	}

	.fine {
		font-size: 0.82rem;
		color: var(--muted);
	}

	.info {
		display: grid;
		gap: 18px;
	}

	.info-card {
		display: grid;
		gap: 10px;
		align-content: start;
	}

	.body {
		color: var(--ink-soft);
		font-size: 0.97rem;
		line-height: 1.5;
	}

	.link {
		color: var(--purple);
		font-weight: 700;
		font-size: 0.97rem;
		transition: opacity 0.2s ease;
	}

	.link:hover {
		opacity: 0.7;
	}

	@media (max-width: 820px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
