<script>
  import Chart from 'chart.js/auto';
  import 'chartjs-adapter-date-fns';
  import { app } from './store.svelte.js';
  import { sevenDayAverage, formatNumber } from './graphs.js';

  let { graph, type, range = 'ALL', average = false, mini = false } = $props();

  let canvas;
  let chart;

  const RANGE_DAYS = { '1W': 7, '1M': 31, '3M': 92 };

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function seriesColour(s) {
    return css(`--series-${(s.colour % 8) + 1}`);
  }

  function withAlpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function toTime(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  function build(g) {
    const surface = css('--card');
    const grid = css('--grid');
    const muted = css('--text-muted');
    const shown = g.series.filter((s) => g.chart.shown.includes(s.id));
    const unitOf = (s) => (s?.unit ? ` ${s.unit}` : '');

    const tooltip = {
      enabled: !mini,
      backgroundColor: surface,
      titleColor: css('--text-primary'),
      bodyColor: css('--text-secondary'),
      borderColor: css('--line'),
      borderWidth: 1,
      padding: 10,
      cornerRadius: 10,
      boxPadding: 4,
      usePointStyle: true
    };

    if (type === 'pie') {
      const s = shown[0];
      const rows = g.rows.filter((r) => r.values[s.id] > 0);
      return {
        type: 'doughnut',
        data: {
          labels: rows.map((r) => r.x),
          datasets: [{
            data: rows.map((r) => r.values[s.id]),
            backgroundColor: rows.map((_, i) => css(`--series-${(i % 8) + 1}`)),
            borderColor: surface,
            borderWidth: 2,
            borderRadius: 4
          }]
        },
        options: {
          cutout: '55%',
          animation: mini ? false : undefined,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: !mini,
              position: 'bottom',
              labels: { color: css('--text-secondary'), usePointStyle: true, pointStyle: 'circle', padding: 16 }
            },
            tooltip: {
              ...tooltip,
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  return ` ${ctx.label}: ${formatNumber(ctx.raw)}${unitOf(s)} (${Math.round((ctx.raw / total) * 100)}%)`;
                }
              }
            }
          }
        }
      };
    }

    const isDate = g.axis === 'date';
    const isLine = type === 'line';
    const datasets = [];

    for (const s of shown) {
      const colour = seriesColour(s);
      let data;
      if (isDate) {
        data = g.rows
          .filter((r) => r.values[s.id] !== null && r.values[s.id] !== undefined)
          .map((r) => ({ x: toTime(r.x), y: r.values[s.id] }));
      } else {
        data = g.rows.map((r) => r.values[s.id] ?? null);
      }
      const many = data.length > 40;
      datasets.push({
        label: s.name,
        unit: unitOf(s),
        data,
        borderColor: colour,
        backgroundColor: colour,
        borderWidth: isLine ? 2 : 0,
        pointRadius: mini || many ? 0 : 4,
        pointHoverRadius: 6,
        pointBorderColor: surface,
        pointBorderWidth: 2,
        pointHitRadius: 16,
        tension: 0.3,
        spanGaps: true,
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 36,
        order: 1
      });
      if (isDate && isLine && average && data.length > 2) {
        const avg = sevenDayAverage(data.map((p) => ({ t: p.x, y: p.y })));
        datasets.push({
          label: `${s.name} (7-day average)`,
          unit: unitOf(s),
          data: avg.map((p) => ({ x: p.t, y: p.y })),
          borderColor: withAlpha(colour, 0.3),
          backgroundColor: withAlpha(colour, 0.3),
          borderWidth: 4,
          borderCapStyle: 'round',
          pointRadius: 0,
          pointHitRadius: 0,
          tension: 0.4,
          order: 2
        });
      }
    }

    const xScale = isDate
      ? {
          type: 'time',
          time: { tooltipFormat: 'd MMM yyyy', displayFormats: { day: 'd MMM', week: 'd MMM', month: 'MMM yy' } },
          offset: !isLine,
          min: range !== 'ALL' ? Date.now() - RANGE_DAYS[range] * 86400000 : undefined,
          max: range !== 'ALL' ? Date.now() + 43200000 : undefined
        }
      : { type: 'category' };

    return {
      type: isLine ? 'line' : 'bar',
      data: { labels: isDate ? undefined : g.rows.map((r) => r.x), datasets },
      options: {
        maintainAspectRatio: false,
        animation: mini ? false : { duration: 400 },
        interaction: { mode: isLine ? 'index' : 'nearest', intersect: !isLine, axis: 'x' },
        layout: { padding: mini ? 2 : { top: 8, right: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltip,
            filter: (item) => !item.dataset.label.endsWith('(7-day average)') || !isLine,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}${ctx.dataset.unit}`
            }
          }
        },
        scales: {
          x: {
            ...xScale,
            display: !mini,
            grid: { display: false },
            border: { color: grid },
            ticks: { color: muted, maxRotation: 0, autoSkipPadding: 12, maxTicksLimit: isDate ? 5 : undefined }
          },
          y: {
            display: !mini,
            beginAtZero: !isLine,
            grace: isLine ? '10%' : 0,
            grid: { color: grid },
            border: { display: false },
            ticks: { color: muted, maxTicksLimit: 5, callback: (v) => formatNumber(v) }
          }
        }
      }
    };
  }

  $effect(() => {
    app.themeTick;
    const g = $state.snapshot(graph);
    // Small previews only show the most recent stretch so they stay readable.
    if (mini && g.axis === 'date') g.rows = g.rows.slice(-30);
    const config = build(g);
    // Rebuilding is cheap at this size and avoids Chart.js mixing old and new scales.
    // Only the first draw animates, so edits don't replay the intro.
    if (chart) config.options.animation = false;
    chart?.destroy();
    chart = new Chart(canvas, config);
  });

  $effect(() => () => chart?.destroy());
</script>

<div class="chart" class:mini role="img" aria-label={`Graph of ${graph.name}`}>
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart {
    position: relative;
    height: 260px;
  }
  .chart.mini {
    height: 64px;
    pointer-events: none;
  }
</style>
