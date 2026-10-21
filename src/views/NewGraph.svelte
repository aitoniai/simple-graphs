<script>
  import { addGraph } from '../lib/store.svelte.js';
  import { newGraph } from '../lib/graphs.js';
  import { back, go } from '../lib/nav.js';
  import Icon from '../lib/Icon.svelte';

  let name = $state('');
  let axis = $state('date');
  let unit = $state('');

  function create(e) {
    e.preventDefault();
    const g = newGraph({ name, axis, seriesName: name, unit });
    addGraph(g);
    go(`/g/${g.id}/add`, { replace: true });
  }
</script>

<main class="page">
  <header class="topbar">
    <button class="icon-btn" aria-label="Back" onclick={back}><Icon name="back" /></button>
    <h1>New graph</h1>
  </header>

  <form class="card" onsubmit={create}>
    <label class="field">
      <span>Name</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input class="input" bind:value={name} placeholder="e.g. Morning check-in, Snacks" maxlength="40" autofocus />
    </label>

    <div class="field">
      <span>What goes along the bottom?</span>
      <div class="choices">
        <button type="button" class="choice" aria-pressed={axis === 'date'} onclick={() => (axis = 'date')}>
          <Icon name="calendar" />
          <strong>Dates</strong>
          <small>Track a number over time</small>
        </button>
        <button type="button" class="choice" aria-pressed={axis === 'category'} onclick={() => (axis = 'category')}>
          <Icon name="tag" />
          <strong>Things</strong>
          <small>Compare items, like ice creams vs sweets</small>
        </button>
      </div>
    </div>

    <label class="field">
      <span>Unit <em class="muted">(optional)</em></span>
      <input class="input" bind:value={unit} placeholder="e.g. kg, £, steps" maxlength="12" />
    </label>

    <button class="btn primary block" type="submit">Create graph</button>
  </form>
</main>

<style>
  .choices { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .choice {
    display: grid;
    justify-items: start;
    gap: 4px;
    text-align: left;
    padding: 14px;
    border-radius: 16px;
    border: 1.5px solid var(--line);
    background: var(--card);
  }
  .choice :global(svg) { width: 24px; height: 24px; color: var(--text-muted); margin-bottom: 4px; }
  .choice small { color: var(--text-muted); line-height: 1.35; }
  .choice[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); }
  .choice[aria-pressed='true'] :global(svg) { color: var(--accent); }
  em { font-style: normal; font-weight: 400; }
</style>
