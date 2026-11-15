export type Point = [number, number];
export type Rect = [x0: number, y0: number, x1: number, y1: number];

/**
 * SVG path for a polygon with rounded corners. Each corner is cut back by
 * `radius` (or less on short edges) and replaced with a smooth curve.
 */
export function roundedPath(polygon: Point[], radius: number): string {
	const n = polygon.length;
	if (n < 3) return '';
	if (radius <= 0) return 'M' + polygon.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';

	let d = '';
	for (let i = 0; i < n; i++) {
		const prev = polygon[(i - 1 + n) % n];
		const corner = polygon[i];
		const next = polygon[(i + 1) % n];

		const inLen = Math.hypot(corner[0] - prev[0], corner[1] - prev[1]);
		const outLen = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
		const r = Math.min(radius, inLen / 2, outLen / 2);

		// Where the curve starts (on the incoming edge) and ends (on the outgoing edge).
		const start: Point = [
			corner[0] - ((corner[0] - prev[0]) / inLen) * r,
			corner[1] - ((corner[1] - prev[1]) / inLen) * r
		];
		const end: Point = [
			corner[0] + ((next[0] - corner[0]) / outLen) * r,
			corner[1] + ((next[1] - corner[1]) / outLen) * r
		];

		d += `${i === 0 ? 'M' : 'L'}${f(start[0])},${f(start[1])}`;
		d += `Q${f(corner[0])},${f(corner[1])} ${f(end[0])},${f(end[1])}`;
	}
	return d + 'Z';
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
