# Zhanna Dudnik — personal website

The personal website of **Zhanna Dudnik**: portfolio, CV, artworks (*prace artystyczne*) and 3D models (*3D modele*).

The home page is a living field of Voronoi "cells". They drift slowly, a cell swells when you hover it and pushes its neighbours in a ripple, and clicking a link cell grows it to fill the screen while the next page fades in. On phones and other tall screens the trail of link cells runs downward.

## Stack

| Piece | Why |
| --- | --- |
| [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, TypeScript) | Components read almost like plain HTML/SVG, page transitions are built in, and the site builds to static files. |
| Plain SVG | Every cell is a real vector `<path>`: sharp at any size, styled with CSS, accessible links. |
| [d3-delaunay](https://github.com/d3/d3-delaunay) | Computes the Voronoi diagram from a list of seed points (fast enough to redo every frame). |
| A small hand-written spring system | Moves the seed points. No animation library, so every motion constant is in one place. |
| [EB Garamond](https://fonts.google.com/specimen/EB+Garamond) via `@fontsource` | Self-hosted serif for the labels. |
| `@sveltejs/adapter-static` | Output is a folder of static files, so it can go on any static host. |

## How the cell field works

1. Each cell is a **seed point**. The Voronoi diagram of all seeds gives the cell shapes.
2. Seeds sit on **springs** tied to a home position that slowly wanders, which makes the field breathe.
3. Hovering a cell **pushes its neighbours' seeds away**, so the cell grows. Neighbours are softly linked to each other, so the push travels outward as a ripple and settles.
4. Clicking a link cell **morphs its outline into the screen rectangle**, fades the labels, and navigates. The new page starts in the same colour and fades in.
5. Corners are rounded and the diagram is recomputed every animation frame, which gives the soft, liquid look.

## Where to change things

- **`src/lib/cells/config.ts`** — colours, links and labels, where the name and link cells sit (separate layouts for wide and tall screens), cell size, and all motion constants. Start here.
- `src/lib/cells/` — the engine: geometry (`geometry.ts`), physics (`physics.ts`), random layout (`rng.ts`), state and animation loop (`field.svelte.ts`), and the SVG component (`CellField.svelte`).
- `src/routes/` — pages. Each link in the config points at one of them.

## Development

```bash
npm install
npm run dev      # local dev server
npm run check    # type check
npm run build    # static site in build/
npm run preview  # serve the built site
```

## Deploy

`npm run build` writes a fully static site to `build/`. Upload that folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.).
