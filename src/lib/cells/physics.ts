import type { AnchorKind, LinkConfig } from './config';
import { physics } from './config';
import { smoothstep } from './geometry';

export type CellKind = AnchorKind;

/**
 * One cell's seed point. The Voronoi diagram of all seeds gives the cell shapes,
 * so moving seeds is how cells move, grow and shrink.
 */
export interface Seed {
	kind: CellKind;
	link?: LinkConfig;

	/** Current position and velocity. */
	x: number;
	y: number;
	vx: number;
	vy: number;

	/** Resting position (before drift and pushes). */
	homeX: number;
	homeY: number;

	/** Random phase and speed of the idle drift, so every cell wanders differently. */
	phaseX: number;
	phaseY: number;
	speedX: number;
	speedY: number;

	/** How swollen the cell is (0 = normal). Animated towards `inflateTarget` with a spring. */
	inflate: number;
	inflateVelocity: number;
	inflateTarget: number;
	/** Inflate value when nothing is happening (from the anchor config). */
	restInflate: number;

	/** Scratch values, rewritten every step. */
	targetX: number;
	targetY: number;
	offsetX: number;
	offsetY: number;
}

export type Physics = typeof physics;

/**
 * Advance the simulation by `dt` seconds.
 *
 * 1. Each cell's swell (`inflate`) springs towards its target.
 * 2. Each seed gets a target: its home plus a slow wandering drift.
 * 3. Swollen cells push the targets of nearby seeds away, so they get bigger.
 * 4. Seeds spring towards their targets. They are also tied to their Delaunay
 *    neighbours: when one lags behind its target it drags its neighbours with it,
 *    which sends a ripple outward that dies down.
 */
export function step(
	seeds: Seed[],
	neighbors: (i: number) => Iterable<number>,
	dt: number,
	time: number,
	spacing: number,
	p: Physics
) {
	// 1. Swell springs.
	for (const s of seeds) {
		const a =
			p.inflateStiffness * (s.inflateTarget - s.inflate) - p.inflateDamping * s.inflateVelocity;
		s.inflateVelocity += a * dt;
		s.inflate += s.inflateVelocity * dt;
	}

	// 2. Home + drift.
	const drift = p.driftAmplitude * spacing;
	const t = time * p.driftSpeed * Math.PI * 2;
	for (const s of seeds) {
		s.targetX = s.homeX + drift * Math.sin(t * s.speedX + s.phaseX);
		s.targetY = s.homeY + drift * Math.cos(t * s.speedY + s.phaseY);
	}

	// 3. Pushes from swollen cells.
	const radius = p.pushRadius * spacing;
	const distance = p.pushDistance * spacing;
	for (const source of seeds) {
		if (Math.abs(source.inflate) < 0.001) continue;
		for (const s of seeds) {
			if (s === source) continue;
			const dx = s.targetX - source.x;
			const dy = s.targetY - source.y;
			const d = Math.hypot(dx, dy);
			if (d >= radius || d < 1e-6) continue;
			const push = source.inflate * distance * (1 - smoothstep(d / radius));
			s.targetX += (dx / d) * push;
			s.targetY += (dy / d) * push;
		}
	}

	// 4. Springs + neighbour drag.
	for (const s of seeds) {
		s.offsetX = s.x - s.targetX;
		s.offsetY = s.y - s.targetY;
	}
	for (let i = 0; i < seeds.length; i++) {
		const s = seeds[i];
		let dragX = 0;
		let dragY = 0;
		for (const j of neighbors(i)) {
			dragX += seeds[j].offsetX - s.offsetX;
			dragY += seeds[j].offsetY - s.offsetY;
		}
		const ax = -p.stiffness * s.offsetX - p.damping * s.vx + p.coupling * dragX;
		const ay = -p.stiffness * s.offsetY - p.damping * s.vy + p.coupling * dragY;
		s.vx += ax * dt;
		s.vy += ay * dt;
	}
	for (const s of seeds) {
		s.x += s.vx * dt;
		s.y += s.vy * dt;
	}
}
