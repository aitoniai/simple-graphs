import { describe, it, expect } from 'vitest';
import { newGraph, newSeries, upsertDateRow, upsertCategoryRow, lastValue, sevenDayAverage, isValidBackup, todayISO } from './graphs.js';

describe('upsertDateRow', () => {
  it('keeps rows sorted by date', () => {
    let rows = upsertDateRow([], '2026-10-20', { a: 70 });
    rows = upsertDateRow(rows, '2026-10-18', { a: 71 });
    rows = upsertDateRow(rows, '2026-10-19', { a: '70.5' });
    expect(rows.map((r) => r.x)).toEqual(['2026-10-18', '2026-10-19', '2026-10-20']);
    expect(rows[1].values.a).toBe(70.5);
  });

  it('replaces the value for an existing date and keeps other sets', () => {
    let rows = upsertDateRow([], '2026-10-20', { a: 70, b: 5 });
    rows = upsertDateRow(rows, '2026-10-20', { a: 69 });
    expect(rows).toEqual([{ x: '2026-10-20', values: { a: 69, b: 5 } }]);
  });

  it('leaves existing numbers alone when a box is empty', () => {
    let rows = upsertDateRow([], '2026-10-20', { a: 70, b: 5 });
    rows = upsertDateRow(rows, '2026-10-20', { a: 71, b: '' });
    expect(rows[0].values).toEqual({ a: 71, b: 5 });
    let cats = upsertCategoryRow([], 'Sweets', { a: 2, b: 4 });
    cats = upsertCategoryRow(cats, 'Sweets', { a: 3, b: null });
    expect(cats[0].values).toEqual({ a: 3, b: 4 });
  });

  it('stores empty values as null', () => {
    expect(upsertDateRow([], '2026-10-20', { a: '' })[0].values.a).toBeNull();
  });
});

describe('upsertCategoryRow', () => {
  it('appends new things and updates matching names ignoring case', () => {
    let rows = upsertCategoryRow([], 'Ice creams', { a: 3 });
    rows = upsertCategoryRow(rows, 'Sweets', { a: 2 });
    rows = upsertCategoryRow(rows, ' ice creams ', { a: 4 });
    expect(rows).toEqual([
      { x: 'Ice creams', values: { a: 4 } },
      { x: 'Sweets', values: { a: 2 } }
    ]);
  });
});

describe('graphs and sets', () => {
  it('creates a graph with one shown set', () => {
    const g = newGraph({ name: 'Snacks', axis: 'category', seriesName: 'Snacks', unit: '' });
    expect(g.series).toHaveLength(1);
    expect(g.chart).toEqual({ type: 'bar', shown: [g.series[0].id] });
  });

  it('gives each new set the next free colour', () => {
    const g = newGraph({ name: 'A', axis: 'date', seriesName: 'A' });
    g.series.push(newSeries(g, 'B'));
    g.series.push(newSeries(g, 'C'));
    expect(g.series.map((s) => s.colour)).toEqual([0, 1, 2]);
    g.series.splice(1, 1);
    expect(newSeries(g, 'D').colour).toBe(1);
  });

  it('finds the last non-empty value', () => {
    const g = { rows: [{ x: '1', values: { a: 5 } }, { x: '2', values: { a: null } }] };
    expect(lastValue(g, 'a')).toBe(5);
    expect(lastValue(g, 'b')).toBeNull();
  });
});

describe('sevenDayAverage', () => {
  it('averages only the last 7 calendar days', () => {
    const DAY = 86400000;
    const pts = [{ t: 0, y: 10 }, { t: DAY, y: 20 }, { t: 7 * DAY, y: 30 }];
    expect(sevenDayAverage(pts).map((p) => p.y)).toEqual([10, 15, 25]);
  });
});

describe('misc', () => {
  it('formats today in local time', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('rejects files that are not backups', () => {
    expect(isValidBackup({ graphs: [] })).toBeFalsy();
    expect(isValidBackup({ app: 'simple-graphs', graphs: [{ id: 'x', axis: 'date', rows: [], series: [] }] })).toBe(true);
  });
});
