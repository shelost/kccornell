<script lang="ts">
	import { rise } from '$lib/game/motion';

	let {
		value = $bindable(''),
		cta,
		busy = false,
		onSubmit
	}: { value?: string; cta: string; busy?: boolean; onSubmit: () => void } = $props();

	const ready = $derived(value.trim().length >= 2);
</script>

<form
	class="stack"
	onsubmit={(event) => {
		event.preventDefault();
		if (ready && !busy) onSubmit();
	}}
	{@attach rise()}
>
	<h1 class="title">What’s your name?</h1>
	<input
		class="field"
		bind:value
		maxlength="18"
		placeholder="Your name"
		autocomplete="nickname"
		enterkeyhint="go"
	/>
	<button class="btn accent" type="submit" disabled={!ready || busy}>
		{busy ? 'One sec…' : cta}
	</button>
</form>
