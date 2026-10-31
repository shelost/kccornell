<script lang="ts">
	import { rise } from '$lib/game/motion';

	let {
		value = $bindable(''),
		cta,
		busy = false,
		onSubmit
	}: { value?: string; cta: string; busy?: boolean; onSubmit: () => void } = $props();

	const ready = $derived(value.trim().length >= 2);
	const enter = rise();
</script>

<form
	class="stack"
	onsubmit={(event) => {
		event.preventDefault();
		if (ready && !busy) onSubmit();
	}}
	{@attach enter}
>
	<h1 class="title">What’s your name?</h1>
	<input
		class="field"
		bind:value
		name="nickname"
		maxlength="32"
		placeholder="Your name"
		autocomplete="nickname"
		autocapitalize="words"
		autocorrect="off"
		spellcheck="false"
		enterkeyhint="go"
		inputmode="text"
	/>
	<button class="btn accent" type="submit" disabled={!ready || busy}>
		{busy ? 'One sec…' : cta}
	</button>
</form>
