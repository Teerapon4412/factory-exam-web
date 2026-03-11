import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "node:path";
import fs from "node:fs/promises";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const dbPath = path.join(dataDir, "factory-exam.sqlite");

const defaultState = {
  bank: {
    title: "Factory Online Exam",
    models: [],
  },
  results: [],
};

let dbPromise;

async function createDb() {
  await fs.mkdir(dataDir, { recursive: true });
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  const row = await db.get("SELECT key FROM app_state WHERE key = ?", ["global_state"]);
  if (!row) {
    await db.run(
      "INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)",
      ["global_state", JSON.stringify(defaultState), new Date().toISOString()],
    );
  }

  return db;
}

export async function getDb() {
  if (!dbPromise) dbPromise = createDb();
  return dbPromise;
}

export async function loadState() {
  const db = await getDb();
  const row = await db.get("SELECT value FROM app_state WHERE key = ?", ["global_state"]);
  if (!row) return defaultState;

  try {
    const parsed = JSON.parse(row.value);
    return {
      bank: parsed.bank ?? defaultState.bank,
      results: Array.isArray(parsed.results) ? parsed.results : defaultState.results,
    };
  } catch {
    return defaultState;
  }
}

export async function saveState(state) {
  const db = await getDb();
  const safeState = {
    bank: state.bank ?? defaultState.bank,
    results: Array.isArray(state.results) ? state.results : defaultState.results,
  };

  await db.run(
    "UPDATE app_state SET value = ?, updated_at = ? WHERE key = ?",
    [JSON.stringify(safeState), new Date().toISOString(), "global_state"],
  );

  return safeState;
}
