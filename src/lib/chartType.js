// Decides which chart types make sense for a graph's data.
import { MAX_SERIES } from './graphs.js';

export function allowedTypes(graph) {
  if (graph.axis === 'date') return ['line', 'bar'];
  const types = ['bar', 'line'];
  if (canPie(graph)) types.push('pie');
  return types;
}

// Pie only works for one set of positive numbers with few enough slices to colour.
export function canPie(graph) {
  if (graph.axis !== 'category' || graph.chart.shown.length !== 1) return false;
  const id = graph.chart.shown[0];
  const vals = graph.rows.map((r) => r.values[id]).filter((v) => v !== null && v !== undefined);
  return vals.length >= 2 && vals.length <= MAX_SERIES && vals.every((v) => v > 0);
}

export function effectiveType(graph) {
  const allowed = allowedTypes(graph);
  return allowed.includes(graph.chart.type) ? graph.chart.type : allowed[0];
}
