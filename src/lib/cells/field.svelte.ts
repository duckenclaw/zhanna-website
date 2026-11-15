import { Delaunay } from 'd3-delaunay';
import { goto } from '$app/navigation';
import {
	colors,
	cornerRadius,
	layouts,
	lines,
	openTransition,
	physics,
	portraitBelowAspect,
	randomSeed,
	type LinkConfig
} from './config';
import {
	centroid,
	easeInOutCubic,
	insetPolygon,
	linePath,
	rayToRect,
	resample,
	roundedPath,
	type Point,
	type Rect
} from './geometry';
import { step, type CellKind, type Seed } from './physics';
import { mulberry32, poissonDisk } from './rng';

/** What the SVG component needs to draw one cell. */
export interface RenderCell {
	id: number;
	kind: CellKind;
	d: string;
	cx: number;
	cy: number;
	link?: LinkConfig;
}

type Orientation = 'landscape' | 'portrait';

/**
 * The live cell field: owns the seeds, runs the animation loop and turns
 * seeds into SVG paths every frame. `CellField.svelte` just draws `cells`.
 */
export class CellField {
	width = $state(0);
	height = $state(0);
	/** Average cell size in px for the current screen. */
	spacing = $state(100);
	orientation = $state<Orientation>('landscape');
	cells = $state.raw<RenderCell[]>([]);

	/** True while a clicked cell is growing over the screen. */
	opening = $state(false);
	/** Outline of the growing cell, drawn above everything else. */
	openingPath = $state('');

	private seeds: Seed[] = [];
	private polygons: Point[][] = [];
	private delaunay: Delaunay<Seed> | null = null;
	private hovered: number | null = null;
	private reducedMotion = false;

	private frameId = 0;
	private lastFrame = 0;
	private time = 0;

	private morph: {
		from: Point[];
		to: Point[];
		start: number;
		href: string;
		navigated: boolean;
	} | null = null;

	get labelSize() {
		return this.spacing * layouts[this.orientation].labelSize;
	}

	start() {
		const query = matchMedia('(prefers-reduced-motion: reduce)');
		this.reducedMotion = query.matches;
		this.frameId = requestAnimationFrame(this.frame);
	}

	stop() {
		cancelAnimationFrame(this.frameId);
	}

	/** Called whenever the container changes size. */
	resize(width: number, height: number) {
		if (width === 0 || height === 0 || this.morph) return;
		const orientation: Orientation =
			width / height < portraitBelowAspect ? 'portrait' : 'landscape';
		const scaleX = width / (this.width || width);
		const scaleY = height / (this.height || height);
		const bigChange = Math.abs(scaleX - 1) > 0.25 || Math.abs(scaleY - 1) > 0.25;

		if (!this.seeds.length || orientation !== this.orientation || bigChange) {
			this.width = width;
			this.height = height;
			this.orientation = orientation;
			this.generate();
		} else {
			// Small change (e.g. a phone's address bar hiding): stretch what we have.
			for (const s of this.seeds) {
				s.x *= scaleX;
				s.homeX *= scaleX;
				s.y *= scaleY;
				s.homeY *= scaleY;
			}
			this.width = width;
			this.height = height;
			this.spacing = layouts[orientation].cellSize * Math.sqrt(width * height);
		}
	}

	/** Hover the cell under a point (in px, relative to the field). */
	hoverAt(x: number, y: number) {
		if (!this.delaunay) return;
		this.hover(this.delaunay.find(x, y, this.hovered ?? 0));
	}

	/** Hover the cell showing this link (used for keyboard focus). */
	hoverLink(link: LinkConfig | null) {
		this.hover(link ? this.seeds.findIndex((s) => s.link === link) : null);
	}

	hover(index: number | null) {
		if (this.morph || index === this.hovered) return;
		if (this.hovered !== null) {
			const old = this.seeds[this.hovered];
			if (old) old.inflateTarget = old.restInflate;
		}
		this.hovered = index;
		if (index !== null && this.seeds[index]) {
			const s = this.seeds[index];
			s.inflateTarget = s.restInflate + physics.hoverInflate[s.kind];
		}
	}

	/** Grow the cell showing this link over the whole screen, then navigate. */
	open(link: LinkConfig) {
		if (this.morph) return;
		const index = this.seeds.findIndex((s) => s.link === link);
		const polygon = this.polygons[index];
		if (this.reducedMotion || !polygon) {
			goto(link.href);
			return;
		}

		// Sample the cell outline, and for each sample find the matching point on a
		// rectangle a bit larger than the screen (along a ray from the cell centre).
		const center = centroid(polygon);
		const from = resample(polygon, openTransition.samples);
		const pad = Math.max(this.width, this.height) * 0.25;
		const screen: Rect = [-pad, -pad, this.width + pad, this.height + pad];
		const to = from.map((p) => rayToRect(center, p, screen));

		this.morph = { from, to, start: performance.now(), href: link.href, navigated: false };
		this.seeds[index].inflateTarget = openTransition.inflate; // shove the others aside
		this.opening = true;
	}

