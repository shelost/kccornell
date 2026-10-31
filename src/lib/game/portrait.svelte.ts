import { matchProfile, type Profile } from './profiles';

export type PortraitPerson = {
	id: string;
	name: string;
	color?: number;
	profile?: Profile | null;
};

class PortraitLayer {
	person = $state.raw<PortraitPerson | null>(null);
	from = $state.raw<DOMRect | null>(null);
	source = $state.raw<HTMLElement | null>(null);

	show(person: PortraitPerson, node: EventTarget | null) {
		if (!(node instanceof HTMLElement)) return;
		this.release();
		this.person = {
			...person,
			profile: person.profile ?? matchProfile(person.name)
		};
		this.from = node.getBoundingClientRect();
		this.source = node;
		node.classList.add('portrait-hidden');
	}

	close() {
		this.release();
		this.person = null;
		this.from = null;
	}

	release() {
		this.source?.classList.remove('portrait-hidden');
		this.source = null;
	}
}

export const portrait = new PortraitLayer();
