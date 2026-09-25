import { useSyncExternalStore } from 'react';
import { ALL_CVD_TYPES, cvdFilterId } from './cvd.js';

// Estado compartido del simulador de daltonismo. Lo usan el botón flotante
// (ColorBlindSimulator) y el resultado del test, así los dos muestran y
// cambian la misma simulación. Se aplica sobre <html> y se recuerda en
// este navegador.

const STORAGE_KEY = 'aula-cvd-sim';

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && ALL_CVD_TYPES.includes(saved.type)) return { on: Boolean(saved.on), type: saved.type };
  } catch { /* sin storage: arrancamos con el simulador apagado */ }
  return { on: false, type: 'deuteranopia' };
}

let state = readSaved();
const listeners = new Set();

function apply() {
  const root = document.documentElement;
  if (state.on) root.style.setProperty('--cvd-sim-filter', `url(#${cvdFilterId(state.type)})`);
  else root.style.removeProperty('--cvd-sim-filter');
  root.dataset.cvdSim = state.on ? state.type : '';
}
apply();

export function setCvdSim(patch) {
  const next = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  if (next.on === state.on && next.type === state.type) return;
  state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignorar */ }
  apply();
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useCvdSim = () => useSyncExternalStore(subscribe, () => state);
