// src/options.ts
//
// Jedyne miejsce, w którym klucz API wchodzi do wtyczki. Zapisany klucz nigdy
// nie wraca do pola formularza — strona opcji pokazuje wyłącznie to, czy klucz
// istnieje. Inaczej wystarczyłby zrzut ekranu albo udostępniony pulpit.

import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  STORAGE_KEYS,
} from "./settings.js";
import { readLocal } from "./storage.js";

function input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function setState(id: string, present: boolean) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = present ? "Klucz zapisany" : "Brak klucza";
  node.className = present ? "state saved" : "state empty";
}

function setStatus(message: string) {
  const node = document.getElementById("status");
  if (node) node.textContent = message;
}

async function refreshState() {
  const [openai, brave] = await Promise.all([
    readLocal<string>(STORAGE_KEYS.openai, ""),
    readLocal<string>(STORAGE_KEYS.brave, ""),
  ]);
  setState("openai-state", openai.trim().length > 0);
  setState("brave-state", brave.trim().length > 0);
}

function fillModels(current: string) {
  const select = document.getElementById("model") as HTMLSelectElement;
  if (!select) return;
  select.replaceChildren();
  for (const model of AVAILABLE_MODELS) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    option.selected = model === current;
    select.appendChild(option);
  }
}

async function save() {
  const openaiValue = input("openai-key").value.trim();
  const braveValue = input("brave-key").value.trim();
  const model = (document.getElementById("model") as HTMLSelectElement).value;

  // Puste pole znaczy "nie zmieniaj", a nie "skasuj" — od kasowania
  // jest osobny przycisk.
  const update: Record<string, string> = { [STORAGE_KEYS.model]: model };
  if (openaiValue) update[STORAGE_KEYS.openai] = openaiValue;
  if (braveValue) update[STORAGE_KEYS.brave] = braveValue;

  await chrome.storage.local.set(update);

  input("openai-key").value = "";
  input("brave-key").value = "";
  await refreshState();
  setStatus("Zapisano.");
}

async function clearKeys() {
  await chrome.storage.local.remove([STORAGE_KEYS.openai, STORAGE_KEYS.brave]);
  input("openai-key").value = "";
  input("brave-key").value = "";
  await refreshState();
  setStatus("Klucze usunięte.");
}

document.addEventListener("DOMContentLoaded", async () => {
  fillModels(await readLocal<string>(STORAGE_KEYS.model, DEFAULT_MODEL));
  await refreshState();

  document.getElementById("save")?.addEventListener("click", () => {
    void save();
  });
  document.getElementById("clear")?.addEventListener("click", () => {
    void clearKeys();
  });
});
