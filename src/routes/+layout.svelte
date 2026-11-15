<script lang="ts">
	import '@fontsource/eb-garamond/500.css';
	import '@fontsource/eb-garamond/600.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { colors } from '#lib/cells/config.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Expose the config colours to CSS as --dark, --accent, ...
	const cssVars = Object.entries(colors)
		.map(([name, value]) => `--${name}: ${value};`)
		.join(' ');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content={colors.dark} />
	{@html `<style>:root { ${cssVars} }</style>`}
</svelte:head>

{@render children()}
