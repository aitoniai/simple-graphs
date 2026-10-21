<script>
  import { onMount, tick } from 'svelte';
  import { getGraph, persist, deleteGraph } from '../lib/store.svelte.js';
  import { back, go } from '../lib/nav.js';
  import {
    upsertDateRow, upsertCategoryRow, lastValue, seriesValues, newSeries,
    formatNumber, formatDate, todayISO, MAX_SERIES
  } from '../lib/graphs.js';
  import { allowedTypes, effectiveType } from '../lib/chartType.js';
  import Chart from '../lib/Chart.svelte';
  import Icon from '../lib/Icon.svelte';

  let { id, focusAdd = false } = $props();

  const graph = $derived(getGraph(id));
  const isDate = $derived(graph?.axis === 'date');
  const type = $derived(graph ? effectiveType(graph) : 'bar');
  const types = $derived(graph ? allowedTypes(graph) : []);
  const TYPE_NAMES = { line: 'Line', bar: 'Bar', pie: 'Pie' };

  // Long date histories open on the last month; short ones show everything.
  let range = $state('ALL');
  let average = $state(false);
  let showAllRows = $state(false);
  const ROW_LIMIT = 10;

  // Quick add
  let addDate = $state(todayISO());
  let addLabel = $state('');
  let addValues = $state({});
  let addCard = $state();

  // Dialogs and toast
  let menuDialog = $state();
  let seriesDialog = $state();
  let renameTo = $state('');
  let editing = $state(null); // { id?, name, unit }
  let toast = $state(null);
  let toastTimer;

  const parse = (v) => {
    const s = String(v ?? '').trim().replace(',', '.');
    return s === '' || Number.isNaN(Number(s)) ? null : Number(s);
  };

  function fillValues() {
    const next = {};
    for (const s of graph.series) {
      if (isDate) {
        const row = graph.rows.find((r) => r.x === addDate);
        // With one set, start from the last number; with several, only hint it so
        // a set she didn't do today isn't saved by accident.
        const fallback = graph.series.length === 1 ? lastValue(graph, s.id) : null;
        next[s.id] = row?.values[s.id] ?? fallback ?? '';
      } else {
        next[s.id] = '';
      }
    }
    addValues = next;
  }

  function stepOf(sid) {
    return seriesValues(graph, sid).some((v) => !Number.isInteger(v)) ? 0.1 : 1;
  }

  function nudge(sid, dir) {
    const step = stepOf(sid);
    const v = (parse(addValues[sid]) ?? lastValue(graph, sid) ?? 0) + dir * step;
    addValues[sid] = String(Math.round(v * 100) / 100);
  }

  function showToast(message, undo) {
    clearTimeout(toastTimer);
    toast = { message, undo };
    toastTimer = setTimeout(() => (toast = null), 4000);
  }

  function save(e) {
    e.preventDefault();
    const values = {};
    for (const s of graph.series) values[s.id] = parse(addValues[s.id]);
    if (Object.values(values).every((v) => v === null)) return;
    if (isDate) {
      graph.rows = upsertDateRow(graph.rows, addDate, values);
      showToast(`Saved for ${addDate === todayISO() ? 'today' : formatDate(addDate, { day: 'numeric', month: 'short' })}`);
    } else {
      if (!addLabel.trim()) return;
      graph.rows = upsertCategoryRow(graph.rows, addLabel, values);
      showToast(`Added ${addLabel.trim()}`);
      addLabel = '';
      fillValues();
    }
    persist();
  }

  function setType(t) {
    graph.chart.type = t;
    persist();
  }

  function toggleSeries(sid) {
    const shown = graph.chart.shown;
    if (shown.includes(sid)) {
      if (shown.length === 1) return;
      graph.chart.shown = shown.filter((x) => x !== sid);
    } else {
      graph.chart.shown = [...shown, sid];
    }
    persist();
  }

  function editCell(rowIndex, sid, value) {
    graph.rows[rowIndex].values[sid] = parse(value);
    persist();
  }

  function editLabel(rowIndex, value) {
    const v = value.trim();
    if (v) {
      graph.rows[rowIndex].x = v;
      persist();
    }
  }

  function deleteRow(rowIndex) {
    const removed = graph.rows[rowIndex];
    graph.rows = graph.rows.filter((_, i) => i !== rowIndex);
    persist();
    showToast('Deleted', () => {
      const rows = [...graph.rows];
      rows.splice(rowIndex, 0, removed);
      graph.rows = rows;
      persist();
    });
  }

  function openSeries(s) {
    editing = s ? { id: s.id, name: s.name, unit: s.unit } : { name: '', unit: '' };
    seriesDialog.showModal();
  }

  function saveSeries(e) {
    e.preventDefault();
    if (editing.id) {
      const s = graph.series.find((x) => x.id === editing.id);
      s.name = editing.name.trim() || s.name;
      s.unit = editing.unit.trim();
    } else {
      const s = newSeries(graph, editing.name, editing.unit);
      graph.series.push(s);
      graph.chart.shown.push(s.id);
      addValues[s.id] = '';
    }
    persist();
    seriesDialog.close();
  }

  function removeSeries() {
    if (!confirm(`Delete "${editing.name}" and all its numbers?`)) return;
    graph.series = graph.series.filter((s) => s.id !== editing.id);
    graph.chart.shown = graph.chart.shown.filter((x) => x !== editing.id);
    if (graph.chart.shown.length === 0) graph.chart.shown = [graph.series[0].id];
    for (const r of graph.rows) delete r.values[editing.id];
    persist();
    seriesDialog.close();
  }

  function openMenu() {
    renameTo = graph.name;
    menuDialog.showModal();
  }

  function rename(e) {
    e.preventDefault();
    if (renameTo.trim()) {
      graph.name = renameTo.trim();
      persist();
    }
    menuDialog.close();
  }

  function removeGraph() {
    if (!confirm(`Delete "${graph.name}"? This can't be undone.`)) return;
    menuDialog.close();
    deleteGraph(id);
    go('/', { replace: true });
  }

  // Headline numbers for date graphs, from the first set shown.
  const stats = $derived.by(() => {
    if (!graph || !isDate) return null;
    const s = graph.series.find((x) => x.id === graph.chart.shown[0]);
    const vals = seriesValues(graph, s.id);
    if (vals.length === 0) return null;
    const unit = s.unit;
    const change = vals.at(-1) - vals[0];
    return [
      { label: 'Latest', value: formatNumber(vals.at(-1)), unit },
      { label: 'Since start', value: (change > 0 ? '+' : change < 0 ? '−' : '') + formatNumber(Math.abs(change)), unit },
      { label: 'Lowest', value: formatNumber(Math.min(...vals)), unit },
      { label: 'Highest', value: formatNumber(Math.max(...vals)), unit }
    ];
  });

  // Newest first for dates; entry order for things.
  const tableRows = $derived(
    graph ? graph.rows.map((r, i) => ({ r, i })).sort((a, b) => (isDate ? b.i - a.i : a.i - b.i)) : []
  );

  onMount(async () => {
    if (!graph) return;
    fillValues();
    if (isDate && graph.rows.length > 1) {
      const first = new Date(graph.rows[0].x).getTime();
      if (Date.now() - first > 45 * 86400000) range = '1M';
    }
    if (focusAdd) {
      await tick();
      addCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addCard?.querySelector(isDate ? 'input[inputmode]' : 'input')?.focus({ preventScroll: true });
    }
  });
