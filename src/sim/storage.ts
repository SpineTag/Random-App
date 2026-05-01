import { GameState } from "./types";

const KEY = "grand_strategy_sim_save_v1";

export function saveGame(state: GameState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

