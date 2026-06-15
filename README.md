# GameLoop Tool

A visual editor for game mechanics schemas. Build Objects, Attributes, Actions, and Events, then see the connections rendered as a live directed graph.

## Open tool

https://wconr.github.io/GameLoopTool/

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/GameLoopTool/ in your browser.

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds the app (`npm run build`) and pushes the `dist/` folder to the `gh-pages` branch of your repository. The live site will be available at `https://<your-username>.github.io/GameLoopTool/`.

> First-time setup: make sure the repository on GitHub has GitHub Pages configured to serve from the `gh-pages` branch (Settings → Pages → Source → Branch: `gh-pages`, folder: `/ (root)`).
