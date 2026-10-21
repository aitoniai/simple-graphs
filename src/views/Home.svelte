<script>
  import { app } from '../lib/store.svelte.js';
  import { go } from '../lib/nav.js';
  import { lastValue, formatNumber, formatDate } from '../lib/graphs.js';
  import { effectiveType } from '../lib/chartType.js';
  import Chart from '../lib/Chart.svelte';
  import Icon from '../lib/Icon.svelte';

  function summary(g) {
    if (g.rows.length === 0) return 'No numbers yet';
    if (g.axis === 'date') return `Last added ${formatDate(g.rows.at(-1).x, { day: 'numeric', month: 'short' })}`;
    return `${g.rows.length} ${g.rows.length === 1 ? 'item' : 'items'}`;
  }

  function headline(g) {
    if (g.axis !== 'date' || g.rows.length === 0) return null;
    const s = g.series.find((s) => s.id === g.chart.shown[0]) ?? g.series[0];
    const v = lastValue(g, s.id);
    return v === null ? null : `${formatNumber(v)}${s.unit ? ' ' + s.unit : ''}`;
  }
</script>

<main class="page">
  <header class="topbar">
    <h1>Simple Graphs</h1>
    <button class="icon-btn" aria-label="Settings" onclick={() => go('/settings')}><Icon name="settings" /></button>
  </header>

  {#if app.graphs.length === 0}
    <section class="empty card">
      <div class="art" aria-hidden="true">
        <span style="height: 40%"></span><span style="height: 65%"></span><span style="height: 90%"></span>
      </div>
      <h2>Make your first graph</h2>
      <p class="muted">Add some numbers and watch them turn into a graph. Track something every day, or compare a few things side by side.</p>
      <button class="btn primary" onclick={() => go('/new')}><Icon name="plus" /> New graph</button>
    </section>
  {:else}
    <ul class="list">
      {#each app.graphs as g (g.id)}
        <li class="card graph-card">
          <button class="open" onclick={() => go(`/g/${g.id}`)}>
            <div class="text">
              <h2>{g.name}</h2>
              {#if headline(g)}<p class="value">{headline(g)}</p>{/if}
              <p class="muted small">{summary(g)}</p>
            </div>
            {#if g.rows.length > 0}
              <div class="mini"><Chart graph={g} type={effectiveType(g)} mini /></div>
            {/if}
          </button>
          <button class="add" aria-label={`Add to ${g.name}`} onclick={() => go(`/g/${g.id}/add`)}><Icon name="plus" /></button>
        </li>
      {/each}
    </ul>
    <div class="fab-space"></div>
    <button class="btn primary fab" onclick={() => go('/new')}><Icon name="plus" /> New graph</button>
  {/if}
</main>

<style>
  .list { list-style: none; margin: 0; padding: 0; }
  .graph-card { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 0; }
  .open {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    background: none;
    text-align: left;
    padding: 8px 0 8px 16px;
  }
  .text { flex: 1; min-width: 0; }
  .text h2 { color: var(--text-primary); font-size: 1.0625rem; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .value { margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
  .small { margin: 2px 0 0; font-size: 0.8125rem; }
  .mini { width: 96px; flex: none; }
  .add {
    width: var(--tap); height: var(--tap); flex: none;
    border-radius: 50%; border: 0;
    background: var(--accent-soft); color: var(--accent);
    display: grid; place-items: center;
  }
  .add :global(svg) { width: 22px; height: 22px; }
  .fab-space { height: 72px; }
  .fab {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(20px + env(safe-area-inset-bottom));
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.2);
    padding: 0 28px;
    min-height: 56px;
  }
  .fab :global(svg), .empty .btn :global(svg) { width: 20px; height: 20px; }
  .empty { text-align: center; padding: 40px 24px; margin-top: 24px; }
  .empty h2 { color: var(--text-primary); font-size: 1.25rem; }
  .empty p { line-height: 1.5; margin: 0 0 24px; }
  .art { display: flex; align-items: end; justify-content: center; gap: 10px; height: 72px; margin-bottom: 20px; }
  .art span { width: 20px; border-radius: 6px; background: var(--accent); opacity: 0.85; }
  .art span:first-child { opacity: 0.4; }
  .art span:nth-child(2) { opacity: 0.6; }
</style>
