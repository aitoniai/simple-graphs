<script>
  import { app } from './lib/store.svelte.js';
  import Home from './views/Home.svelte';
  import NewGraph from './views/NewGraph.svelte';
  import Graph from './views/Graph.svelte';
  import Settings from './views/Settings.svelte';

  // Hash routes so the phone's back gesture works: #/, #/new, #/g/<id>, #/settings
  let hash = $state(location.hash);
  $effect(() => {
    const onHash = () => {
      hash = location.hash;
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  let route = $derived.by(() => {
    const parts = hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'new') return { view: 'new' };
    if (parts[0] === 'settings') return { view: 'settings' };
    if (parts[0] === 'g' && parts[1]) return { view: 'graph', id: parts[1], add: parts[2] === 'add' };
    return { view: 'home' };
  });
</script>

{#if app.ready}
  {#if route.view === 'new'}
    <NewGraph />
  {:else if route.view === 'settings'}
    <Settings />
  {:else if route.view === 'graph'}
    {#key route.id}
      <Graph id={route.id} focusAdd={route.add} />
    {/key}
  {:else}
    <Home />
  {/if}
{/if}
