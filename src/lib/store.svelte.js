import { loadData, saveGraphs, saveSettings } from './db.js';

export const app = $state({ ready: false, graphs: [], settings: { theme: 'auto' }, themeTick: 0 });

export async function init() {
  const data = await loadData();
  app.graphs = data.graphs;
  app.settings = data.settings;
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => app.themeTick++);
  app.ready = true;
}

export function persist() {
  return saveGraphs($state.snapshot(app.graphs));
}

export function getGraph(id) {
  return app.graphs.find((g) => g.id === id);
}

export function addGraph(graph) {
  app.graphs.unshift(graph);
  persist();
}

export function deleteGraph(id) {
  app.graphs = app.graphs.filter((g) => g.id !== id);
  persist();
}

export function setTheme(theme) {
  app.settings.theme = theme;
  saveSettings($state.snapshot(app.settings));
  applyTheme();
}

export function replaceAll(graphs, settings) {
  app.graphs = graphs;
  persist();
  if (settings?.theme) setTheme(settings.theme);
}

function applyTheme() {
  const t = app.settings.theme;
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#141413' : '#f6f5f2'));
  app.themeTick++;
}
