import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import crypto from "node:crypto";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const dbPath = path.join(dataDir, "factory-exam.sqlite");
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 14);

const defaultState = {
  bank: {
    title: "Factory Online Exam",
    models: [],
  },
  results: [],
};

const adminSeed = {
  username: process.env.ADMIN_USERNAME || "ADMIN1234",
  password: process.env.ADMIN_PASSWORD || "ADMIN1234",
  employeeCode: process.env.ADMIN_EMPLOYEE_CODE || "ADMIN1234",
  fullName: process.env.ADMIN_FULL_NAME || "Administrator",
  department: process.env.ADMIN_DEPARTMENT || "System",
  position: process.env.ADMIN_POSITION || "Administrator",
  role: "ADMIN",
};

let dbInstance;

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !password || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  const a = Buffer.from(originalHash, "hex");
  const b = Buffer.from(candidate, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSessionExpiry() {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires.toISOString();
}

function employeePublicFields(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    employeeCode: row.employee_code,
    fullName: row.full_name,
    department: row.department,
    position: row.position,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function openDb() {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      employee_code TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT '',
      position TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'USER',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  const stateRow = db.prepare("SELECT key FROM app_state WHERE key = ?").get("global_state");
  if (!stateRow) {
    db.prepare("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)")
      .run("global_state", JSON.stringify(defaultState), nowIso());
  }

  const adminRow = db.prepare("SELECT id FROM employees WHERE username = ?").get(adminSeed.username);
  if (!adminRow) {
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO employees (
        id, username, employee_code, password_hash, full_name, department, position, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      adminSeed.username,
      adminSeed.employeeCode,
      hashPassword(adminSeed.password),
      adminSeed.fullName,
      adminSeed.department,
      adminSeed.position,
      adminSeed.role,
      1,
      timestamp,
      timestamp,
    );
  }

  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
  dbInstance = db;
  return db;
}

export async function getDb() {
  return openDb();
}

export async function closeDb() {
  if (!dbInstance) return;
  dbInstance.close();
  dbInstance = null;
}

export async function resetDbForTests() {
  await closeDb();
  await fsPromises.rm(dbPath, { force: true });
}

export async function loadState() {
  const db = await getDb();
  const row = db.prepare("SELECT value FROM app_state WHERE key = ?").get("global_state");
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

  db.prepare("UPDATE app_state SET value = ?, updated_at = ? WHERE key = ?")
    .run(JSON.stringify(safeState), nowIso(), "global_state");

  return safeState;
}

export async function appendResult(result) {
  const current = await loadState();
  const next = {
    ...current,
    results: [result, ...(Array.isArray(current.results) ? current.results : [])].slice(0, 1000),
  };
  await saveState(next);
  return next.results;
}

export async function listEmployees() {
  const db = await getDb();
  const rows = db.prepare(`
    SELECT id, username, employee_code, full_name, department, position, role, is_active, created_at, updated_at
    FROM employees
    ORDER BY role DESC, full_name COLLATE NOCASE ASC
  `).all();
  return rows.map(employeePublicFields);
}

export async function createEmployee(input) {
  const db = await getDb();
  const timestamp = nowIso();
  const employeeCode = String(input.employeeCode || "").trim();
  const employee = {
    id: crypto.randomUUID(),
    username: employeeCode,
    employeeCode,
    password: String(input.password || employeeCode).trim(),
    fullName: String(input.fullName || "").trim(),
    department: String(input.department || "").trim(),
    position: String(input.position || "").trim(),
    role: input.role === "ADMIN" ? "ADMIN" : "USER",
    isActive: input.isActive === false ? 0 : 1,
  };

  if (!employee.username || !employee.employeeCode || !employee.password || !employee.fullName) {
    throw new Error("REQUIRED_FIELDS");
  }

  db.prepare(`
    INSERT INTO employees (
      id, username, employee_code, password_hash, full_name, department, position, role, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    employee.id,
    employee.username,
    employee.employeeCode,
    hashPassword(employee.password),
    employee.fullName,
    employee.department,
    employee.position,
    employee.role,
    employee.isActive,
    timestamp,
    timestamp,
  );

  return employeePublicFields({
    id: employee.id,
    username: employee.username,
    employee_code: employee.employeeCode,
    full_name: employee.fullName,
    department: employee.department,
    position: employee.position,
    role: employee.role,
    is_active: employee.isActive,
    created_at: timestamp,
    updated_at: timestamp,
  });
}

export async function updateEmployee(id, input) {
  const db = await getDb();
  const current = db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
  if (!current) throw new Error("NOT_FOUND");

  const nextEmployeeCode = String(input.employeeCode ?? current.employee_code).trim();
  const next = {
    username: nextEmployeeCode,
    employeeCode: nextEmployeeCode,
    fullName: String(input.fullName ?? current.full_name).trim(),
    department: String(input.department ?? current.department).trim(),
    position: String(input.position ?? current.position).trim(),
    role: input.role === "ADMIN" ? "ADMIN" : input.role === "USER" ? "USER" : current.role,
    isActive: typeof input.isActive === "boolean" ? (input.isActive ? 1 : 0) : current.is_active,
    passwordHash: current.password_hash,
  };

  if (!next.username || !next.employeeCode || !next.fullName) {
    throw new Error("REQUIRED_FIELDS");
  }

  const updatedAt = nowIso();
  db.prepare(`
    UPDATE employees
    SET username = ?, employee_code = ?, password_hash = ?, full_name = ?, department = ?, position = ?, role = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.username,
    next.employeeCode,
    next.passwordHash,
    next.fullName,
    next.department,
    next.position,
    next.role,
    next.isActive,
    updatedAt,
    id,
  );

  return employeePublicFields({
    id,
    username: next.username,
    employee_code: next.employeeCode,
    full_name: next.fullName,
    department: next.department,
    position: next.position,
    role: next.role,
    is_active: next.isActive,
    created_at: current.created_at,
    updated_at: updatedAt,
  });
}

export async function deleteEmployee(id) {
  const db = await getDb();
  const current = db.prepare("SELECT * FROM employees WHERE id = ?").get(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.username === adminSeed.username) throw new Error("CANNOT_DELETE_DEFAULT_ADMIN");

  db.prepare("DELETE FROM sessions WHERE employee_id = ?").run(id);
  db.prepare("DELETE FROM employees WHERE id = ?").run(id);
}

export async function authenticateEmployeeByCode(employeeCode) {
  const db = await getDb();
  const user = db.prepare("SELECT * FROM employees WHERE employee_code = ?").get(String(employeeCode || "").trim());
  if (!user || !user.is_active) return null;
  return employeePublicFields(user);
}

export async function createSession(employeeId) {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = nowIso();
  const expiresAt = createSessionExpiry();
  db.prepare("INSERT INTO sessions (token, employee_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, employeeId, createdAt, expiresAt);
  return { token, createdAt, expiresAt };
}

export async function getSession(token) {
  if (!token) return null;
  const db = await getDb();
  const row = db.prepare(`
    SELECT
      s.token,
      s.created_at,
      s.expires_at,
      e.id,
      e.username,
      e.employee_code,
      e.full_name,
      e.department,
      e.position,
      e.role,
      e.is_active,
      e.created_at AS employee_created_at,
      e.updated_at AS employee_updated_at
    FROM sessions s
    JOIN employees e ON e.id = s.employee_id
    WHERE s.token = ?
  `).get(token);

  if (!row) return null;
  if (!row.is_active || row.expires_at <= nowIso()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    employee: employeePublicFields({
      id: row.id,
      username: row.username,
      employee_code: row.employee_code,
      full_name: row.full_name,
      department: row.department,
      position: row.position,
      role: row.role,
      is_active: row.is_active,
      created_at: row.employee_created_at,
      updated_at: row.employee_updated_at,
    }),
  };
}

export async function deleteSession(token) {
  if (!token) return;
  const db = await getDb();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
