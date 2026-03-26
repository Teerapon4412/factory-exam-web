import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import crypto from "node:crypto";
import fallbackExamBankSeed from "../scripts/exam-bank.seed.json" with { type: "json" };

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const dbPath = path.join(dataDir, "factory-exam.sqlite");
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 14);

function createFallbackBank() {
  if (fallbackExamBankSeed && Array.isArray(fallbackExamBankSeed.models) && fallbackExamBankSeed.models.length) {
    return JSON.parse(JSON.stringify(fallbackExamBankSeed));
  }

  return {
    title: "Factory Online Exam",
    models: [],
  };
}

function hasBankContent(bank) {
  return Array.isArray(bank?.models) && bank.models.some((model) => Array.isArray(model?.parts) && model.parts.some((part) => Array.isArray(part?.questions) && part.questions.length));
}

function modelKey(model) {
  return String(model?.id || `${model?.modelCode || ""}::${model?.modelName || ""}`);
}

function partKey(part) {
  return String(part?.id || `${part?.partCode || ""}::${part?.partName || ""}`);
}

function questionKey(question) {
  return String(question?.id || `${question?.questionNo || ""}::${question?.questionText || ""}`);
}

function countBankContent(bank) {
  const models = Array.isArray(bank?.models) ? bank.models.length : 0;
  const parts = (bank?.models || []).reduce((sum, model) => sum + ((model.parts || []).length), 0);
  const questions = (bank?.models || []).reduce(
    (sum, model) => sum + (model.parts || []).reduce((partSum, part) => partSum + ((part.questions || []).length), 0),
    0,
  );

  return { models, parts, questions };
}

function mergeQuestions(baseQuestions = [], incomingQuestions = []) {
  const order = [];
  const merged = new Map();

  for (const question of baseQuestions) {
    const key = questionKey(question);
    if (!merged.has(key)) order.push(key);
    merged.set(key, JSON.parse(JSON.stringify(question)));
  }

  for (const question of incomingQuestions) {
    const key = questionKey(question);
    if (!merged.has(key)) order.push(key);
    const previous = merged.get(key) || {};
    merged.set(key, {
      ...previous,
      ...JSON.parse(JSON.stringify(question)),
    });
  }

  return order.map((key, index) => {
    const question = merged.get(key);
    return {
      ...question,
      questionNo: index + 1,
    };
  });
}

function mergeParts(baseParts = [], incomingParts = []) {
  const order = [];
  const merged = new Map();

  for (const part of baseParts) {
    const key = partKey(part);
    if (!merged.has(key)) order.push(key);
    merged.set(key, JSON.parse(JSON.stringify(part)));
  }

  for (const part of incomingParts) {
    const key = partKey(part);
    const previous = merged.get(key) || {};
    if (!merged.has(key)) order.push(key);
    merged.set(key, {
      ...previous,
      ...JSON.parse(JSON.stringify(part)),
      questions: mergeQuestions(previous.questions || [], part.questions || []),
    });
  }

  return order.map((key) => merged.get(key));
}

function mergeBanks(baseBank, incomingBank) {
  if (!hasBankContent(baseBank) && !hasBankContent(incomingBank)) {
    return createFallbackBank();
  }

  if (!hasBankContent(baseBank)) {
    return JSON.parse(JSON.stringify(incomingBank));
  }

  if (!hasBankContent(incomingBank)) {
    return JSON.parse(JSON.stringify(baseBank));
  }

  const order = [];
  const merged = new Map();

  for (const model of baseBank.models || []) {
    const key = modelKey(model);
    if (!merged.has(key)) order.push(key);
    merged.set(key, JSON.parse(JSON.stringify(model)));
  }

  for (const model of incomingBank.models || []) {
    const key = modelKey(model);
    const previous = merged.get(key) || {};
    if (!merged.has(key)) order.push(key);
    merged.set(key, {
      ...previous,
      ...JSON.parse(JSON.stringify(model)),
      parts: mergeParts(previous.parts || [], model.parts || []),
    });
  }

  return {
    ...JSON.parse(JSON.stringify(baseBank)),
    ...JSON.parse(JSON.stringify(incomingBank)),
    title: String(incomingBank?.title || baseBank?.title || "Factory Online Exam"),
    models: order.map((key) => merged.get(key)),
  };
}

