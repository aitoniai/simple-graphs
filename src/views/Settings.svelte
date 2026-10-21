<script>
  import { app, setTheme, replaceAll } from '../lib/store.svelte.js';
  import { makeBackup, readBackup } from '../lib/db.js';
  import { todayISO } from '../lib/graphs.js';
  import { back } from '../lib/nav.js';
  import Icon from '../lib/Icon.svelte';

  let fileInput;
  let message = $state('');

  function backup() {
    const blob = new Blob([makeBackup($state.snapshot(app.graphs), $state.snapshot(app.settings))], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `simple-graphs-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    message = 'Backup saved to your Downloads.';
  }

  async function restore(e) {
    const file = e.currentTarget.files[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const data = readBackup(await file.text());
      const n = data.graphs.length;
      if (!confirm(`Replace everything with this backup (${n} ${n === 1 ? 'graph' : 'graphs'})?`)) return;
      replaceAll(data.graphs, data.settings);
      message = 'Backup restored.';
    } catch (err) {
      message = err instanceof SyntaxError ? 'That file could not be read.' : err.message;
    }
  }
</script>

<main class="page">
  <header class="topbar">
    <button class="icon-btn" aria-label="Back" onclick={back}><Icon name="back" /></button>
    <h1>Settings</h1>
  </header>

  <section class="card">
    <h2>Appearance</h2>
    <div class="segmented" role="group" aria-label="Theme">
      {#each [['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']] as [value, label]}
        <button aria-pressed={app.settings.theme === value} onclick={() => setTheme(value)}>{label}</button>
      {/each}
    </div>
  </section>

  <section class="card">
    <h2>Your data</h2>
    <p class="text">Everything you add is saved only on this phone. Nothing is ever uploaded. Make a backup now and then, so you can get your graphs back if you change phone or clear your browser.</p>
    <div class="actions">
      <button class="btn primary" onclick={backup}>Back up</button>
      <button class="btn" onclick={() => fileInput.click()}>Restore</button>
      <input type="file" accept="application/json,.json" bind:this={fileInput} onchange={restore} hidden />
    </div>
    {#if message}<p class="message" role="status">{message}</p>{/if}
  </section>
</main>

<style>
  .text { line-height: 1.5; color: var(--text-secondary); margin: 0 0 16px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .message { margin: 12px 0 0; color: var(--text-secondary); }
</style>
