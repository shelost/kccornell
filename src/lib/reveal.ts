import type { Attachment } from 'svelte/attachments';

export interface RevealOptions {
	/** Stagger delay in ms before the reveal transition starts */
	delay?: number;
}

/**
 * Attachment factory for scroll-triggered reveal animations.
 * Usage: <div {@attach reveal()}> or <div {@attach reveal({ delay: 120 })}>
 * Styles live in app.css under `.reveal` / `.reveal.revealed`.
 */
export function reveal(options: RevealOptions = {}): Attachment {
	return (element) => {
		const node = element as HTMLElement;
		node.classList.add('reveal');
		node.style.setProperty('--reveal-delay', `${options.delay ?? 0}ms`);

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						node.classList.add('revealed');
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
		);

		observer.observe(node);
		return () => observer.disconnect();
	};
}
