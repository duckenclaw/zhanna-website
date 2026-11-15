import type { Point } from './geometry';

/** Small seeded random generator (mulberry32): same seed, same sequence. */
export function mulberry32(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Poisson-disk sampling (Bridson's algorithm): fills a rectangle with points
 * that are at least `r` apart, which gives evenly sized, natural-looking cells.
 *
 * `fixed` points are treated as already placed, so new points keep their
 * distance from them. Only the new points are returned.
 */
export function poissonDisk(
	[x0, y0, x1, y1]: [number, number, number, number],
	r: number,
	random: () => number,
	fixed: Point[] = [],
	tries = 30
): Point[] {
	const size = r / Math.SQRT2;
	const cols = Math.ceil((x1 - x0) / size);
	const rows = Math.ceil((y1 - y0) / size);
	const grid: (Point | undefined)[] = new Array(cols * rows);
	const all: Point[] = [];
	const active: Point[] = [];
	const created: Point[] = [];

	const cellOf = ([x, y]: Point) => [Math.floor((x - x0) / size), Math.floor((y - y0) / size)];

	const insert = (p: Point) => {
		const [cx, cy] = cellOf(p);
		if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) grid[cy * cols + cx] = p;
		all.push(p);
		active.push(p);
	};

	const isFree = (p: Point) => {
		if (p[0] < x0 || p[1] < y0 || p[0] >= x1 || p[1] >= y1) return false;
		const [cx, cy] = cellOf(p);
		for (let y = Math.max(0, cy - 2); y <= Math.min(rows - 1, cy + 2); y++) {
			for (let x = Math.max(0, cx - 2); x <= Math.min(cols - 1, cx + 2); x++) {
				const q = grid[y * cols + x];
				if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < r) return false;
			}
		}
		// Fixed points can be off-grid (outside the rectangle), check them directly.
		for (const q of fixed) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < r) return false;
		return true;
	};

	for (const p of fixed) insert(p);
	if (all.length === 0) {
		const first: Point = [x0 + random() * (x1 - x0), y0 + random() * (y1 - y0)];
		insert(first);
		created.push(first);
	}

	while (active.length) {
		const index = Math.floor(random() * active.length);
		const origin = active[index];
		let placed = false;
		for (let i = 0; i < tries; i++) {
			const angle = random() * Math.PI * 2;
			const dist = r * (1 + random());
			const p: Point = [origin[0] + Math.cos(angle) * dist, origin[1] + Math.sin(angle) * dist];
			if (isFree(p)) {
				insert(p);
				created.push(p);
				placed = true;
				break;
			}
		}
		if (!placed) active.splice(index, 1);
	}

	return created;
}
