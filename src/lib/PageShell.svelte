<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Frame for the pages behind the home-page cells. The background matches the
	 * pink cell that grew over the screen, and the content fades in on top of it.
	 */
	let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<svelte:head>
	<title>{title} — Zhanna Dudnik</title>
</svelte:head>

<main>
	<div class="content">
		<a class="back" href="/">← Zhanna Dudnik</a>
		<h1>{title}</h1>
		{@render children?.()}
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		background: var(--accent);
		color: var(--label);
		padding: clamp(1.5rem, 5vw, 4rem) 16px;
	}

	.content {
		max-width: 60rem;
		margin: 0 auto;
		animation: page-in 600ms 100ms ease both;
	}

	h1 {
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: clamp(2rem, 6vw, 4rem);
		margin: 1.5rem 0;
	}

	.back {
		color: inherit;
		text-decoration: none;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.back:hover,
	.back:focus-visible {
		text-decoration: underline;
	}

	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.content {
			animation: none;
		}
	}
</style>
