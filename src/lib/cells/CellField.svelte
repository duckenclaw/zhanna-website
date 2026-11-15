<script lang="ts">
	import { onMount } from 'svelte';
	import { colors, links, strokeWidth, title, type LinkConfig } from './config';
	import { CellField, fills } from './field.svelte';

	const field = new CellField();
	let host: HTMLDivElement;

	onMount(() => {
		const observer = new ResizeObserver(([entry]) =>
			field.resize(entry.contentRect.width, entry.contentRect.height)
		);
		observer.observe(host);
		field.start();
		return () => {
			observer.disconnect();
			field.stop();
		};
	});

	function onPointer(event: PointerEvent) {
		const box = host.getBoundingClientRect();
		field.hoverAt(event.clientX - box.left, event.clientY - box.top);
	}

	function onLinkClick(event: MouseEvent, link: LinkConfig) {
		// Let cmd/ctrl/shift-click open a new tab as usual.
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
		event.preventDefault();
		field.open(link);
	}

	/** y of each line so a multi-line label is vertically centred on (cx, cy). */
	const lineY = (cy: number, index: number, count: number) =>
		cy + (index - (count - 1) / 2) * field.labelSize * 1.15;

	const linkCells = $derived(field.cells.filter((c) => c.link));
	const nameCell = $derived(field.cells.find((c) => c.kind === 'name'));
</script>

<div
	class="field"
	bind:this={host}
	style:--stroke={colors.stroke}
	style:--label={colors.label}
	style:--title={colors.title}
	style:--accent={colors.accent}
>
	{#if field.width}
		<svg
			viewBox="0 0 {field.width} {field.height}"
			class:opening={field.opening}
			onpointermove={onPointer}
			onpointerdown={onPointer}
			onpointerleave={() => field.hover(null)}
			role="presentation"
		>
			<!-- Plain cells (dark and pink trail). -->
			<g class="cells" stroke-width={strokeWidth}>
				{#each field.cells as cell (cell.id)}
					{#if !cell.link}
						<path d={cell.d} fill={fills[cell.kind]} />
					{/if}
				{/each}

				<!-- Link cells: real links, so they work with keyboard and without JS. -->
				{#each linkCells as cell (cell.id)}
					{@const link = cell.link!}
					<a
						href={link.href}
						aria-label={link.label.join(' ')}
						onclick={(e) => onLinkClick(e, link)}
						onfocus={() => field.hoverLink(link)}
						onblur={() => field.hoverLink(null)}
					>
						<path d={cell.d} fill={fills.link} />
					</a>
				{/each}
			</g>

			<!-- Text on top of every cell; ignores the mouse so clicks reach the cell. -->
			<g class="labels" font-size={field.labelSize} aria-hidden="true">
				{#each linkCells as cell (cell.id)}
					{@const lines = cell.link!.label}
					<text class="label">
						{#each lines as line, i (i)}
							<tspan x={cell.cx} y={lineY(cell.cy, i, lines.length)}>{line}</tspan>
						{/each}
					</text>
				{/each}
				{#if nameCell}
					<text class="title">
						{#each title as line, i (i)}
							<tspan x={nameCell.cx} y={lineY(nameCell.cy, i, title.length)}>{line}</tspan>
						{/each}
					</text>
				{/if}
			</g>

			<!-- The clicked cell growing over the screen. -->
			{#if field.openingPath}
				<path class="morph" d={field.openingPath} fill={fills.link} stroke-width={strokeWidth} />
			{/if}
		</svg>
	{/if}

	<noscript>
		<nav class="fallback">
			<p>{title.join(' ')}</p>
			<ul>
				{#each Object.values(links) as link (link.id)}
					<li><a href={link.href}>{link.label.join(' ')}</a></li>
				{/each}
			</ul>
		</nav>
	</noscript>
</div>

<style>
	.field {
		position: fixed;
		inset: 0;
		overflow: hidden;
		touch-action: manipulation;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
		-webkit-tap-highlight-color: transparent;
	}

	.cells,
	.morph {
		stroke: var(--stroke);
		stroke-linejoin: round;
	}

	a {
		outline: none;
		cursor: pointer;
	}

	/* Keyboard focus: a thicker outline on the focused cell. */
	a:focus-visible path {
		stroke-width: 5;
	}

	.labels {
		font-family: 'EB Garamond', Georgia, serif;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		user-select: none;
		transition: opacity 300ms ease;
	}

	.label {
		fill: var(--label);
		animation: fade-in 800ms 300ms ease both;
	}

	.title {
		fill: var(--title);
		animation: fade-in 800ms 150ms ease both;
	}

	/* When a cell opens, the text fades out while the cell grows. */
	.opening .labels {
		opacity: 0;
	}

	.opening {
		pointer-events: none;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.label,
		.title {
			animation: none;
		}
	}

	.fallback {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		text-align: center;
		color: var(--label);
		font-family: 'EB Garamond', Georgia, serif;
		font-size: 1.5rem;
		letter-spacing: 0.04em;
	}

	.fallback ul {
		list-style: none;
		padding: 0;
	}

	.fallback a {
		color: var(--accent);
	}
</style>
