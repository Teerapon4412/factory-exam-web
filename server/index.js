import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  authenticateEmployee,
  appendResult,
  createEmployee,
  createSession,
  deleteEmployee,
  deleteSession,
  getSession,
  listEmployees,
  loadState,
  saveState,
  updateEmployee,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

function sanitizeSessionPayload(session) {
  return {
    token: session.token,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    employee: session.employee,
  };
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    const session = await getSession(token);
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    req.session = session;
    req.user = session.employee;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post("/api/login", async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "").trim();
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const employee = await authenticateEmployee(username, password);
    if (!employee) return res.status(401).json({ error: "Invalid username or password" });

    const sessionMeta = await createSession(employee.id);
    res.json({
      token: sessionMeta.token,
      createdAt: sessionMeta.createdAt,
      expiresAt: sessionMeta.expiresAt,
      employee,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/session", requireAuth, async (req, res) => {
  res.json(sanitizeSessionPayload(req.session));
});

app.post("/api/logout", requireAuth, async (req, res, next) => {
  try {
    await deleteSession(req.session.token);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/state", requireAuth, async (_req, res, next) => {
  try {
    res.json(await loadState());
  } catch (error) {
    next(error);
  }
});

app.put("/api/state", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await saveState(req.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/results", requireAuth, async (req, res, next) => {
  try {
    const entry = {
      ...(req.body ?? {}),
      employeeId: req.user.id,
      candidateName: req.user.fullName,
      candidateCode: req.user.employeeCode,
    };
    res.status(201).json(await appendResult(entry));
  } catch (error) {
    next(error);
  }
});

app.get("/api/employees", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await listEmployees());
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const employee = await createEmployee(req.body ?? {});
    res.status(201).json(employee);
  } catch (error) {
    if (error?.message === "REQUIRED_FIELDS") {
      return res.status(400).json({ error: "Required fields are missing" });
    }
    if (String(error?.message || "").includes("UNIQUE")) {
      return res.status(409).json({ error: "Username or employee code already exists" });
    }
    next(error);
  }
});

app.put("/api/employees/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const employee = await updateEmployee(req.params.id, req.body ?? {});
    res.json(employee);
  } catch (error) {
    if (error?.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (error?.message === "REQUIRED_FIELDS") {
      return res.status(400).json({ error: "Required fields are missing" });
    }
    if (String(error?.message || "").includes("UNIQUE")) {
      return res.status(409).json({ error: "Username or employee code already exists" });
    }
    next(error);
  }
});

app.delete("/api/employees/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await deleteEmployee(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    if (error?.message === "NOT_FOUND") {
      return res.status(404).json({ error: "Employee not found" });
    }
    if (error?.message === "CANNOT_DELETE_DEFAULT_ADMIN") {
      return res.status(400).json({ error: "Default admin cannot be deleted" });
    }
    next(error);
  }
});

app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Factory exam server listening on http://0.0.0.0:${PORT}`);
});
