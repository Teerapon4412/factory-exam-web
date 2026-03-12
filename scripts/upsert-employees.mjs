import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEmployee, listEmployees, updateEmployee } from "../server/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/upsert-employees.mjs <employees.json>");
  process.exit(1);
}

const raw = await fs.readFile(path.resolve(__dirname, "..", inputPath), "utf8");
const source = JSON.parse(raw.replace(/^\uFEFF/, ""));
if (!Array.isArray(source)) {
  console.error("Input file must be a JSON array");
  process.exit(1);
}

const existing = await listEmployees();
const byCode = new Map(existing.map((employee) => [employee.employeeCode, employee]));

let created = 0;
let updated = 0;
let skipped = 0;

for (const row of source) {
  const employeeCode = String(row.employeeCode || "").trim();
  const fullName = String(row.fullName || "").trim();
  if (!employeeCode || !fullName) {
    skipped += 1;
    continue;
  }

  const current = byCode.get(employeeCode);
  const payload = {
    username: employeeCode,
    employeeCode,
    fullName,
    department: String(row.department || "").trim(),
    position: String(row.position || "").trim(),
    role: row.role === "ADMIN" ? "ADMIN" : "USER",
    isActive: row.isActive !== false,
  };

  if (!current) {
    await createEmployee({
      ...payload,
      password: employeeCode,
    });
    created += 1;
    continue;
  }

  await updateEmployee(current.id, payload);
  updated += 1;
}

console.log(JSON.stringify({ created, updated, skipped, total: source.length }, null, 2));
