// Pure helpers for the graph data model (no storage, no UI).

export const MAX_SERIES = 8;

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function todayISO(now = new Date()) {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export function newSeries(graph, name, unit = '') {
  const used = new Set(graph.series.map((s) => s.colour));
  let colour = 0;
  while (used.has(colour) && colour < MAX_SERIES - 1) colour++;
  return { id: uid(), name: name.trim() || 'Numbers', unit: unit.trim(), colour };
}

export function newGraph({ name, axis, seriesName, unit }) {
  const graph = {
    id: uid(),
    name: name.trim() || 'My graph',
    createdAt: Date.now(),
    axis,
    rows: [],
    series: [],
    chart: { type: axis === 'date' ? 'line' : 'bar', shown: [] }
  };
  const s = newSeries(graph, seriesName || graph.name, unit);
  graph.series.push(s);
  graph.chart.shown.push(s.id);
  return graph;
}

function cleanValues(values) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
  }
  return out;
}

// Only the boxes that were filled in, so empty ones leave existing numbers alone.
function filled(values) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null));
}

// Adds or updates the row for a date, keeping rows sorted by date. Returns new rows.
// Empty values never overwrite numbers already saved for that date.
export function upsertDateRow(rows, date, values) {
  const clean = cleanValues(values);
  const existing = rows.find((r) => r.x === date);
  let next;
  if (existing) {
    next = rows.map((r) => (r.x === date ? { x: date, values: { ...r.values, ...filled(clean) } } : r));
  } else {
    next = [...rows, { x: date, values: clean }];
  }
  return next.sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
}

// Adds a category row, or updates it if a row with the same label (any case) exists.
export function upsertCategoryRow(rows, label, values) {
  const x = label.trim();
  const clean = cleanValues(values);
  const i = rows.findIndex((r) => r.x.toLowerCase() === x.toLowerCase());
  if (i === -1) return [...rows, { x, values: clean }];
  return rows.map((r, j) => (j === i ? { x: r.x, values: { ...r.values, ...filled(clean) } } : r));
}

export function lastValue(graph, seriesId) {
  for (let i = graph.rows.length - 1; i >= 0; i--) {
    const v = graph.rows[i].values[seriesId];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

export function seriesValues(graph, seriesId) {
  return graph.rows.map((r) => r.values[seriesId]).filter((v) => v !== null && v !== undefined);
}

// Trailing average over the 7 calendar days ending at each point.
export function sevenDayAverage(points) {
  const DAY = 86400000;
  return points.map((p, i) => {
    let sum = 0, n = 0;
    for (let j = i; j >= 0 && p.t - points[j].t < 7 * DAY; j--) {
      sum += points[j].y;
      n++;
    }
    return { t: p.t, y: sum / n };
  });
}

const fmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export function formatNumber(v) {
  return v === null || v === undefined ? '–' : fmt.format(v);
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}

export function isValidBackup(data) {
  return (
    data &&
    data.app === 'simple-graphs' &&
    Array.isArray(data.graphs) &&
    data.graphs.every((g) => g && g.id && Array.isArray(g.rows) && Array.isArray(g.series) && (g.axis === 'date' || g.axis === 'category'))
  );
}
