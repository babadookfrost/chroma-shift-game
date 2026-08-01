# Chroma Shift

Chroma Shift is a premium, mobile-first, AAA-quality light puzzle game built with **Phaser 3 + WebGL2** and optimized for the iPhone screen viewport.

```
┌────────────────────────────────────────────────────────┐
│                      CHROMA SHIFT                      │
│                                                        │
│  [Emitter] ══════> (Mirror) ══════> [Prism]            │
│                                       ║                │
│                                       ╠═══> [R Crystal]│
│                                       ╠═══> [G Crystal]│
│                                       ╚═══> [B Crystal]│
└────────────────────────────────────────────────────────┘
```

## Features

- **Path Tracing Optics Engine:** Traces light beams, reflections off rotatable mirrors, and chromatic splitting (dispersion) through prisms in real time.
- **Procedural Sound Synthesis:** Zero external files. Background LFO-modulated drone, placement ticks, crystal chiming, and arpeggiated success melodies synthesized directly via the Web Audio API.
- **Custom Post-Processing GLSL Shaders:** Features high-end Chromatic Aberration, Vignette shadows, and AAA cinematic color grading.
- **PWA Standalone App-Like Experience:** Integrated Service Worker caching, offline support, a custom Add-to-Home-Screen prompt banner, App Badging API, Web Share, and Screen Wake Lock.
- **Tactile Inputs:** Custom pinching/zooming, dual-touch rotation, double-tap snapping, and haptic iOS visual fallbacks.

---

## Getting Started

### Prerequisites

Ensure you have **Node.js v18+** installed.

### Installation

```bash
# Install dependencies
npm install

# Run custom canvas-based PWA icon generator and build standard assets
node scripts/generate-icons.js
```

### Local Development

Start the Vite development server on port `3000`:

```bash
npm run dev
```

### Production Build

Minify and compile TypeScript:

```bash
npm run build
```

---

## Testing

### Unit Testing

Run core mathematical and logic validation tests:

```bash
npm run test
```

### E2E Testing

Run Playwright smoke tests:

```bash
npx playwright install chromium
npm run test:e2e
```

---

## CI/CD Pipeline & Protection Rules

1. **Deploy Workflow:** On every push to `main`, the `.github/workflows/deploy.yml` pipeline triggers a production build and deploys to GitHub Pages automatically.
2. **Test Workflow:** On every Pull Request, the `.github/workflows/test.yml` checks linting, runs types checks, and executes unit tests.
3. **Branch Protection:**
   - Require linear history with semantic conventional commits.
   - Require Pull Requests to pass `test.yml` checks before merging.
   - Require code reviews.

---

## License

MIT - See LICENSE for details.
