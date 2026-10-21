import { mount } from 'svelte';
import './styles/theme.css';
import App from './App.svelte';
import { init } from './lib/store.svelte.js';
import { askForPersistentStorage } from './lib/db.js';

init().then(askForPersistentStorage);

export default mount(App, { target: document.getElementById('app') });
