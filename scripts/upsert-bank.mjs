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

const hasBankContent = Array.isArray(current.bank?.models)
  && current.bank.models.some((model) => Array.isArray(model?.parts)
    && model.parts.some((part) => Array.isArray(part?.questions) && part.questions.length));

if (hasBankContent) {
  const modelCount = Array.isArray(current.bank?.models) ? current.bank.models.length : 0;
  const partCount = (current.bank?.models || []).reduce((sum, model) => sum + ((model.parts || []).length), 0);
  const questionCount = (current.bank?.models || []).reduce(
    (sum, model) => sum + (model.parts || []).reduce((partSum, part) => partSum + ((part.questions || []).length), 0),
    0,
  );

  console.log(JSON.stringify({
    skipped: true,
    reason: "bank already exists",
    title: current.bank?.title || "",
    models: modelCount,
    parts: partCount,
    questions: questionCount,
    results: current.results?.length || 0,
    news: current.news?.length || 0,
  }, null, 2));
  process.exit(0);
}

await saveState({
  bank,
  results: current.results || [],
  news: current.news || [],
});

const next = await loadState();
const modelCount = Array.isArray(next.bank?.models) ? next.bank.models.length : 0;
const partCount = (next.bank?.models || []).reduce((sum, model) => sum + ((model.parts || []).length), 0);
const questionCount = (next.bank?.models || []).reduce(
  (sum, model) => sum + (model.parts || []).reduce((partSum, part) => partSum + ((part.questions || []).length), 0),
  0,
);

console.log(JSON.stringify({
  skipped: false,
  title: next.bank?.title || "",
  models: modelCount,
  parts: partCount,
  questions: questionCount,
  results: next.results?.length || 0,
  news: next.news?.length || 0,
}, null, 2));