function getProtectedBank(candidateBank, currentBank) {
  const fallbackBank = createFallbackBank();
  const candidate = hasBankContent(candidateBank) ? candidateBank : currentBank;
  const current = hasBankContent(currentBank) ? currentBank : fallbackBank;
  const protectedBank = mergeBanks(current, candidate);
  const restoredBank = mergeBanks(fallbackBank, protectedBank);
  const candidateStats = countBankContent(candidate);
  const currentStats = countBankContent(current);
  const restoredStats = countBankContent(restoredBank);

  if (
    candidateStats.models < currentStats.models
    || candidateStats.parts < currentStats.parts
    || candidateStats.questions < currentStats.questions
  ) {
    return restoredBank;
  }

  return restoredStats.questions >= candidateStats.questions ? restoredBank : candidate;
}

const defaultState = {
  bank: createFallbackBank(),
  results: [],
  news: [],
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function parseBoolish(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

function normalizeBankForStorage(bank) {
  const source = hasBankContent(bank) ? clone(bank) : createFallbackBank();
  return {
    title: String(source.title || "Factory Online Exam"),
    models: (source.models || []).map((model, modelIndex) => ({
      id: String(model.id || crypto.randomUUID()),
      modelCode: String(model.modelCode || `RG${String(modelIndex + 1).padStart(2, "0")}`),
      modelName: String(model.modelName || `Model ${modelIndex + 1}`),
      sortOrder: Number(model.sortOrder ?? modelIndex),
      parts: (model.parts || []).map((part, partIndex) => ({
        id: String(part.id || crypto.randomUUID()),
        partCode: String(part.partCode || `Part${String(partIndex + 1).padStart(2, "0")}`),
        partName: String(part.partName || `Part ${partIndex + 1}`),
        subtitle: String(part.subtitle || "ระบบข้อสอบออนไลน์พนักงาน"),
        passScore: Number(part.passScore || 0),
        randomizeQuestions: parseBoolish(part.randomizeQuestions, false),
        showResultImmediately: parseBoolish(part.showResultImmediately, true),
        sortOrder: Number(part.sortOrder ?? partIndex),
        questions: (part.questions || []).map((question, questionIndex) => ({
          id: String(question.id || crypto.randomUUID()),
          questionNo: Number(question.questionNo || questionIndex + 1),
          questionText: String(question.questionText || ""),
          imageUrl: String(question.imageUrl || ""),
          score: Number(question.score || 0),
          correctAnswer: String(question.correctAnswer || "A"),
          sortOrder: Number(question.sortOrder ?? questionIndex),
          choices: {
            A: String(question.choices?.A || ""),
            B: String(question.choices?.B || ""),
            C: String(question.choices?.C || ""),
            D: String(question.choices?.D || ""),
          },
        })),
      })),
    })),
  };
}

function readBankFromTables(db) {
  const models = db.prepare(`
    SELECT id, model_code, model_name, sort_order
    FROM exam_models
    ORDER BY sort_order ASC, created_at ASC
  `).all();

  if (!models.length) return createFallbackBank();

  const parts = db.prepare(`
    SELECT id, model_id, part_code, part_name, subtitle, pass_score, randomize_questions, show_result_immediately, sort_order
    FROM exam_parts
    ORDER BY sort_order ASC, created_at ASC
  `).all();

  const questions = db.prepare(`
    SELECT id, part_id, question_no, question_text, image_url, score, correct_answer, sort_order
    FROM exam_questions
    ORDER BY sort_order ASC, created_at ASC
  `).all();

  const choices = db.prepare(`
    SELECT question_id, choice_key, choice_text
    FROM exam_choices
    ORDER BY choice_key ASC
  `).all();

  const choicesByQuestionId = new Map();
  for (const choice of choices) {
    if (!choicesByQuestionId.has(choice.question_id)) {
      choicesByQuestionId.set(choice.question_id, { A: "", B: "", C: "", D: "" });
    }
    choicesByQuestionId.get(choice.question_id)[choice.choice_key] = choice.choice_text || "";
  }

  const questionsByPartId = new Map();
  for (const question of questions) {
    if (!questionsByPartId.has(question.part_id)) questionsByPartId.set(question.part_id, []);
    questionsByPartId.get(question.part_id).push({
      id: question.id,
      questionNo: Number(question.question_no || 0),
      questionText: question.question_text || "",
      imageUrl: question.image_url || "",
      score: Number(question.score || 0),
      correctAnswer: question.correct_answer || "A",
      choices: choicesByQuestionId.get(question.id) || { A: "", B: "", C: "", D: "" },
    });
  }

  const partsByModelId = new Map();
  for (const part of parts) {
    if (!partsByModelId.has(part.model_id)) partsByModelId.set(part.model_id, []);
    partsByModelId.get(part.model_id).push({
      id: part.id,
      partCode: part.part_code || "",
      partName: part.part_name || "",
      subtitle: part.subtitle || "ระบบข้อสอบออนไลน์พนักงาน",
      passScore: Number(part.pass_score || 0),
      randomizeQuestions: Boolean(part.randomize_questions),
      showResultImmediately: part.show_result_immediately == null ? true : Boolean(part.show_result_immediately),
      questions: (questionsByPartId.get(part.id) || []).sort((a, b) => a.questionNo - b.questionNo),
    });
  }

  return {
    title: "Factory Online Exam",
    models: models.map((model) => ({
      id: model.id,
      modelCode: model.model_code || "",
      modelName: model.model_name || "",
      parts: partsByModelId.get(model.id) || [],
    })),
  };
}

function writeBankToTables(db, rawBank) {
  const bank = normalizeBankForStorage(rawBank);
  const timestamp = nowIso();

  db.exec("BEGIN IMMEDIATE TRANSACTION");
  try {
    db.prepare("DELETE FROM exam_choices").run();
    db.prepare("DELETE FROM exam_questions").run();
    db.prepare("DELETE FROM exam_parts").run();
    db.prepare("DELETE FROM exam_models").run();

    const insertModel = db.prepare(`
      INSERT INTO exam_models (id, model_code, model_name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPart = db.prepare(`
      INSERT INTO exam_parts (
        id, model_id, part_code, part_name, subtitle, pass_score, randomize_questions, show_result_immediately, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertQuestion = db.prepare(`
      INSERT INTO exam_questions (
        id, part_id, question_no, question_text, image_url, score, correct_answer, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertChoice = db.prepare(`
      INSERT INTO exam_choices (id, question_id, choice_key, choice_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const model of bank.models) {
      insertModel.run(model.id, model.modelCode, model.modelName, model.sortOrder, timestamp, timestamp);
      for (const part of model.parts) {
        insertPart.run(
          part.id,
          model.id,
          part.partCode,
          part.partName,
          part.subtitle,
          part.passScore,
          part.randomizeQuestions ? 1 : 0,
          part.showResultImmediately ? 1 : 0,
          part.sortOrder,
          timestamp,
          timestamp,
        );
        for (const question of part.questions) {
          insertQuestion.run(
            question.id,
            part.id,
            question.questionNo,
            question.questionText,
            question.imageUrl,
            question.score,
            question.correctAnswer,
            question.sortOrder,
            timestamp,
            timestamp,
          );
          for (const choiceKey of ["A", "B", "C", "D"]) {
            insertChoice.run(
              crypto.randomUUID(),
              question.id,
              choiceKey,
              question.choices?.[choiceKey] || "",
              timestamp,
              timestamp,
            );
          }
        }
      }
    }

    db.exec("COMMIT");
    return bank;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
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
    photoUrl: row.photo_url || "",
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newsPublicFields(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    imageUrl: row.image_url,
    pinned: Boolean(row.pinned),
    published: row.published == null ? true : Boolean(row.published),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeNewsInput(input, current = null) {
  const title = String(input?.title ?? current?.title ?? '').trim();
  const summary = String(input?.summary ?? current?.summary ?? '').trim();
  const content = String(input?.content ?? current?.content ?? '').trim();
  const imageUrl = String(input?.imageUrl ?? current?.imageUrl ?? '').trim();
  const pinned = typeof input?.pinned === 'boolean' ? input.pinned : Boolean(current?.pinned);
  const published = typeof input?.published === 'boolean' ? input.published : current?.published !== false;

  if (!title || !content) throw new Error('REQUIRED_FIELDS');

  return { title, summary, content, imageUrl, pinned, published };
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
      photo_url TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      employee_code TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      evaluator TEXT NOT NULL DEFAULT '',
      section_title TEXT NOT NULL,
      model_id TEXT NOT NULL DEFAULT '',
      model_code TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT '',
      part_id TEXT NOT NULL,
      part_code TEXT NOT NULL DEFAULT '',
      part_name TEXT NOT NULL DEFAULT '',
      total_score REAL NOT NULL DEFAULT 0,
      max_score REAL NOT NULL DEFAULT 0,
      exam_score REAL NOT NULL DEFAULT 0,
      exam_full_score REAL NOT NULL DEFAULT 0,
      exam_status TEXT NOT NULL DEFAULT '',
      rows_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_models (
      id TEXT PRIMARY KEY,
      model_code TEXT NOT NULL,
      model_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_parts (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      part_code TEXT NOT NULL,
      part_name TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      pass_score REAL NOT NULL DEFAULT 0,
      randomize_questions INTEGER NOT NULL DEFAULT 0,
      show_result_immediately INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (model_id) REFERENCES exam_models(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      part_id TEXT NOT NULL,
      question_no INTEGER NOT NULL DEFAULT 1,
      question_text TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      score REAL NOT NULL DEFAULT 0,
      correct_answer TEXT NOT NULL DEFAULT 'A',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (part_id) REFERENCES exam_parts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_choices (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      choice_key TEXT NOT NULL,
      choice_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skill_matrix_entries (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      score_pct INTEGER NOT NULL DEFAULT 0,
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE (employee_id, part_id)
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 1,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const newsColumns = db.prepare("PRAGMA table_info(news)").all();
  if (!newsColumns.some((column) => column.name === "published")) {
    db.exec("ALTER TABLE news ADD COLUMN published INTEGER NOT NULL DEFAULT 1");
  }

  const employeeColumns = db.prepare("PRAGMA table_info(employees)").all();
  if (!employeeColumns.some((column) => column.name === "photo_url")) {
    db.exec("ALTER TABLE employees ADD COLUMN photo_url TEXT NOT NULL DEFAULT ''");
  }

  const stateRow = db.prepare("SELECT key FROM app_state WHERE key = ?").get("global_state");
  if (!stateRow) {
    db.prepare("INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)")
      .run("global_state", JSON.stringify(defaultState), nowIso());
  }

  const newsCountRow = db.prepare("SELECT COUNT(*) AS count FROM news").get();
  if (Number(newsCountRow?.count || 0) === 0) {
    const rawState = db.prepare("SELECT value FROM app_state WHERE key = ?").get("global_state");
    if (rawState?.value) {
      try {
        const parsed = JSON.parse(rawState.value);
        const legacyNews = Array.isArray(parsed?.news) ? parsed.news : [];
        if (legacyNews.length) {
          const insertNews = db.prepare(`
            INSERT INTO news (
              id, title, summary, content, image_url, pinned, published, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const timestamp = nowIso();
          for (const item of legacyNews) {
            const publishedAt = String(item?.publishedAt || timestamp);
            insertNews.run(
              String(item?.id || crypto.randomUUID()),
              String(item?.title || '').trim(),
              String(item?.summary || '').trim(),
              String(item?.content || '').trim(),
              String(item?.imageUrl || '').trim(),
              item?.pinned ? 1 : 0,
              item?.published === false ? 0 : 1,
              publishedAt,
              timestamp,
              timestamp,
            );
          }
        }
      } catch {
        // Ignore legacy news migration failures and continue booting.
      }
    }
  }

  const examModelCountRow = db.prepare("SELECT COUNT(*) AS count FROM exam_models").get();
  if (Number(examModelCountRow?.count || 0) === 0) {
    const rawState = db.prepare("SELECT value FROM app_state WHERE key = ?").get("global_state");
    if (rawState?.value) {
      try {
        const parsed = JSON.parse(rawState.value);
        const legacyBank = hasBankContent(parsed?.bank) ? parsed.bank : defaultState.bank;
        writeBankToTables(db, legacyBank);
      } catch {
        writeBankToTables(db, defaultState.bank);
      }
    } else {
      writeBankToTables(db, defaultState.bank);
    }
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
      "",
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
  const bankFromTables = readBankFromTables(db);
  if (!row) {
    return {
      ...defaultState,
      bank: hasBankContent(bankFromTables) ? bankFromTables : defaultState.bank,
    };
  }

  try {
    const parsed = JSON.parse(row.value);
    const protectedBank = getProtectedBank(bankFromTables, parsed.bank);
    if (JSON.stringify(protectedBank) !== JSON.stringify(bankFromTables)) {
      writeBankToTables(db, protectedBank);
    }
    return {
      bank: protectedBank,
      results: Array.isArray(parsed.results) ? parsed.results : defaultState.results,
      news: Array.isArray(parsed.news) ? parsed.news : defaultState.news,
    };
  } catch {
    return defaultState;
  }
}

export async function saveState(state) {
  const db = await getDb();
  const current = await loadState();
  const protectedBank = getProtectedBank(state.bank, current.bank);
  const safeState = {
    bank: protectedBank,
    results: Array.isArray(state.results) ? state.results : current.results,
    news: Array.isArray(state.news) ? state.news : current.news,
  };

  writeBankToTables(db, protectedBank);

  db.prepare("UPDATE app_state SET value = ?, updated_at = ? WHERE key = ?")
    .run(JSON.stringify(safeState), nowIso(), "global_state");

  return safeState;
}

export async function appendResult(result) {
  const current = await loadState();
  const candidateCode = String(result?.candidateCode || "").trim();
  const partId = String(result?.partId || "").trim();

  if (candidateCode && partId) {
    const alreadyPassed = (Array.isArray(current.results) ? current.results : []).some((entry) => entry.candidateCode === candidateCode && entry.partId === partId && entry.status === "PASS");
    if (alreadyPassed) throw new Error("PART_ALREADY_PASSED");
  }

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
    SELECT id, username, employee_code, full_name, department, position, photo_url, role, is_active, created_at, updated_at
    FROM employees
    ORDER BY role DESC, full_name COLLATE NOCASE ASC
  `).all();
  return rows.map(employeePublicFields);
}

export async function listNews(options = {}) {
  const db = await getDb();
  const includeHidden = Boolean(options.includeHidden);
  const rows = db.prepare(`
    SELECT id, title, summary, content, image_url, pinned, published, published_at, created_at, updated_at
    FROM news
    ${includeHidden ? "" : "WHERE published = 1"}
    ORDER BY pinned DESC, published_at DESC, created_at DESC
  `).all();
  return rows.map(newsPublicFields);
}

export async function createNews(input) {
  const db = await getDb();
  const timestamp = nowIso();
  const payload = sanitizeNewsInput(input);
  const id = crypto.randomUUID();
  const publishedAt = String(input?.publishedAt || timestamp);

  db.prepare(`
    INSERT INTO news (
      id, title, summary, content, image_url, pinned, published, published_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.title,
    payload.summary,
    payload.content,
    payload.imageUrl,
    payload.pinned ? 1 : 0,
    payload.published ? 1 : 0,
    publishedAt,
    timestamp,
    timestamp,
  );

  return newsPublicFields({
    id,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    image_url: payload.imageUrl,
    pinned: payload.pinned ? 1 : 0,
    published: payload.published ? 1 : 0,
    published_at: publishedAt,
    created_at: timestamp,
    updated_at: timestamp,
  });
}

export async function updateNews(id, input) {
  const db = await getDb();
  const current = db.prepare(`
    SELECT id, title, summary, content, image_url, pinned, published, published_at, created_at, updated_at
    FROM news
    WHERE id = ?
  `).get(id);
  if (!current) throw new Error('NOT_FOUND');

  const payload = sanitizeNewsInput(input, newsPublicFields(current));
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE news
    SET title = ?, summary = ?, content = ?, image_url = ?, pinned = ?, published = ?, updated_at = ?
    WHERE id = ?
  `).run(
    payload.title,
    payload.summary,
    payload.content,
    payload.imageUrl,
    payload.pinned ? 1 : 0,
    payload.published ? 1 : 0,
    updatedAt,
    id,
  );

  return newsPublicFields({
    ...current,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    image_url: payload.imageUrl,
    pinned: payload.pinned ? 1 : 0,
    published: payload.published ? 1 : 0,
    updated_at: updatedAt,
  });
}

export async function deleteNews(id) {
  const db = await getDb();
  const current = db.prepare('SELECT id FROM news WHERE id = ?').get(id);
  if (!current) throw new Error('NOT_FOUND');
  db.prepare('DELETE FROM news WHERE id = ?').run(id);
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
    photoUrl: String(input.photoUrl || "").trim(),
    role: input.role === "ADMIN" ? "ADMIN" : "USER",
    isActive: input.isActive === false ? 0 : 1,
  };

  if (!employee.username || !employee.employeeCode || !employee.password || !employee.fullName) {
    throw new Error("REQUIRED_FIELDS");
  }

  db.prepare(`
      INSERT INTO employees (
        id, username, employee_code, password_hash, full_name, department, position, photo_url, role, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
    employee.id,
    employee.username,
    employee.employeeCode,
    hashPassword(employee.password),
    employee.fullName,
    employee.department,
    employee.position,
    employee.photoUrl,
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
    photo_url: employee.photoUrl,
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
    photoUrl: String(input.photoUrl ?? current.photo_url).trim(),
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
    SET username = ?, employee_code = ?, password_hash = ?, full_name = ?, department = ?, position = ?, photo_url = ?, role = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.username,
    next.employeeCode,
    next.passwordHash,
    next.fullName,
    next.department,
    next.position,
    next.photoUrl,
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
    photo_url: next.photoUrl,
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

function skillMatrixEntryPublicFields(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    partId: row.part_id,
    scorePct: Number(row.score_pct || 0),
    updatedBy: row.updated_by || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSkillMatrixEntries() {
  const db = await getDb();
  const rows = db.prepare(`
    SELECT id, employee_id, part_id, score_pct, updated_by, created_at, updated_at
    FROM skill_matrix_entries
    ORDER BY updated_at DESC, created_at DESC
  `).all();
  return rows.map(skillMatrixEntryPublicFields);
}

export async function upsertSkillMatrixEntry(input) {
  const db = await getDb();
  const employeeId = String(input.employeeId || "").trim();
  const partId = String(input.partId || "").trim();
  const scorePct = Math.max(0, Math.min(100, Number(input.scorePct || 0)));
  const updatedBy = String(input.updatedBy || "").trim();

  if (!employeeId || !partId) throw new Error("REQUIRED_FIELDS");

  const employee = db.prepare("SELECT id FROM employees WHERE id = ?").get(employeeId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const part = db.prepare("SELECT id FROM exam_parts WHERE id = ?").get(partId);
  if (!part) throw new Error("PART_NOT_FOUND");

  const current = db.prepare(`
    SELECT id, employee_id, part_id, score_pct, updated_by, created_at, updated_at
    FROM skill_matrix_entries
    WHERE employee_id = ? AND part_id = ?
  `).get(employeeId, partId);

  if (!current) {
    const timestamp = nowIso();
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO skill_matrix_entries (id, employee_id, part_id, score_pct, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId, partId, scorePct, updatedBy, timestamp, timestamp);

    return skillMatrixEntryPublicFields({
      id,
      employee_id: employeeId,
      part_id: partId,
      score_pct: scorePct,
      updated_by: updatedBy,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  const updatedAt = nowIso();
  db.prepare(`
    UPDATE skill_matrix_entries
    SET score_pct = ?, updated_by = ?, updated_at = ?
    WHERE id = ?
  `).run(scorePct, updatedBy, updatedAt, current.id);

  return skillMatrixEntryPublicFields({
    ...current,
    score_pct: scorePct,
    updated_by: updatedBy,
    updated_at: updatedAt,
  });
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
      e.photo_url,
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
      photo_url: row.photo_url,
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

function parseEvaluationRow(row) {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    employeeName: row.employee_name,
    evaluator: row.evaluator,
    sectionTitle: row.section_title,
    modelId: row.model_id,
    modelCode: row.model_code,
    modelName: row.model_name,
    partId: row.part_id,
    partCode: row.part_code,
    partName: row.part_name,
    totalScore: Number(row.total_score || 0),
    maxScore: Number(row.max_score || 0),
    examScore: Number(row.exam_score || 0),
    examFullScore: Number(row.exam_full_score || 0),
    examStatus: row.exam_status || "",
    rows: JSON.parse(row.rows_json || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findLatestExamResult(results, employeeCode, partId) {
  return (Array.isArray(results) ? results : []).find((entry) => (
    entry?.candidateCode === employeeCode && entry?.partId === partId
  )) || null;
}

export async function listEvaluations() {
  const db = await getDb();
  const rows = db.prepare(`
    SELECT
      id,
      employee_id,
      employee_code,
      employee_name,
      evaluator,
      section_title,
      model_id,
      model_code,
      model_name,
      part_id,
      part_code,
      part_name,
      total_score,
      max_score,
      exam_score,
      exam_full_score,
      exam_status,
      rows_json,
      created_at,
      updated_at
    FROM evaluations
    ORDER BY updated_at DESC, created_at DESC
  `).all();
  return rows.map(parseEvaluationRow);
}

export async function createEvaluation(input) {
  const db = await getDb();
  const employeeId = String(input.employeeId || "").trim();
  const partId = String(input.partId || "").trim();
  const sectionTitle = String(input.sectionTitle || "").trim();
  const evaluator = String(input.evaluator || "").trim();
  const rows = Array.isArray(input.rows) ? input.rows : [];

  if (!employeeId || !partId || !sectionTitle || !rows.length) {
    throw new Error("REQUIRED_FIELDS");
  }

  const employee = db.prepare(`
    SELECT id, employee_code, full_name
    FROM employees
    WHERE id = ? AND is_active = 1
  `).get(employeeId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const state = await loadState();
  const examResult = findLatestExamResult(state.results, employee.employee_code, partId);
  const timestamp = nowIso();
  const payload = {
    id: crypto.randomUUID(),
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    employeeName: employee.full_name,
    evaluator,
    sectionTitle,
    modelId: String(input.modelId || "").trim(),
    modelCode: String(input.modelCode || "").trim(),
    modelName: String(input.modelName || "").trim(),
    partId,
    partCode: String(input.partCode || "").trim(),
    partName: String(input.partName || "").trim(),
    totalScore: Number(input.totalScore || 0),
    maxScore: Number(input.maxScore || 0),
    examScore: Number(examResult?.score || 0),
    examFullScore: Number(examResult?.fullScore || 0),
    examStatus: String(examResult?.status || ""),
    rowsJson: JSON.stringify(rows),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const existing = db.prepare(`
    SELECT id, created_at
    FROM evaluations
    WHERE employee_id = ? AND part_id = ?
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `).get(payload.employeeId, payload.partId);

  if (existing) {
    payload.id = existing.id;
    payload.createdAt = existing.created_at;

    db.prepare(`
      UPDATE evaluations
      SET
        employee_code = ?,
        employee_name = ?,
        evaluator = ?,
        section_title = ?,
        model_id = ?,
        model_code = ?,
        model_name = ?,
        part_code = ?,
        part_name = ?,
        total_score = ?,
        max_score = ?,
        exam_score = ?,
        exam_full_score = ?,
        exam_status = ?,
        rows_json = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      payload.employeeCode,
      payload.employeeName,
      payload.evaluator,
      payload.sectionTitle,
      payload.modelId,
      payload.modelCode,
      payload.modelName,
      payload.partCode,
      payload.partName,
      payload.totalScore,
      payload.maxScore,
      payload.examScore,
      payload.examFullScore,
      payload.examStatus,
      payload.rowsJson,
      payload.updatedAt,
      payload.id,
    );
  } else {
    db.prepare(`
      INSERT INTO evaluations (
        id,
        employee_id,
        employee_code,
        employee_name,
        evaluator,
        section_title,
        model_id,
        model_code,
        model_name,
        part_id,
        part_code,
        part_name,
        total_score,
        max_score,
        exam_score,
        exam_full_score,
        exam_status,
        rows_json,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.id,
      payload.employeeId,
      payload.employeeCode,
      payload.employeeName,
      payload.evaluator,
      payload.sectionTitle,
      payload.modelId,
      payload.modelCode,
      payload.modelName,
      payload.partId,
      payload.partCode,
      payload.partName,
      payload.totalScore,
      payload.maxScore,
      payload.examScore,
      payload.examFullScore,
      payload.examStatus,
      payload.rowsJson,
      payload.createdAt,
      payload.updatedAt,
    );
  }

  return parseEvaluationRow({
    id: payload.id,
    employee_id: payload.employeeId,
    employee_code: payload.employeeCode,
    employee_name: payload.employeeName,
    evaluator: payload.evaluator,
    section_title: payload.sectionTitle,
    model_id: payload.modelId,
    model_code: payload.modelCode,
    model_name: payload.modelName,
    part_id: payload.partId,
    part_code: payload.partCode,
    part_name: payload.partName,
    total_score: payload.totalScore,
    max_score: payload.maxScore,
    exam_score: payload.examScore,
    exam_full_score: payload.examFullScore,
    exam_status: payload.examStatus,
    rows_json: payload.rowsJson,
    created_at: payload.createdAt,
    updated_at: payload.updatedAt,
  });
}
