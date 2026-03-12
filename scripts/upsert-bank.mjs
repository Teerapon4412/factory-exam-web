import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadState, saveState } from "../server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/upsert-bank.mjs <bank.json>");
  process.exit(1);
}

const raw = await fs.readFile(path.resolve(__dirname, "..", inputPath), "utf8");
const bank = JSON.parse(raw.replace(/^\uFEFF/, ""));
const current = await loadState();

await saveState({
  bank,
  results: current.results || [],
});

const next = await loadState();
const modelCount = Array.isArray(next.bank?.models) ? next.bank.models.length : 0;
const partCount = (next.bank?.models || []).reduce((sum, model) => sum + ((model.parts || []).length), 0);
const questionCount = (next.bank?.models || []).reduce(
  (sum, model) => sum + (model.parts || []).reduce((partSum, part) => partSum + ((part.questions || []).length), 0),
  0,
);

console.log(JSON.stringify({
  title: next.bank?.title || "",
  models: modelCount,
  parts: partCount,
  questions: questionCount,
  results: next.results?.length || 0,
}, null, 2));
