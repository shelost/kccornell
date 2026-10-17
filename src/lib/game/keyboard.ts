import type { Attachment } from 'svelte/attachments';

type VirtualKeyboard = {
	overlaysContent: boolean;
	boundingRect: { height: number };
	addEventListener(type: 'geometrychange', listener: () => void): void;
	removeEventListener(type: 'geometrychange', listener: () => void): void;
};

function keyboardApi(): VirtualKeyboard | undefined {
	return (navigator as Navigator & { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard;
}

function insetFromViewport(): number {
	const vv = window.visualViewport;
	if (!vv) return 0;
	return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export function manualKeyboard(): Attachment {
	return (element) => {
		element.setAttribute('virtualkeyboardpolicy', 'manual');
	};
}

/** Pins the play shell to the visual viewport and exposes --kb-inset for the guess bar. */
export function pinKeyboard(): Attachment {
	return (element) => {
		const root = element as HTMLElement;
		const vk = keyboardApi();
		if (vk) vk.overlaysContent = true;

		const apply = (px: number) => {
			const inset = Math.max(0, Math.round(px));
			root.style.setProperty('--kb-inset', `${inset}px`);
			root.style.setProperty(
				'--kb-pad',
				inset > 48 ? '8px' : 'calc(8px + env(safe-area-inset-bottom))'
			);
			root.classList.toggle('kb-open', inset > 48);
			window.scrollTo(0, 0);
		};

		const sync = () => apply(Math.max(vk?.boundingRect.height ?? 0, insetFromViewport()));

		vk?.addEventListener('geometrychange', sync);
		window.visualViewport?.addEventListener('resize', sync);
		window.visualViewport?.addEventListener('scroll', sync);
		window.addEventListener('focusin', sync);
		window.addEventListener('focusout', sync);
		sync();

		return () => {
			vk?.removeEventListener('geometrychange', sync);
			window.visualViewport?.removeEventListener('resize', sync);
			window.visualViewport?.removeEventListener('scroll', sync);
			window.removeEventListener('focusin', sync);
			window.removeEventListener('focusout', sync);
			apply(0);
		};
	};
}