	/** Place seeds for the current size: hand-placed anchors + random dark cells. */
	private generate() {
		const { width: w, height: h } = this;
		const layout = layouts[this.orientation];
		const spacing = layout.cellSize * Math.sqrt(w * h);
		const margin = spacing; // cells continue past the screen edge
		const random = mulberry32(randomSeed);

		const anchors = layout.anchors.map((a) => ({ ...a, x: a.x * w, y: a.y * h }));
		const fill = poissonDisk(
			[-margin, -margin, w + margin, h + margin],
			spacing,
			random,
			anchors.map((a): Point => [a.x, a.y])
		);

		const points = [
			...anchors,
			...fill.map(([x, y]) => ({ x, y, kind: 'dark' as const, link: undefined, inflate: 0 }))
		];

		// Start slightly gathered towards the centre, then spring outward.
		const intro = this.reducedMotion ? 1 : physics.introScale;
		this.seeds = points.map((p) => ({
			kind: p.kind,
			link: p.link,
			x: w / 2 + (p.x - w / 2) * intro,
			y: h / 2 + (p.y - h / 2) * intro,
			vx: 0,
			vy: 0,
			homeX: p.x,
			homeY: p.y,
			phaseX: random() * Math.PI * 2,
			phaseY: random() * Math.PI * 2,
			speedX: 0.6 + random() * 0.8,
			speedY: 0.6 + random() * 0.8,
			inflate: 0,
			inflateVelocity: 0,
			inflateTarget: p.inflate ?? 0,
			restInflate: p.inflate ?? 0,
			targetX: p.x,
			targetY: p.y,
			offsetX: 0,
			offsetY: 0
		}));
		this.spacing = spacing;
		this.hovered = null;
		this.delaunay = null;
	}

	private frame = (now: number) => {
		this.frameId = requestAnimationFrame(this.frame);
		if (!this.seeds.length) return;

		const dt = Math.min((now - (this.lastFrame || now)) / 1000, 1 / 30);
		this.lastFrame = now;
		this.time += dt;

		const motion = this.reducedMotion ? { ...physics, driftAmplitude: 0, coupling: 0 } : physics;
		const delaunay = this.delaunay;
		const neighbors = (i: number) => (delaunay ? delaunay.neighbors(i) : []);
		step(this.seeds, neighbors, dt, this.time, this.spacing, motion);

		this.render();
		this.updateMorph(now);
	};

	/** Recompute the Voronoi diagram and the SVG path for each cell. */
	private render() {
		const margin = this.spacing;
		this.delaunay = Delaunay.from(
			this.seeds,
			(s) => s.x,
			(s) => s.y
		);
		const voronoi = this.delaunay.voronoi([
			-margin,
			-margin,
			this.width + margin,
			this.height + margin
		]);
		const radius = cornerRadius * this.spacing;
		// Each cell gives up half a line on every side; the line is the gap left over.
		const halfLine = lines.width / 2;
		const bulge = halfLine * lines.taper;

		const cells: RenderCell[] = [];
		this.polygons = [];
		for (let i = 0; i < this.seeds.length; i++) {
			const raw = voronoi.cellPolygon(i);
			if (!raw) continue;
			// The last point repeats the first.
			const polygon = insetPolygon(raw.slice(0, -1) as Point[], halfLine);
			this.polygons[i] = polygon;
			const [cx, cy] = centroid(polygon);
			const s = this.seeds[i];
			const d = roundedPath(polygon, radius, bulge);
			cells.push({ id: i, kind: s.kind, d, cx, cy, link: s.link });
		}
		this.cells = cells;
	}

	private updateMorph(now: number) {
		const m = this.morph;
		if (!m) return;
		const t = Math.min((now - m.start) / openTransition.duration, 1);
		const e = easeInOutCubic(t);
		this.openingPath = linePath(
			m.from.map(([x, y], k): Point => [x + (m.to[k][0] - x) * e, y + (m.to[k][1] - y) * e])
		);
		if (t >= 1 && !m.navigated) {
			m.navigated = true;
			goto(m.href);
		}
	}
}

export const fills: Record<CellKind, string> = {
	dark: colors.dark,
	accent: colors.accent,
	link: colors.accent,
	name: colors.name
};
