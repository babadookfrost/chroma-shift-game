# Chroma Shift Deployment Manual

This document provides complete instructions for building and hosting Chroma Shift in staging and production environments.

## Automated Deployment via GitHub Pages

Chroma Shift is configured for zero-ops deployment to GitHub Pages.

1. **Auto-Deploy on Push:** Every push or merge to the `main` branch triggers the GitHub workflow `.github/workflows/deploy.yml`.
2. **Build Routine:**
   - Installs production dependencies.
   - Triggers `scripts/generate-icons.js` to build standard high-res PWA assets.
   - Compiles and minifies TypeScript with Vite on maximum optimization.
   - Automatically commits and deploys production artifacts directly to the `gh-pages` deployment environment.

---

## Manual Production Deployment

To compile and serve Chroma Shift manually on your own servers or CDN nodes:

### 1. Build Compilation

Execute the standard production build script:

```bash
npm run build
```

This generates all optimized, minified production assets inside the `./dist` directory:

- `index.html` (with preloaded meta and Apple notch safe zones).
- `manifest.json` (with programmatic PWA icon pointers).
- `assets/` (compressed bundled JS, CSS, and programmatically drawn PWA icons).
- `sw.js` (custom cache-first Service Worker).

### 2. Local Preview

You can test the exact production output locally by starting Vite's preview server:

```bash
npm run preview
```

The preview server will run at `http://localhost:4173` or similar.

### 3. Server Optimizations

When deploying the `./dist` directory to production servers (Nginx, Apache, or CDNs), ensure the following configurations are active for maximum 60FPS mobile performance:

- **Gzip or Brotli Compression:** Compress `.js`, `.css`, and `.json` assets to decrease initial load time on 3G/4G networks.
- **Cache-Control Headers:** Set `Cache-Control: max-age=31536000` for assets in the `assets/` directory (their names contain content hashes, making them safe to cache indefinitely).
- **Service Worker Headers:** Set `Cache-Control: no-cache` for `sw.js` and `manifest.json` to guarantee immediate version updates detection.
- **HTTP/2 Support:** Ensure HTTP/2 is enabled to parallelize asset deliveries.
