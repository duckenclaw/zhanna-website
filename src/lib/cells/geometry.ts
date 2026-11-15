export type Point = [number, number];
export type Rect = [x0: number, y0: number, x1: number, y1: number];

/**
 * SVG path for a polygon with rounded corners and slightly bowed edges.
 *
 * Each corner is cut back by `radius` (or less on short edges) and replaced
 * with a smooth curve. Each edge in between bulges outward so its middle sits
 * `bulge` px further out than its ends; two neighbouring cells bulging towards
 * each other make the line between them thinner in the middle.
 */
export function roundedPath(polygon: Point[], radius: number, bulge = 0): string {
	const n = polygon.length;
	if (n < 3) return '';
	const center = centroid(polygon);

	// Where each corner's curve starts (on the incoming edge) and ends (on the outgoing edge).
	const corners = polygon.map((corner, i) => {
		const prev = polygon[(i - 1 + n) % n];
		const next = polygon[(i + 1) % n];
		const inLen = Math.hypot(corner[0] - prev[0], corner[1] - prev[1]) || 1;
		const outLen = Math.hypot(next[0] - corner[0], next[1] - corner[1]) || 1;
		const r = Math.max(0, Math.min(radius, inLen / 2, outLen / 2));
		const start: Point = [
			corner[0] - ((corner[0] - prev[0]) / inLen) * r,
			corner[1] - ((corner[1] - prev[1]) / inLen) * r
		];
		const end: Point = [
			corner[0] + ((next[0] - corner[0]) / outLen) * r,
			corner[1] + ((next[1] - corner[1]) / outLen) * r
		];
		return { corner, start, end };
	});

	let d = `M${pt(corners[0].start)}`;
	for (let i = 0; i < n; i++) {
		const { corner, end } = corners[i];
		const nextStart = corners[(i + 1) % n].start;
		d += `Q${pt(corner)} ${pt(end)}`;

		// Edge from this corner to the next one.
		const len = Math.hypot(nextStart[0] - end[0], nextStart[1] - end[1]);
		if (bulge > 0 && len > 1) {
			const mid: Point = [(end[0] + nextStart[0]) / 2, (end[1] + nextStart[1]) / 2];
			let nx = -(nextStart[1] - end[1]) / len;
			let ny = (nextStart[0] - end[0]) / len;
			// Point the normal away from the cell centre.
			if ((mid[0] - center[0]) * nx + (mid[1] - center[1]) * ny < 0) {
				nx = -nx;
				ny = -ny;
			}
			// A quadratic curve's middle travels half as far as its control point.
			// Short edges bulge less so they don't kink.
			const offset = 2 * bulge * Math.min(1, len / (20 * bulge));
			d += `Q${pt([mid[0] + nx * offset, mid[1] + ny * offset])} ${pt(nextStart)}`;
		} else {
			d += `L${pt(nextStart)}`;
		}
	}
	return d + 'Z';
}

/**
 * Shrink a convex polygon by moving every edge `distance` px towards the centre.
 * Used to open up the gaps between cells, which become the lines.
 */
export function insetPolygon(polygon: Point[], distance: number): Point[] {
	const [cx, cy] = centroid(polygon);

	// Each edge as a line moved inward: a point on it plus its direction.
	const edges: { x: number; y: number; dx: number; dy: number }[] = [];
	for (let i = 0; i < polygon.length; i++) {
		const [ax, ay] = polygon[i];
		const [bx, by] = polygon[(i + 1) % polygon.length];
		const len = Math.hypot(bx - ax, by - ay);
		if (len < 1e-6) continue;
		const dx = (bx - ax) / len;
		const dy = (by - ay) / len;
		let nx = -dy;
		let ny = dx;
		if ((cx - ax) * nx + (cy - ay) * ny < 0) {
			nx = -nx;
			ny = -ny;
		}
		edges.push({ x: ax + nx * distance, y: ay + ny * distance, dx, dy });
	}

	// New corners are where neighbouring moved edges cross.
	return edges.map((b, i): Point => {
		const a = edges[(i - 1 + edges.length) % edges.length];
		const cross = a.dx * b.dy - a.dy * b.dx;
		if (Math.abs(cross) < 1e-6) return [b.x, b.y]; // parallel edges
		const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / cross;
		return [a.x + a.dx * t, a.y + a.dy * t];
	});
}

/** SVG path through the points with straight lines. */
export function linePath(points: Point[]): string {
	return 'M' + points.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
}

/** Area-weighted centre of a polygon (where a label looks centred). */
export function centroid(polygon: Point[]): Point {
	let area = 0;
	let cx = 0;
	let cy = 0;
	for (let i = 0; i < polygon.length; i++) {
		const [x0, y0] = polygon[i];
		const [x1, y1] = polygon[(i + 1) % polygon.length];
		const cross = x0 * y1 - x1 * y0;
		area += cross;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	}
	if (Math.abs(area) < 1e-9) return polygon[0];
	return [cx / (3 * area), cy / (3 * area)];
}

/** `n` points spread evenly along the polygon outline. */
export function resample(polygon: Point[], n: number): Point[] {
	const edges = polygon.map((p, i) => {
		const q = polygon[(i + 1) % polygon.length];
		return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) };
	});
	const total = edges.reduce((sum, e) => sum + e.len, 0);
	const step = total / n;

	const out: Point[] = [];
	let edge = 0;
	let walked = 0; // length of all edges before `edge`
	for (let k = 0; k < n; k++) {
		const target = k * step;
		while (edge < edges.length - 1 && walked + edges[edge].len < target) {
			walked += edges[edge].len;
			edge++;
		}
		const { p, q, len } = edges[edge];
		const t = len > 0 ? (target - walked) / len : 0;
		out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
	}
	return out;
}

/** Where a ray from `origin` through `through` leaves the rectangle. */
export function rayToRect(origin: Point, through: Point, [x0, y0, x1, y1]: Rect): Point {
	const dx = through[0] - origin[0];
	const dy = through[1] - origin[1];
	const tx = dx > 0 ? (x1 - origin[0]) / dx : dx < 0 ? (x0 - origin[0]) / dx : Infinity;
	const ty = dy > 0 ? (y1 - origin[1]) / dy : dy < 0 ? (y0 - origin[1]) / dy : Infinity;
	const t = Math.min(tx, ty);
	return [origin[0] + dx * t, origin[1] + dy * t];
}

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export const easeInOutCubic = (t: number) =>
	t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Round to 0.1px to keep path strings short. */
const f = (n: number) => Math.round(n * 10) / 10;

const pt = ([x, y]: Point) => `${f(x)},${f(y)}`;
