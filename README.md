# Simple Graphs

A small, installable phone app for turning your own numbers into graphs.

- **Dates graphs**: add a number for today (or any day) and watch it as a line or bar graph, with an optional 7-day average.
- **Things graphs**: compare items, e.g. Ice creams 3, Sweets 2, Veggies 8, as a bar, line or pie chart.
- Add several sets of numbers to one graph and show them together.
- Everything is stored only on the device (IndexedDB). Backup and restore are in Settings.

## Develop

```sh
npm install
npm run dev -- --host   # open the Network URL on a phone on the same Wi-Fi
npm test
npm run build
```

`scripts/make-icons.js` regenerates the PNG icons from the same shapes as `public/icons/icon.svg`.

## Deploy

Pushing to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.
The repo must be named `simple-graphs` (it matches `base` in `vite.config.js`), with
Settings → Pages → Source set to **GitHub Actions**.

## Install on Android

Open `https://<github-user>.github.io/simple-graphs/` in Chrome → ⋮ menu → **Add to Home screen** → **Install**.
