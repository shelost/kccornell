import { gsap } from 'gsap';
import type { Attachment } from 'svelte/attachments';

export function reduceMotion(): boolean {
	if (typeof matchMedia === 'undefined') return false;
	return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function rise(delay = 0): Attachment {
	return (element) => {
		if (reduceMotion()) return;
		const ctx = gsap.context(() => {
			gsap.from(element, {
				y: 18,
				autoAlpha: 0,
				duration: 0.55,
				delay,
				ease: 'power3.out'
			});
		}, element);
		return () => ctx.revert();
	};
}

export function pop(delay = 0): Attachment {
	return (element) => {
		if (reduceMotion()) return;
		const ctx = gsap.context(() => {
			gsap.from(element, {
				scale: 0.84,
				autoAlpha: 0,
				duration: 0.5,
				delay,
				ease: 'back.out(1.6)'
			});
		}, element);
		return () => ctx.revert();
	};
}

export function flipCard(): Attachment {
	return (element) => {
		if (reduceMotion()) return;
		const ctx = gsap.context(() => {
			gsap.from(element, {
				rotateY: -90,
				autoAlpha: 0,
				duration: 0.7,
				ease: 'back.out(1.4)'
			});
		}, element);
		return () => ctx.revert();
	};
}

export function staggerChildren(item = ':scope > *', delay = 0.04): Attachment {
	return (element) => {
		if (reduceMotion()) return;
		const ctx = gsap.context(() => {
			gsap.from(item, {
				y: 14,
				autoAlpha: 0,
				duration: 0.45,
				stagger: delay,
				ease: 'power3.out'
			});
		}, element);
		return () => ctx.revert();
	};
}
