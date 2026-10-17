<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { site, navLinks } from '$lib/data';

	let open = $state(false);
	let scrolled = $state(false);

	afterNavigate(() => {
		open = false;
	});

	$effect(() => {
		document.documentElement.classList.toggle('menu-open', open);
		return () => document.documentElement.classList.remove('menu-open');
	});
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 10)} />

<header class="nav" class:scrolled class:open>
	<div class="nav-inner container">
		<a href="/" class="logo" aria-label="{site.fullName} — home">
			<span class="logo-mark" aria-hidden="true">K</span>
			<span class="logo-text">{site.name}<span class="logo-sub">Cornell</span></span>
		</a>

		<nav class="links" aria-label="Primary">
			{#each navLinks as link (link.href)}
				<a
					href={link.href}
					class:active={link.href === '/'
						? page.url.pathname === '/'
						: page.url.pathname.startsWith(link.href)}>{link.label}</a
				>
			{/each}
		</nav>

		<a href="/contact" class="btn btn-primary nav-cta">Plan a visit</a>

		<button
			class="burger"
			aria-label={open ? 'Close menu' : 'Open menu'}
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			<span></span>
			<span></span>
		</button>
	</div>
</header>

{#if open}
	<div class="menu" transition:fade={{ duration: 220 }}>
		<nav aria-label="Mobile">
			{#each navLinks as link, i (link.href)}
				<a
					href={link.href}
					class:active={link.href === '/'
						? page.url.pathname === '/'
						: page.url.pathname.startsWith(link.href)}
					in:fly={{ y: 28, duration: 500, delay: 90 + i * 65, easing: quintOut }}
					onclick={() => (open = false)}
				>
					{link.label}
				</a>
			{/each}
			<a
				href="/contact"
				class="btn btn-primary menu-cta"
				in:fly={{ y: 28, duration: 500, delay: 90 + navLinks.length * 65, easing: quintOut }}
				onclick={() => (open = false)}
			>
				Plan a visit
			</a>
		</nav>
	</div>
{/if}

<style>
	.nav {
		position: fixed;
		inset-inline: 0;
		top: 0;
		z-index: 50;
		padding-top: env(safe-area-inset-top);
		transition:
			background 0.3s ease,
			box-shadow 0.3s ease;
	}

	.nav.scrolled:not(.open) {
		background: rgba(255, 255, 255, 0.78);
		-webkit-backdrop-filter: saturate(1.6) blur(18px);
		backdrop-filter: saturate(1.6) blur(18px);
		box-shadow: 0 1px 0 var(--border);
	}

	.nav-inner {
		display: flex;
		align-items: center;
		gap: 24px;
		height: 64px;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-right: auto;
	}

	.logo-mark {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 11px;
		background: linear-gradient(135deg, var(--purple) 0%, var(--purple-deep) 100%);
		color: #fff;
		font-size: 1.05rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		box-shadow: var(--shadow-sm);
	}

	.logo-text {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: var(--track-snug);
		display: flex;
		align-items: baseline;
		gap: 5px;
	}

	.logo-sub {
		font-size: 0.82rem;
		font-weight: 500;
		color: var(--muted);
	}

	.links {
		display: flex;
		gap: 4px;
	}

	.links a {
		padding: 8px 14px;
		border-radius: 999px;
		font-size: 0.95rem;
		font-weight: 500;
		letter-spacing: -0.015em;
		color: var(--ink-soft);
		transition:
			color 0.2s ease,
			background 0.2s ease;
	}

	.links a:hover {
		color: var(--ink);
		background: var(--surface);
	}

	.links a.active {
		color: var(--ink);
		background: var(--surface);
	}

	.nav-cta {
		padding: 10px 20px;
		font-size: 0.92rem;
	}

	.burger {
		display: none;
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: var(--surface);
		-webkit-tap-highlight-color: transparent;
	}

	.burger span {
		position: absolute;
		left: 12px;
		width: 18px;
		height: 2px;
		border-radius: 2px;
		background: var(--ink);
		transition: transform 0.35s var(--ease-spring);
	}

	.burger span:first-child {
		top: 17px;
	}

	.burger span:last-child {
		top: 23px;
	}

	.open .burger span:first-child {
		transform: translateY(3px) rotate(45deg);
	}

	.open .burger span:last-child {
		transform: translateY(-3px) rotate(-45deg);
	}

	.menu {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(255, 255, 255, 0.9);
		-webkit-backdrop-filter: saturate(1.4) blur(24px);
		backdrop-filter: saturate(1.4) blur(24px);
		display: grid;
		place-items: center;
	}

	.menu nav {
		display: grid;
		gap: 8px;
		text-align: center;
	}

	.menu a:not(.menu-cta) {
		font-size: clamp(2rem, 9vw, 2.6rem);
		font-weight: 700;
		letter-spacing: var(--track-tight);
		line-height: 1.15;
		color: var(--ink);
		padding: 4px 20px;
		transition: opacity 0.2s ease;
	}

	.menu a.active {
		color: var(--purple);
	}

	.menu a:not(.menu-cta):active {
		opacity: 0.5;
	}

	.menu-cta {
		margin-top: 22px;
		justify-self: center;
	}

	@media (max-width: 760px) {
		.links,
		.nav-cta {
			display: none;
		}

		.burger {
			display: block;
		}

		.nav-inner {
			height: 60px;
		}
	}
</style>
