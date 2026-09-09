<script lang="ts">
	import { site, navLinks } from '$lib/data';

	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="container">
		<div class="top">
			<div class="brand">
				<p class="name">{site.fullName}</p>
				<p class="korean">{site.korean}</p>
			</div>
			<nav class="links" aria-label="Footer">
				{#each navLinks as link (link.href)}
					<a href={link.href}>{link.label}</a>
				{/each}
			</nav>
		</div>
		<div class="bottom">
			<p>© {year} {site.fullName}</p>
			<div class="social">
				<a href="mailto:{site.email}">{site.email}</a>
				<a
					href="https://instagram.com/{site.instagram}"
					target="_blank"
					rel="noopener noreferrer"
				>
					@{site.instagram}
				</a>
			</div>
		</div>
	</div>
</footer>

<style>
	.footer {
		border-top: 1px solid var(--border);
		padding-block: clamp(40px, 8vw, 64px) calc(28px + env(safe-area-inset-bottom));
		background: var(--surface);
	}

	.top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 28px;
		margin-bottom: clamp(32px, 7vw, 52px);
	}

	.name {
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: var(--track-snug);
	}

	.korean {
		margin-top: 4px;
		color: var(--muted);
		font-size: 0.95rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
	}

	.links a,
	.social a {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--ink-soft);
		transition: color 0.2s ease;
	}

	.links a:hover,
	.social a:hover {
		color: var(--ink);
	}

	.bottom {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px 24px;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.social {
		display: flex;
		gap: 20px;
	}
</style>
