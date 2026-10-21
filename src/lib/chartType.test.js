import { describe, it, expect } from 'vitest';
import { allowedTypes, effectiveType, canPie } from './chartType.js';

const cat = (values, shown = ['a'], type = 'bar') => ({
  axis: 'category',
  chart: { type, shown },
  rows: values.map((v, i) => ({ x: `t${i}`, values: { a: v, b: 1 } }))
});

describe('chart types', () => {
  it('offers line and bar for dates, defaulting to line', () => {
    const g = { axis: 'date', chart: { type: 'line', shown: ['a'] }, rows: [] };
    expect(allowedTypes(g)).toEqual(['line', 'bar']);
    expect(effectiveType({ ...g, chart: { type: 'pie', shown: ['a'] } })).toBe('line');
  });

  it('offers pie for one set of positive things', () => {
    expect(allowedTypes(cat([3, 2, 8]))).toEqual(['bar', 'line', 'pie']);
  });

  it('refuses pie for several sets, zero/negative values, or too many slices', () => {
    expect(canPie(cat([3, 2, 8], ['a', 'b']))).toBe(false);
    expect(canPie(cat([3, 0, 8]))).toBe(false);
    expect(canPie(cat([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe(false);
    expect(canPie(cat([5]))).toBe(false);
  });

  it('falls back to bar when pie no longer fits', () => {
    expect(effectiveType(cat([3, 2, 8], ['a', 'b'], 'pie'))).toBe('bar');
  });
});
