/**
 * Everything you would want to tweak on the home page lives here:
 * colours, links, where the coloured cells sit, cell size and motion.
 *
 * Positions are normalised: x and y go from 0 (left/top) to 1 (right/bottom)
 * of the screen, so the same layout works at any resolution.
 */

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const colors = {
	/** Page background and the plain dark cells. */
	dark: '#2f2f2f',
	/** Outlines between cells. */
	stroke: '#f6efe0',
	/** Pink trail cells and link cells. */
	accent: '#ff1f5a',
	/** The cell with the name in it. */
	name: '#faf3e6',
	/** Text on pink cells. */
	label: '#faf3e6',
	/** Text in the name cell. */
	title: '#ff1f5a'
};

/**
 * Lines between cells. They are not strokes: the background is the line colour
 * and every cell is shrunk a little, so the lines are the gaps in between.
 */
export const lines = {
	/** Thickness in px at the ends of each line, next to the junctions. */
	width: 3,
	/** How much thinner a line gets towards its middle: 0 = even, 0.3 = 30% thinner. */
	taper: 0.3
};

/**
 * Corner rounding, as a fraction of the average cell size. 0 = sharp corners.
 * Bigger values give softer cells and heavier blobs where lines meet.
 */
export const cornerRadius = 0.07;

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export interface LinkConfig {
	id: string;
	/** Text shown in the cell, one entry per line. */
	label: string[];
	href: string;
}

export const links = {
	portfolio: { id: 'portfolio', label: ['PORTFOLIO'], href: '/portfolio/' },
	cv: { id: 'cv', label: ['CV'], href: '/cv/' },
	art: { id: 'art', label: ['PRACE', 'ARTYSTYCZNE'], href: '/prace-artystyczne/' },
	models: { id: 'models', label: ['3D', 'MODELE'], href: '/modele-3d/' }
} satisfies Record<string, LinkConfig>;

/** Text in the name cell, one entry per line. */
export const title = ['ZHANNA', 'DUDNIK'];

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

export type AnchorKind = 'name' | 'link' | 'accent' | 'dark';

/** A cell whose position and colour are fixed by hand (`dark` anchors keep areas apart). */
export interface Anchor {
	x: number;
	y: number;
	kind: AnchorKind;
	link?: LinkConfig;
	/** Makes this cell a bit bigger at rest (same units as `physics.hoverInflate`). */
	inflate?: number;
}

export interface Layout {
	/** Average cell size as a fraction of sqrt(screen width × height). */
	cellSize: number;
	/** Label font size as a fraction of the cell size. */
	labelSize: number;
	anchors: Anchor[];
}

/** Below this width/height ratio the portrait layout is used. */
export const portraitBelowAspect = 0.8;

export const layouts: { landscape: Layout; portrait: Layout } = {
	// Wide screens: name in the middle, one branch down-left, one to the right and up.
	landscape: {
		cellSize: 0.14,
		labelSize: 0.14,
		anchors: [
			{ x: 0.5, y: 0.335, kind: 'name', inflate: 0.15 },

			{ x: 0.37, y: 0.43, kind: 'link', link: links.portfolio },
			{ x: 0.315, y: 0.585, kind: 'accent' },
			{ x: 0.2, y: 0.69, kind: 'link', link: links.art, inflate: 0.25 },
			{ x: 0.18, y: 0.86, kind: 'accent' },
			{ x: 0.07, y: 0.93, kind: 'accent' },

			{ x: 0.635, y: 0.4, kind: 'link', link: links.cv },
			{ x: 0.69, y: 0.6, kind: 'accent' },
			{ x: 0.82, y: 0.575, kind: 'link', link: links.models },
			{ x: 0.85, y: 0.4, kind: 'accent' },
			{ x: 0.95, y: 0.3, kind: 'accent' },
			{ x: 0.95, y: 0.13, kind: 'accent' },
			{ x: 0.98, y: -0.01, kind: 'accent' }
		]
	},

	// Tall screens (phones): name at the top, then one pink ribbon zigzagging down.
	// Each row has a pink cell and, on the other side, a dark cell tucked into the
	// bend. Pinks sit nearer the middle than the darks, so each pink touches the
	// next one diagonally and the ribbon stays connected.
	portrait: {
		cellSize: 0.19,
		labelSize: 0.14,
		anchors: [
			{ x: 0.5, y: 0.085, kind: 'name', inflate: 0.2 },

			{ x: 0.65, y: 0.21, kind: 'link', link: links.cv },
			{ x: 0.2, y: 0.21, kind: 'dark' },

			{ x: 0.35, y: 0.33, kind: 'link', link: links.portfolio },
			{ x: 0.8, y: 0.33, kind: 'dark' },

			{ x: 0.66, y: 0.45, kind: 'link', link: links.models },
			{ x: 0.21, y: 0.45, kind: 'dark' },

			{ x: 0.34, y: 0.57, kind: 'link', link: links.art, inflate: 0.2 },
			{ x: 0.79, y: 0.57, kind: 'dark' },

			{ x: 0.64, y: 0.69, kind: 'accent' },
			{ x: 0.2, y: 0.69, kind: 'dark' },

			{ x: 0.36, y: 0.81, kind: 'accent' },
			{ x: 0.8, y: 0.81, kind: 'dark' },

			{ x: 0.65, y: 0.93, kind: 'accent' },
			{ x: 0.21, y: 0.93, kind: 'dark' },

			{ x: 0.35, y: 1.05, kind: 'accent' },
			{ x: 0.79, y: 1.05, kind: 'dark' }
		]
	}
};

/** Seed for the random dark cells. Change it to get a different (but stable) pattern. */
export const randomSeed = 7;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------
// Distances are fractions of the cell size, times are in seconds.

export const physics = {
	/** How hard each cell is pulled back to its place. Higher = snappier. */
	stiffness: 40,
	/** How quickly motion dies out. Lower = wobblier, more liquid. */
	damping: 7,
	/** How strongly cells drag their neighbours along. This is what makes the ripple. */
	coupling: 5,

	/** Idle wandering: how far each cell drifts and how fast. */
	driftAmplitude: 0.06,
	driftSpeed: 0.25,

	/** A swelling cell pushes neighbours within this radius ... */
	pushRadius: 2.2,
	/** ... by up to this distance (at inflate = 1). */
	pushDistance: 0.9,

	/** Spring for the swell itself. Low damping gives a jelly-like overshoot. */
	inflateStiffness: 90,
	inflateDamping: 8,

	/** How much a cell swells when hovered, by kind. */
	hoverInflate: { dark: 0.3, accent: 0.45, name: 0.5, link: 1 },

	/** On load, cells start this much closer to the centre and spring outward. */
	introScale: 0.85
};

export const openTransition = {
	/** Time for a clicked cell to grow over the whole screen, in ms. */
	duration: 750,
	/** How hard the clicked cell shoves the others away while it grows. */
	inflate: 3,
	/** Points used to morph the cell outline into the screen rectangle. */
	samples: 96
};