</script>

{#if !graph}
  <main class="page">
    <header class="topbar">
      <button class="icon-btn" aria-label="Back" onclick={back}><Icon name="back" /></button>
      <h1>Not found</h1>
    </header>
    <p class="muted">This graph doesn't exist any more.</p>
  </main>
{:else}
  <main class="page">
    <header class="topbar">
      <button class="icon-btn" aria-label="Back" onclick={back}><Icon name="back" /></button>
      <h1>{graph.name}</h1>
      <button class="icon-btn" aria-label="More options" onclick={openMenu}><Icon name="more" /></button>
    </header>

    {#if stats}
      <div class="stats">
        {#each stats as s}
          <div class="stat"><span>{s.label}</span><strong>{s.value}</strong>{#if s.unit}<small>{s.unit}</small>{/if}</div>
        {/each}
      </div>
    {/if}

    <section class="card chart-card">
      {#if graph.rows.length === 0}
        <div class="no-data">
          <p>Your graph will appear here.</p>
          <p class="muted">{isDate ? 'Add your first number below.' : 'Add a few things below, like "Ice creams" 3.'}</p>
        </div>
      {:else}
        <div class="controls">
          {#if types.length > 1}
            <div class="segmented" role="group" aria-label="Graph type">
              {#each types as t}
                <button aria-pressed={type === t} onclick={() => setType(t)}>{TYPE_NAMES[t]}</button>
              {/each}
            </div>
          {/if}
          {#if isDate}
            <div class="segmented" role="group" aria-label="Time range">
              {#each ['1W', '1M', '3M', 'ALL'] as r}
                <button aria-pressed={range === r} onclick={() => (range = r)}>{r === 'ALL' ? 'All' : r}</button>
              {/each}
            </div>
          {/if}
        </div>
        <Chart {graph} {type} {range} {average} />
        {#if isDate && type === 'line' && graph.rows.length > 2}
          <label class="toggle">
            <input type="checkbox" bind:checked={average} />
            <span>Show 7-day average</span>
          </label>
        {/if}
      {/if}

      <div class="chips" class:pie={type === 'pie'} aria-label="Sets on the graph">
        {#each graph.series as s (s.id)}
          <button
            class="chip"
            aria-pressed={graph.chart.shown.includes(s.id)}
            style={`--c: var(--series-${(s.colour % 8) + 1})`}
            onclick={() => toggleSeries(s.id)}
          >
            <i></i>{s.name}{s.unit ? ` (${s.unit})` : ''}
          </button>
        {/each}
        {#if graph.series.length < MAX_SERIES}
          <button class="link-btn" onclick={() => openSeries(null)}>+ Add a set</button>
        {/if}
      </div>
      {#if graph.series.length > 1}
        <p class="hint muted">Tap a set to show or hide it on the graph.</p>
      {/if}
    </section>

    <form class="card add-card" bind:this={addCard} onsubmit={save}>
      <h2>{isDate ? 'Add a number' : 'Add a thing'}</h2>
      {#if isDate}
        <label class="field">
          <span>Date</span>
          <input class="input" type="date" bind:value={addDate} max={todayISO()} onchange={fillValues} required />
        </label>
      {:else}
        <label class="field">
          <span>Name</span>
          <input class="input" bind:value={addLabel} placeholder="e.g. Ice creams" maxlength="30" required />
        </label>
      {/if}
      {#each graph.series as s (s.id)}
        <div class="field">
          <span>{graph.series.length > 1 ? s.name : 'Number'}{s.unit ? ` (${s.unit})` : ''}</span>
          <div class="stepper">
            <button type="button" class="icon-btn" aria-label="Less" onclick={() => nudge(s.id, -1)}><Icon name="minus" /></button>
            <input class="input num" inputmode="decimal" enterkeyhint="done" bind:value={addValues[s.id]} placeholder={isDate ? formatNumber(lastValue(graph, s.id) ?? 0) : '0'} aria-label={s.name} />
            <button type="button" class="icon-btn" aria-label="More" onclick={() => nudge(s.id, 1)}><Icon name="plus" /></button>
          </div>
        </div>
      {/each}
      <button class="btn primary block" type="submit"><Icon name="check" /> Save</button>
    </form>

    {#if graph.rows.length > 0}
      <section class="card">
        <h2>Your numbers</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{isDate ? 'Date' : 'Thing'}</th>
                {#each graph.series as s (s.id)}
                  <th><button class="th-btn" onclick={() => openSeries(s)}>{s.name}{s.unit ? ` (${s.unit})` : ''}</button></th>
                {/each}
                <th><span class="sr">Delete</span></th>
              </tr>
            </thead>
            <tbody>
              {#each showAllRows ? tableRows : tableRows.slice(0, ROW_LIMIT) as { r, i } (r.x + i)}
                <tr>
                  <td class="label">
                    {#if isDate}
                      {formatDate(r.x)}
                    {:else}
                      <input class="cell" value={r.x} onchange={(e) => editLabel(i, e.currentTarget.value)} aria-label="Name" />
                    {/if}
                  </td>
                  {#each graph.series as s (s.id)}
                    <td>
                      <input class="cell num" inputmode="decimal" value={r.values[s.id] ?? ''} onchange={(e) => editCell(i, s.id, e.currentTarget.value)} aria-label={`${s.name} for ${r.x}`} />
                    </td>
                  {/each}
                  <td class="del"><button class="icon-btn" aria-label="Delete row" onclick={() => deleteRow(i)}><Icon name="trash" /></button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        {#if tableRows.length > ROW_LIMIT}
          <button class="link-btn" onclick={() => (showAllRows = !showAllRows)}>
            {showAllRows ? 'Show fewer' : `Show all ${tableRows.length}`}
          </button>
        {/if}
        <p class="hint muted">Tap a number to change it. Tap a heading to rename that set.</p>
      </section>
    {/if}
  </main>

  <dialog bind:this={menuDialog}>
    <h3>Graph options</h3>
    <form onsubmit={rename}>
      <label class="field">
        <span>Name</span>
        <input class="input" bind:value={renameTo} maxlength="40" />
      </label>
      <div class="dialog-actions">
        <button type="button" class="btn danger" onclick={removeGraph}><Icon name="trash" /> Delete graph</button>
        <span class="spacer"></span>
        <button type="button" class="btn" onclick={() => menuDialog.close()}>Cancel</button>
        <button class="btn primary" type="submit">Save</button>
      </div>
    </form>
  </dialog>

  <dialog bind:this={seriesDialog}>
    {#if editing}
      <h3>{editing.id ? 'Edit set' : 'Add a set'}</h3>
      {#if !editing.id}
        <p class="muted dialog-note">A set is another list of numbers on the same graph, e.g. "Walk" and "Run".</p>
      {/if}
      <form onsubmit={saveSeries}>
        <label class="field">
          <span>Name</span>
          <input class="input" bind:value={editing.name} maxlength="30" required />
        </label>
        <label class="field">
          <span>Unit <span class="muted">(optional)</span></span>
          <input class="input" bind:value={editing.unit} maxlength="12" />
        </label>
        <div class="dialog-actions">
          {#if editing.id && graph.series.length > 1}
            <button type="button" class="btn danger" onclick={removeSeries}><Icon name="trash" /> Delete</button>
            <span class="spacer"></span>
          {/if}
          <button type="button" class="btn" onclick={() => seriesDialog.close()}>Cancel</button>
          <button class="btn primary" type="submit">Save</button>
        </div>
      </form>
    {/if}
  </dialog>

  {#if toast}
    <div class="toast" role="status">
      <span>{toast.message}</span>
      {#if toast.undo}
        <button class="link-btn" onclick={() => { toast.undo(); toast = null; }}>Undo</button>
      {/if}
    </div>
  {/if}
{/if}

<style>
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .stat {
    background: var(--card);
    border-radius: 16px;
    box-shadow: var(--shadow);
    padding: 10px 8px;
    display: grid;
    gap: 2px;
    text-align: center;
    min-width: 0;
  }
  .stat span { font-size: 0.75rem; color: var(--text-muted); }
  .stat strong { font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stat small { font-size: 0.75rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; margin-bottom: 12px; }
  .no-data { text-align: center; padding: 32px 0 16px; }
  .no-data p { margin: 4px 0; }
  .toggle { display: flex; align-items: center; gap: 10px; min-height: 40px; margin-top: 8px; color: var(--text-secondary); font-size: 0.9375rem; }
  .toggle input { width: 20px; height: 20px; accent-color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: transparent;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }
  .chip i { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--c); }
  .chip[aria-pressed='true'] { color: var(--text-primary); border-color: var(--card-2); background: var(--card-2); }
  .chip[aria-pressed='true'] i { background: var(--c); }
  /* Pie slices have their own colours, so the set's colour dot would mislead. */
  .chips.pie .chip i { display: none; }
  .hint { font-size: 0.8125rem; margin: 10px 0 0; }
  .stepper { display: flex; align-items: center; gap: 8px; }
  .stepper .icon-btn { background: var(--card-2); }
  .num { text-align: center; font-size: 1.375rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .add-card .btn :global(svg) { width: 20px; height: 20px; }
  .table-wrap { overflow-x: auto; margin: 0 -16px; padding: 0 16px; }
  table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th { text-align: left; font-size: 0.8125rem; font-weight: 600; color: var(--text-muted); padding: 0 4px 6px; white-space: nowrap; }
  td { border-top: 1px solid var(--line); padding: 2px 4px; }
  td.label { white-space: nowrap; color: var(--text-secondary); font-size: 0.9375rem; }
  td.del { width: 1%; }
  td.del .icon-btn { width: 40px; height: 40px; color: var(--text-muted); }
  td.del :global(svg) { width: 18px; height: 18px; }
  .th-btn { border: 0; background: none; padding: 6px 0; color: var(--accent); font-weight: 600; font-size: 0.8125rem; }
  .cell {
    width: 100%;
    min-width: 72px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    padding: 0 8px;
    outline: none;
  }
  .cell.num { font-size: 1rem; font-weight: 500; text-align: left; }
  .cell:focus { background: var(--accent-soft); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .spacer { flex: 1; }
  .dialog-note { margin: -8px 0 16px; line-height: 1.45; }
  .dialog-actions .btn :global(svg) { width: 18px; height: 18px; }
  .toast {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(24px + env(safe-area-inset-bottom));
    background: var(--text-primary);
    color: var(--bg);
    border-radius: 999px;
    padding: 4px 8px 4px 20px;
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
    white-space: nowrap;
  }
  .toast .link-btn { color: var(--bg); text-decoration: underline; }
  .toast:not(:has(button)) { padding-right: 20px; }
</style>
