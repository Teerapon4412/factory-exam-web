import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import fallbackExamBankSeed from "../scripts/exam-bank.seed.json";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Eye,
  FileJson,
  ImagePlus,
  LockKeyhole,
  LogOut,
  Megaphone,
  Plus,
  Search,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import "./App.css";

const STORAGE_KEY = "factory_exam_builder_v2";
const RESULTS_KEY = "factory_exam_results_v1";
const NEWS_KEY = "factory_exam_news_v1";
const SESSION_KEY = "factory_exam_session_v1";
const EVALUATION_DRAFT_KEY = "factory_exam_evaluation_draft_v1";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyEmployeeForm = {
  employeeCode: "",
  fullName: "",
  department: "",
  position: "",
  role: "USER",
  isActive: true,
};

const S = {
  card: {
    borderRadius: 24,
    background: "var(--panel)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-soft)",
  },
  btn: {
    borderRadius: 16,
    padding: "11px 15px",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease",
  },
  input: {
    width: "100%",
    borderRadius: 16,
    padding: "12px 14px",
    border: "1px solid var(--line)",
    background: "rgba(255,255,255,0.9)",
    color: "var(--ink)",
    outline: "none",
  },
};

const Card = ({ children, className = "", style }) => (
  <div className={`app-card ${className}`.trim()} style={{ ...S.card, ...(style || {}) }}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "", style }) => (
  <div className={`card-header ${className}`.trim()} style={style}>
    {children}
  </div>
);

const CardContent = ({ children, className = "", style }) => (
  <div className={`card-content ${className}`.trim()} style={style}>
    {children}
  </div>
);

const Label = ({ children }) => <label className="field-label">{children}</label>;

const Input = ({ className = "", style, ...props }) => (
  <input {...props} className={`app-input ${className}`.trim()} style={{ ...S.input, ...(style || {}) }} />
);

const Textarea = ({ className = "", style, ...props }) => (
  <textarea
    {...props}
    className={`app-input app-textarea ${className}`.trim()}
    style={{ ...S.input, resize: "vertical", ...(style || {}) }}
  />
);

const Badge = ({ children, outline = false }) => (
  <span className={`badge ${outline ? "badge-outline" : "badge-solid"}`}>{children}</span>
);

const Button = ({ children, onClick, variant = "default", disabled = false, className = "", style, ...props }) => {
  const palette = variant === "default"
    ? {
        background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
        color: "#fff",
        border: "1px solid transparent",
        boxShadow: "0 16px 34px rgba(211, 84, 0, 0.22)",
      }
    : variant === "destructive"
      ? {
          background: "linear-gradient(135deg, #7f1d1d, #b91c1c)",
          color: "#fff",
          border: "1px solid transparent",
          boxShadow: "0 16px 34px rgba(127, 29, 29, 0.2)",
        }
      : {
          background: "rgba(255,255,255,0.78)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          boxShadow: "none",
        };

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={onClick}
      className={`app-button ${className}`.trim()}
      style={{ ...S.btn, ...palette, opacity: disabled ? 0.55 : 1, ...(style || {}) }}
    >
      {children}
    </button>
  );
};

const TabsCtx = createContext(null);

const Tabs = ({ defaultValue, value: controlledValue, onValueChange, children }) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (nextValue) => {
    if (controlledValue === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };
  return <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>;
};

const TabsList = ({ children }) => <div className="tabs-list">{children}</div>;

const TabsTrigger = ({ value, children }) => {
  const c = useContext(TabsCtx);
  const active = c?.value === value;
  return (
    <button onClick={() => c?.setValue(value)} className={`tab-trigger ${active ? "is-active" : ""}`}>
      {children}
    </button>
  );
};

const TabsContent = ({ value, children }) => {
  const c = useContext(TabsCtx);
  return c?.value === value ? <div className="tab-panel">{children}</div> : null;
};

const Progress = ({ value }) => (
  <div className="progress-shell">
    <div className="progress-bar" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
  </div>
);

const emptyQ = (i = 1) => ({
  id: uid(),
  questionNo: i,
  questionText: "",
  imageUrl: "",
  choices: { A: "", B: "", C: "", D: "" },
  correctAnswer: "A",
  score: 2,
});

const starterQs = () => [
  {
    ...emptyQ(1),
    questionText: "??????????????????????????????????????????????????",
    choices: {
      A: "??????? WI ????????????",
      B: "??????? ? ??????????????????",
      C: "????????????? ? ??????????",
      D: "???????????????????????",
    },
  },
  {
    ...emptyQ(2),
    questionText: "??????? NG ?????????????? ?????????????????????????",
    correctAnswer: "B",
    choices: {
      A: "????????????????????????",
      B: "?????? ???? Leader ????????????????",
      C: "???????????????????",
      D: "????? QA ????????",
    },
  },
];

const emptyPart = (i = 1, starter = false) => ({
  id: uid(),
  partCode: `Part${String(i).padStart(2, "0")}`,
  partName: `Part ${i}`,
  subtitle: "????????????????????????",
  passScore: 35,
  randomizeQuestions: false,
  showResultImmediately: true,
  questions: starter ? starterQs() : [emptyQ(1)],
});

const emptyModel = (i = 1, starter = false) => ({
  id: uid(),
  modelCode: `RG${String(i).padStart(2, "0")}`,
  modelName: `Model ${i}`,
  parts: Array.from({ length: 10 }, (_, idx) => emptyPart(idx + 1, starter && idx === 0)),
});

const emptyStarterBank = () => ({ title: "Factory Online Exam", models: [emptyModel(1, true)] });
const reorder = (qs) => qs.map((q, i) => ({ ...q, questionNo: i + 1 }));
const full = (qs) => qs.reduce((s, q) => s + Number(q.score || 0), 0);
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const hasQuestionContent = (q) => {
  const text = String(q?.questionText || "").trim();
  const imageUrl = String(q?.imageUrl || "").trim();
  const choices = Object.values(q?.choices || {}).map((v) => String(v || "").trim());
  return Boolean(text || imageUrl || choices.some(Boolean));
};

const sanitizeBank = (rawBank) => {
  const normalizedBank = rawBank && Array.isArray(rawBank.models) ? rawBank : emptyStarterBank();
  const models = normalizedBank.models
    .map((model, modelIndex) => {
      const parts = (model.parts || [])
        .map((part, partIndex) => {
          const questions = reorder(
            (part.questions || [])
              .filter(hasQuestionContent)
              .map((q, qIndex) => ({
                ...emptyQ(qIndex + 1),
                ...q,
                id: q.id || uid(),
                choices: {
                  A: q.choices?.A || "",
                  B: q.choices?.B || "",
                  C: q.choices?.C || "",
                  D: q.choices?.D || "",
                },
              })),
          );

          if (!questions.length) return null;

          return {
            ...emptyPart(partIndex + 1),
            ...part,
            id: part.id || uid(),
            partCode: part.partCode || `Part${String(partIndex + 1).padStart(2, "0")}`,
            partName: part.partName || `Part ${partIndex + 1}`,
            subtitle: part.subtitle || "????????????????????????",
            passScore: Number(part.passScore ?? 35),
            randomizeQuestions: Boolean(part.randomizeQuestions),
            showResultImmediately: part.showResultImmediately !== false,
            questions,
          };
        })
        .filter(Boolean);

      if (!parts.length) return null;

      return {
        id: model.id || uid(),
        modelCode: model.modelCode || `RG${String(modelIndex + 1).padStart(2, "0")}`,
        modelName: model.modelName || `Model ${modelIndex + 1}`,
        parts,
      };
    })
    .filter(Boolean);

  return {
    title: normalizedBank.title || "Factory Online Exam",
    models: models.length ? models : emptyStarterBank().models,
  };
};

const fallbackStarterBank = sanitizeBank(fallbackExamBankSeed);
const starterBank = () => JSON.parse(JSON.stringify(fallbackStarterBank));

const scoreLevels = [1, 2, 3];
const defaultEvaluationItems = [
  { item: "?????????? WI ?????????????", method: "??????", weight: 20 },
  { item: "???????????????????????", method: "???????", weight: 25 },
  { item: "?????????????????", method: "???????", weight: 20 },
  { item: "????????????????? NG", method: "????????", weight: 15 },
];

const createEvaluationRows = () => defaultEvaluationItems.map((row, index) => ({
  id: uid(),
  no: index + 1,
  item: row.item,
  method: row.method,
  weight: row.weight,
  score: 0,
}));

const createEvaluationDraft = () => ({
  sectionTitle: "??????? 1 : ????????????? ??? ???????????",
  modelId: "",
  partId: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  evaluator: "",
  rows: createEvaluationRows(),
});

const starterNews = () => ([
  {
    id: uid(),
    title: "?????????????????????????????????????",
    summary: "??????????????????, ????????, ??????????????????????????????????",
    content: "??????????????????????????????????????????????????????????????????????? ?????????????????????????????????????????????????????????????????????????",
    pinned: true,
    publishedAt: new Date().toISOString(),
  },
]);

const emptyNewsForm = () => ({
  title: "",
  summary: "",
  content: "",
  imageUrl: "",
  pinned: false,
  published: true,
});

const normalizeNews = (items) => {
  if (!Array.isArray(items)) return starterNews();
  if (!items.length) return [];
  return items.map((item) => ({
    id: item.id || uid(),
    title: String(item.title || "").trim(),
    summary: String(item.summary || "").trim(),
    content: String(item.content || "").trim(),
    imageUrl: String(item.imageUrl || "").trim(),
    pinned: Boolean(item.pinned),
    published: item.published !== false,
    publishedAt: item.publishedAt || new Date().toISOString(),
  })).filter((item) => item.title || item.content);
};

const downloadCsv = (filename, headers, rows) => {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function normalize(raw) {
  if (Array.isArray(raw?.models) && raw.models.length) {
    return sanitizeBank({
      title: raw.title || "Factory Online Exam",
      models: raw.models.map((m, mi) => ({
        id: m.id || uid(),
        modelCode: m.modelCode || `RG${String(mi + 1).padStart(2, "0")}`,
        modelName: m.modelName || `Model ${mi + 1}`,
        parts: (Array.isArray(m.parts) && m.parts.length ? m.parts : [emptyPart(1)]).map((p, pi) => ({
          id: p.id || uid(),
          partCode: p.partCode || `Part${String(pi + 1).padStart(2, "0")}`,
          partName: p.partName || `Part ${pi + 1}`,
          subtitle: p.subtitle || "????????????????????????",
          passScore: Number(p.passScore ?? 35),
          randomizeQuestions: Boolean(p.randomizeQuestions),
          showResultImmediately: p.showResultImmediately !== false,
          questions: reorder(
            (Array.isArray(p.questions) && p.questions.length ? p.questions : [emptyQ(1)]).map((q, qi) => ({
              ...emptyQ(qi + 1),
              ...q,
              id: q.id || uid(),
              choices: { A: q.choices?.A || "", B: q.choices?.B || "", C: q.choices?.C || "", D: q.choices?.D || "" },
            })),
          ),
        })),
      })),
    });
  }

  if (Array.isArray(raw?.questions)) {
    const b = starterBank();
    b.title = raw.title || b.title;
    b.models[0].modelCode = raw.modelCode || b.models[0].modelCode;
    b.models[0].parts = [{
      ...emptyPart(1),
      partCode: raw.partCode || "Part01",
      partName: raw.partName || "Part 1",
      subtitle: raw.subtitle || "????????????????????????",
      passScore: Number(raw.passScore ?? 35),
      randomizeQuestions: Boolean(raw.randomizeQuestions),
      showResultImmediately: raw.showResultImmediately !== false,
      questions: reorder(raw.questions.map((q, i) => ({
        ...emptyQ(i + 1),
        ...q,
        id: q.id || uid(),
        choices: { A: q.choices?.A || "", B: q.choices?.B || "", C: q.choices?.C || "", D: q.choices?.D || "" },
      }))),
    }];
    return sanitizeBank(b);
  }

  return starterBank();
}

const loadBank = () => {
  return starterBank();
};

const loadResults = () => {
  return [];
};


const loadSession = () => {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
};

const authHeaders = (session, extra = {}) => ({
  ...extra,
  ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
});

const normalizeSession = (payload) => {
  if (!payload) return null;
  const employee = payload.employee || payload;
  if (!payload.token || !employee) return null;
  return {
    token: payload.token,
    createdAt: payload.createdAt || "",
    expiresAt: payload.expiresAt || "",
    id: employee.id,
    username: employee.username,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName || employee.displayName || employee.username || "",
    displayName: employee.fullName || employee.displayName || employee.username || "",
    department: employee.department || "",
    position: employee.position || "",
    role: employee.role,
    isActive: employee.isActive !== false,
  };
};

export default function App() {
  const initialBank = useMemo(loadBank, []);
  const lastSyncedBankRef = useRef(JSON.stringify(initialBank));
  const [session, setSession] = useState(loadSession);
  const [loginForm, setLoginForm] = useState({ employeeCode: "" });
  const [loginError, setLoginError] = useState("");
  const [bank, setBank] = useState(initialBank);
  const [modelId, setModelId] = useState(initialBank.models[0]?.id || null);
  const [partId, setPartId] = useState(initialBank.models[0]?.parts[0]?.id || null);
  const [qId, setQId] = useState(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateCode, setCandidateCode] = useState("");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [importText, setImportText] = useState("");
  const [resultHistory, setResultHistory] = useState(loadResults);
  const [newsItems, setNewsItems] = useState([]);
  const [dataReady, setDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("loading");
  const [employees, setEmployees] = useState([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeError, setEmployeeError] = useState("");
  const [employeeStatus, setEmployeeStatus] = useState("idle");
  const [dashboardModelFilter, setDashboardModelFilter] = useState("ALL");
  const [dashboardPartFilter, setDashboardPartFilter] = useState("ALL");
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState("ALL");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [employeeResultsSearch, setEmployeeResultsSearch] = useState("");
  const [employeeResultsStatusFilter, setEmployeeResultsStatusFilter] = useState("ALL");
  const [selectedEmployeeResultCode, setSelectedEmployeeResultCode] = useState("");
  const [activeTab, setActiveTab] = useState("preview");
  const [entryPoint, setEntryPoint] = useState("portal");
  const [newsForm, setNewsForm] = useState(emptyNewsForm);
  const [editingNewsId, setEditingNewsId] = useState(null);
  const [newsError, setNewsError] = useState("");
  const [newsSearch, setNewsSearch] = useState("");
  const [newsVisibilityFilter, setNewsVisibilityFilter] = useState("ALL");
  const [evaluationForm, setEvaluationForm] = useState(() => {
    try {
      const saved = localStorage.getItem(EVALUATION_DRAFT_KEY);
      if (!saved) return createEvaluationDraft();
      const parsed = JSON.parse(saved);
      const defaultRows = createEvaluationRows();
      return {
        ...createEvaluationDraft(),
        ...parsed,
        rows: Array.isArray(parsed?.rows) && parsed.rows.length
          ? defaultRows.map((defaultRow, index) => {
              const row = parsed.rows[index];
              return row
                ? {
                    id: row.id || uid(),
                    no: index + 1,
                    item: row.item || "",
                    method: row.method || "",
                    weight: Number(row.weight || 0),
                    score: Number(row.score || 0),
                  }
                : defaultRow;
            })
          : defaultRows,
      };
    } catch {
      return createEvaluationDraft();
    }
  });
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [evaluationStatus, setEvaluationStatus] = useState("idle");
  const [evaluationError, setEvaluationError] = useState("");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [evaluationPartFilter, setEvaluationPartFilter] = useState("ALL");
  const [evaluationEvaluatorFilter, setEvaluationEvaluatorFilter] = useState("ALL");

  const isAdmin = session?.role === "ADMIN";

  useEffect(() => {
    if (!session) return;
    setActiveTab(isAdmin ? "builder" : "preview");
  }, [session?.token, isAdmin]);

  useEffect(() => {
    try {
      localStorage.setItem(EVALUATION_DRAFT_KEY, JSON.stringify(evaluationForm));
    } catch {
      // Ignore storage restrictions in locked-down browsers.
    }
  }, [evaluationForm]);

  useEffect(() => {
    if (!session) {
      setCandidateName("");
      setCandidateCode("");
      return;
    }

    if (session.role === "ADMIN") return;

    setCandidateName(session.displayName || session.username || "");
    setCandidateCode(session.employeeCode || "");
  }, [session]);

  const applySharedData = (nextBank, nextResults, nextNews, preserveSelection = false) => {
    setBank(nextBank);
    setResultHistory(nextResults);
    setNewsItems(nextNews);

    if (!preserveSelection) {
      setModelId(nextBank.models[0]?.id || null);
      setPartId(nextBank.models[0]?.parts[0]?.id || null);
      setQId(nextBank.models[0]?.parts[0]?.questions[0]?.id || null);
      return;
    }

    const selectedModel = nextBank.models.find((entry) => entry.id === modelId) || nextBank.models[0];
    const selectedPart = selectedModel?.parts.find((entry) => entry.id === partId) || selectedModel?.parts[0];
    const selectedQuestion = selectedPart?.questions.find((entry) => entry.id === qId) || selectedPart?.questions[0] || null;
    setModelId(selectedModel?.id || null);
    setPartId(selectedPart?.id || null);
    setQId(selectedQuestion?.id || null);
  };

  const fetchSharedData = async (activeSession, preserveSelection = false) => {
    const stateRes = await fetch(`${API_BASE}/state`, {
      headers: authHeaders(activeSession),
    });
    if (!stateRes.ok) throw new Error(`HTTP ${stateRes.status}`);
    const data = await stateRes.json();

    const newsRes = await fetch(activeSession.role === "ADMIN" ? `${API_BASE}/news?includeHidden=1` : `${API_BASE}/news`, {
      headers: authHeaders(activeSession),
    });
    if (!newsRes.ok) throw new Error(`HTTP ${newsRes.status}`);
    const newsData = await newsRes.json();

    const nextBank = normalize(data.bank ?? starterBank());
    const nextResults = Array.isArray(data.results) ? data.results : [];
    const nextNews = normalizeNews(newsData);
    applySharedData(nextBank, nextResults, nextNews, preserveSelection);
  };

  useEffect(() => {
    let ignore = false;

    const hydrateSession = async () => {
      if (!session?.token) {
        setDataReady(false);
        setSyncStatus("idle");
        return;
      }

      try {
        const authRes = await fetch(`${API_BASE}/session`, {
          headers: authHeaders(session),
        });
        if (!authRes.ok) throw new Error(`HTTP ${authRes.status}`);
        const nextSession = normalizeSession(await authRes.json());
        if (!nextSession) throw new Error("Invalid session payload");
        if (ignore) return;
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        } catch {
          // Ignore storage restrictions in locked-down browsers.
        }
        setSession(nextSession);
      } catch (error) {
        console.error(error);
        if (ignore) return;
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {
          // Ignore storage restrictions in locked-down browsers.
        }
        setSession(null);
        setSyncStatus("offline");
        setDataReady(true);
        return;
      }

      try {
        setSyncStatus("loading");
        await fetchSharedData(nextSession);
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(RESULTS_KEY);
        } catch {
          // Ignore storage restrictions in locked-down browsers.
        }
        if (ignore) return;
        setSyncStatus("synced");
      } catch (error) {
        console.error(error);
        if (!ignore) setSyncStatus("offline");
      } finally {
        if (!ignore) setDataReady(true);
      }
    };

    hydrateSession();
    return () => { ignore = true; };
  }, [session?.token]);

  useEffect(() => {
    if (!dataReady || !session?.token || !isAdmin) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus("saving");
        const res = await fetch(`${API_BASE}/state`, {
          method: "PUT",
          headers: authHeaders(session, { "Content-Type": "application/json" }),
          body: JSON.stringify({ bank, results: resultHistory }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lastSyncedBankRef.current = JSON.stringify(bank);
        setBuilderServerUpdate(false);
        setPendingBuilderBank(null);
        setSyncStatus("synced");
      } catch (error) {
        console.error(error);
        setSyncStatus("offline");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [bank, resultHistory, dataReady, isAdmin, session]);

  useEffect(() => {
    if (!dataReady || !session?.token || isAdmin || !["portal", "news"].includes(entryPoint)) return;

    let ignore = false;

    const refreshSharedData = async () => {
      try {
        if (ignore) return;
        await fetchSharedData(session, true);
        if (ignore) return;
        setSyncStatus("synced");
      } catch (error) {
        console.error(error);
        if (!ignore) setSyncStatus("offline");
      }
    };

    refreshSharedData();
    const timer = setInterval(refreshSharedData, 15000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [dataReady, session, isAdmin, entryPoint, modelId, partId, qId]);

  const model = useMemo(() => bank.models.find((m) => m.id === modelId) || bank.models[0], [bank.models, modelId]);
  const part = useMemo(() => model?.parts.find((p) => p.id === partId) || model?.parts[0], [model, partId]);
  const question = useMemo(() => part?.questions.find((q) => q.id === qId) || part?.questions[0] || null, [part, qId]);

  useEffect(() => {
    if (model && model.id !== modelId) {
      setModelId(model.id);
      setPartId(model.parts[0]?.id || null);
    }
  }, [model, modelId]);

  useEffect(() => { if (part && part.id !== partId) setPartId(part.id); }, [part, partId]);
  useEffect(() => { if (question && question.id !== qId) setQId(question.id); }, [question, qId]);
  useEffect(() => { setAnswers({}); setSubmitted(false); setSubmitError(""); }, [modelId, partId]);

  const scoreFull = full(part?.questions || []);
  const answered = Object.keys(answers).length;
  const progress = part?.questions.length ? Math.round((answered / part.questions.length) * 100) : 0;

  const previewQs = useMemo(() => {
    const src = [...(part?.questions || [])];
    if (!part?.randomizeQuestions) return src;
    return src.map((q) => ({ q, s: Math.random() })).sort((a, b) => a.s - b.s).map((x, i) => ({ ...x.q, questionNo: i + 1 }));
  }, [part]);

  const result = useMemo(() => {
    if (!part) return { score: 0, correct: 0, status: "FAIL" };
    const score = part.questions.reduce((sum, q) => sum + (answers[q.id] === q.correctAnswer ? Number(q.score || 0) : 0), 0);
    const correct = part.questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    return { score, correct, status: score >= Number(part.passScore || 0) ? "PASS" : "FAIL" };
  }, [answers, part]);

  const passedAttemptForCurrentPart = useMemo(() => {
    if (isAdmin || !session?.employeeCode || !part?.id) return null;
    return resultHistory.find((entry) => entry.candidateCode === session.employeeCode && entry.partId === part.id && entry.status === "PASS") || null;
  }, [isAdmin, session?.employeeCode, part?.id, resultHistory]);

  const isExamLocked = Boolean(passedAttemptForCurrentPart);

  const nextPart = useMemo(() => {
    if (!model?.parts?.length || !part?.id) return null;
    const currentIndex = model.parts.findIndex((entry) => entry.id === part.id);
    if (currentIndex === -1 || currentIndex >= model.parts.length - 1) return null;
    return model.parts[currentIndex + 1];
  }, [model, part]);

  const dashboardModelOptions = useMemo(() => {
    const map = new Map();
    resultHistory.forEach((r) => { if (!map.has(r.modelCode)) map.set(r.modelCode, r.modelName); });
    return Array.from(map.entries()).map(([modelCode, modelName]) => ({ modelCode, modelName }));
  }, [resultHistory]);

  const dashboardPartOptions = useMemo(() => {
    const map = new Map();
    resultHistory.forEach((r) => {
      if (dashboardModelFilter !== "ALL" && r.modelCode !== dashboardModelFilter) return;
      const key = `${r.modelCode}__${r.partCode}`;
      if (!map.has(key)) map.set(key, { key, modelCode: r.modelCode, partCode: r.partCode, partName: r.partName });
    });
    return Array.from(map.values());
  }, [resultHistory, dashboardModelFilter]);

  const filteredHistory = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    return resultHistory.filter((r) => {
      if (dashboardModelFilter !== "ALL" && r.modelCode !== dashboardModelFilter) return false;
      if (dashboardPartFilter !== "ALL") {
        const [m, p] = dashboardPartFilter.split("__");
        if (r.modelCode !== m || r.partCode !== p) return false;
      }
      if (dashboardStatusFilter !== "ALL" && r.status !== dashboardStatusFilter) return false;
      if (!q) return true;
      const hay = `${r.candidateName} ${r.candidateCode} ${r.modelCode} ${r.modelName} ${r.partCode} ${r.partName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [resultHistory, dashboardModelFilter, dashboardPartFilter, dashboardStatusFilter, dashboardSearch]);

  const dashboardSummary = useMemo(() => {
    const attempts = filteredHistory.length;
    const passed = filteredHistory.filter((r) => r.status === "PASS").length;
    const avgPct = attempts ? Math.round(filteredHistory.reduce((sum, r) => sum + (r.fullScore ? (r.score / r.fullScore) * 100 : 0), 0) / attempts) : 0;
    return { attempts, passed, passRate: attempts ? Math.round((passed / attempts) * 100) : 0, avgPct };
  }, [filteredHistory]);

  const evaluationTotal = useMemo(
    () => evaluationForm.rows.reduce((sum, row) => sum + (Number(row.score || 0) * Number(row.weight || 0)), 0),
    [evaluationForm.rows],
  );
  const evaluationMax = useMemo(
    () => evaluationForm.rows.reduce((sum, row) => sum + (scoreLevels[scoreLevels.length - 1] * Number(row.weight || 0)), 0),
    [evaluationForm.rows],
  );
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive),
    [employees],
  );
  const evaluationModel = useMemo(
    () => bank.models.find((entry) => entry.id === evaluationForm.modelId) || null,
    [bank.models, evaluationForm.modelId],
  );
  const evaluationPartOptions = useMemo(
    () => evaluationModel?.parts || [],
    [evaluationModel],
  );
  const evaluationPart = useMemo(
    () => evaluationPartOptions.find((entry) => entry.id === evaluationForm.partId) || null,
    [evaluationPartOptions, evaluationForm.partId],
  );
  const latestEvaluationExamResult = useMemo(() => {
    if (!evaluationForm.employeeCode || !evaluationForm.partId) return null;
    return resultHistory.find((entry) => entry.candidateCode === evaluationForm.employeeCode && entry.partId === evaluationForm.partId) || null;
  }, [resultHistory, evaluationForm.employeeCode, evaluationForm.partId]);
  const evaluationPartFilterOptions = useMemo(() => {
    const seen = new Map();
    evaluationHistory.forEach((entry) => {
      const key = `${entry.modelCode}__${entry.partCode}__${entry.partName}`;
      if (!seen.has(key)) seen.set(key, { key, label: `${entry.modelCode}/${entry.partCode} - ${entry.partName}` });
    });
    return Array.from(seen.values());
  }, [evaluationHistory]);
  const evaluationEvaluatorOptions = useMemo(() => {
    const seen = new Set();
    evaluationHistory.forEach((entry) => {
      if (entry.evaluator) seen.add(entry.evaluator);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "th"));
  }, [evaluationHistory]);
  const filteredEvaluationHistory = useMemo(() => {
    const q = evaluationSearch.trim().toLowerCase();
    return evaluationHistory.filter((entry) => {
      if (evaluationPartFilter !== "ALL") {
        const partKey = `${entry.modelCode}__${entry.partCode}__${entry.partName}`;
        if (partKey !== evaluationPartFilter) return false;
      }
      if (evaluationEvaluatorFilter !== "ALL" && (entry.evaluator || "") !== evaluationEvaluatorFilter) return false;
      if (!q) return true;
      return [
        entry.employeeName,
        entry.employeeCode,
        entry.modelCode,
        entry.partCode,
        entry.partName,
        entry.evaluator,
      ].some((value) => String(value || "").toLowerCase().includes(q));
    });
  }, [evaluationHistory, evaluationSearch, evaluationPartFilter, evaluationEvaluatorFilter]);

  const byModelPart = useMemo(() => {
    const map = new Map();
    filteredHistory.forEach((r) => {
      const key = `${r.modelId}_${r.partId}`;
      const prev = map.get(key) || { modelCode: r.modelCode, modelName: r.modelName, partCode: r.partCode, partName: r.partName, attempts: 0, passed: 0, scorePctSum: 0 };
      prev.attempts += 1;
      prev.passed += r.status === "PASS" ? 1 : 0;
      prev.scorePctSum += r.fullScore ? (r.score / r.fullScore) * 100 : 0;
      map.set(key, prev);
    });
    return Array.from(map.values()).map((row) => ({ ...row, passRate: row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0, avgPct: row.attempts ? Math.round(row.scorePctSum / row.attempts) : 0 })).sort((a, b) => b.attempts - a.attempts);
  }, [filteredHistory]);
  const orderedNews = useMemo(
    () => [...newsItems].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }),
    [newsItems],
  );

  const visibleNews = useMemo(() => {
    const q = newsSearch.trim().toLowerCase();
    return orderedNews.filter((item) => {
      if (isAdmin) {
        if (newsVisibilityFilter === "PUBLISHED" && !item.published) return false;
        if (newsVisibilityFilter === "HIDDEN" && item.published) return false;
      }
      if (!q) return true;
      const hay = [item.title, item.summary, item.content].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [orderedNews, newsSearch, newsVisibilityFilter, isAdmin]);

  const employeeResultSummaries = useMemo(() => {
    const q = employeeResultsSearch.trim().toLowerCase();
    const map = new Map();
    resultHistory.forEach((entry) => {
      const key = entry.candidateCode || entry.employeeCode || entry.id;
      const prev = map.get(key) || {
        candidateCode: entry.candidateCode || "-",
        candidateName: entry.candidateName || "-",
        attempts: 0,
        passed: 0,
        scorePctSum: 0,
        latestSubmittedAt: entry.submittedAt,
        latestStatus: entry.status,
        latestModelPart: [entry.modelCode, entry.partCode].filter(Boolean).join("/"),
      };
      prev.attempts += 1;
      prev.passed += entry.status === "PASS" ? 1 : 0;
      prev.scorePctSum += entry.fullScore ? (entry.score / entry.fullScore) * 100 : 0;
      if (new Date(entry.submittedAt).getTime() > new Date(prev.latestSubmittedAt).getTime()) {
        prev.latestSubmittedAt = entry.submittedAt;
        prev.latestStatus = entry.status;
        prev.latestModelPart = [entry.modelCode, entry.partCode].filter(Boolean).join("/");
        prev.candidateName = entry.candidateName || prev.candidateName;
      }
      map.set(key, prev);
    });
    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        avgPct: entry.attempts ? Math.round(entry.scorePctSum / entry.attempts) : 0,
        passRate: entry.attempts ? Math.round((entry.passed / entry.attempts) * 100) : 0,
      }))
      .filter((entry) => {
        if (employeeResultsStatusFilter !== "ALL" && entry.latestStatus !== employeeResultsStatusFilter) return false;
        if (!q) return true;
        return [entry.candidateCode, entry.candidateName].join(" ").toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.latestSubmittedAt).getTime() - new Date(a.latestSubmittedAt).getTime());
  }, [resultHistory, employeeResultsSearch, employeeResultsStatusFilter]);

  const selectedEmployeeResults = useMemo(
    () => resultHistory
      .filter((entry) => entry.candidateCode === selectedEmployeeResultCode)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [resultHistory, selectedEmployeeResultCode],
  );

  const selectedEmployeePartComparison = useMemo(() => {
    if (!selectedEmployeeResultCode) return [];

    const examByPart = new Map();
    selectedEmployeeResults.forEach((entry) => {
      const key = entry.partId || [entry.modelCode, entry.partCode].join("__");
      if (!examByPart.has(key)) examByPart.set(key, entry);
    });

    const evaluationByPart = new Map();
    evaluationHistory
      .filter((entry) => entry.employeeCode === selectedEmployeeResultCode)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((entry) => {
        const key = entry.partId || [entry.modelCode, entry.partCode].join("__");
        if (!evaluationByPart.has(key)) evaluationByPart.set(key, entry);
      });

    const keys = new Set([...examByPart.keys(), ...evaluationByPart.keys()]);
    return Array.from(keys).map((key) => {
      const exam = examByPart.get(key) || null;
      const evaluation = evaluationByPart.get(key) || null;
      return {
        key,
        modelCode: exam?.modelCode || evaluation?.modelCode || "-",
        partCode: exam?.partCode || evaluation?.partCode || "-",
        partName: exam?.partName || evaluation?.partName || "-",
        examScore: exam?.score ?? null,
        examFullScore: exam?.fullScore ?? null,
        examStatus: exam?.status || "-",
        evaluationScore: evaluation?.totalScore ?? null,
        evaluationMaxScore: evaluation?.maxScore ?? null,
        evaluator: evaluation?.evaluator || "-",
        comparedAt: evaluation?.createdAt || exam?.submittedAt || "",
      };
    }).sort((a, b) => a.partCode.localeCompare(b.partCode));
  }, [selectedEmployeeResultCode, selectedEmployeeResults, evaluationHistory]);

  useEffect(() => {
    if (!employeeResultSummaries.length) {
      setSelectedEmployeeResultCode("");
      return;
    }

    if (!employeeResultSummaries.some((entry) => entry.candidateCode === selectedEmployeeResultCode)) {
      setSelectedEmployeeResultCode(employeeResultSummaries[0].candidateCode);
    }
  }, [employeeResultSummaries, selectedEmployeeResultCode]);

  useEffect(() => {
    let ignore = false;

    const fetchEmployees = async () => {
      if (!session?.token || !isAdmin) {
        setEmployees([]);
        return;
      }

      try {
        setEmployeeStatus("loading");
        const res = await fetch(`${API_BASE}/employees`, {
          headers: authHeaders(session),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        setEmployees(Array.isArray(data) ? data : []);
        setEmployeeStatus("ready");
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setEmployeeStatus("error");
          setEmployeeError("???????????????????????????");
        }
      }
    };

    fetchEmployees();
    return () => { ignore = true; };
  }, [isAdmin, session]);

  useEffect(() => {
    let ignore = false;

    const fetchEvaluations = async () => {
      if (!session?.token || !isAdmin) {
        setEvaluationHistory([]);
        return;
      }

      try {
        setEvaluationStatus("loading");
        const res = await fetch(`${API_BASE}/evaluations`, {
          headers: authHeaders(session),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        setEvaluationHistory(Array.isArray(data) ? data : []);
        setEvaluationStatus("ready");
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setEvaluationStatus("error");
          setEvaluationError("?????????????????????????????");
        }
      }
    };

    fetchEvaluations();
    return () => { ignore = true; };
  }, [isAdmin, session]);

  useEffect(() => {
    if (!dataReady || !session?.token || !isAdmin) return;

    const shouldRefreshSharedData = ["portal", "news", "scores"].includes(entryPoint) || ["employee-results", "dashboard", "evaluation", "preview", "importexport"].includes(activeTab);
    const shouldRefreshEmployees = entryPoint === "scores" || ["employees", "evaluation", "employee-results"].includes(activeTab);
    const shouldRefreshEvaluations = entryPoint === "scores" || ["evaluation", "employee-results"].includes(activeTab);
    if (!shouldRefreshSharedData && !shouldRefreshEmployees && !shouldRefreshEvaluations) return;

    let ignore = false;

    const refreshAdminViews = async () => {
      try {
        if (shouldRefreshSharedData) {
          await fetchSharedData(session, true);
        }

        if (shouldRefreshEmployees) {
          const employeesRes = await fetch(`${API_BASE}/employees`, {
            headers: authHeaders(session),
          });
          if (!employeesRes.ok) throw new Error(`HTTP ${employeesRes.status}`);
          const employeesData = await employeesRes.json();
          if (!ignore) setEmployees(Array.isArray(employeesData) ? employeesData : []);
        }

        if (shouldRefreshEvaluations) {
          const evaluationsRes = await fetch(`${API_BASE}/evaluations`, {
            headers: authHeaders(session),
          });
          if (!evaluationsRes.ok) throw new Error(`HTTP ${evaluationsRes.status}`);
          const evaluationsData = await evaluationsRes.json();
          if (!ignore) setEvaluationHistory(Array.isArray(evaluationsData) ? evaluationsData : []);
        }
      } catch (error) {
        console.error(error);
        if (!ignore) setSyncStatus("offline");
      }
    };

    refreshAdminViews();
    const timer = setInterval(refreshAdminViews, 15000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [dataReady, session, isAdmin, entryPoint, activeTab, modelId, partId, qId]);

  useEffect(() => {
    if (!dataReady || !session?.token || !isAdmin || entryPoint !== "exam" || activeTab !== "builder") return;

    let ignore = false;

    const checkBuilderServerState = async () => {
      try {
        const stateRes = await fetch(`${API_BASE}/state`, {
          headers: authHeaders(session),
        });
        if (!stateRes.ok) throw new Error(`HTTP ${stateRes.status}`);
        const data = await stateRes.json();
        if (ignore) return;
        const remoteBank = normalize(data.bank ?? starterBank());
        const remoteBankJson = JSON.stringify(remoteBank);
        const hasRemoteUpdate = remoteBankJson !== lastSyncedBankRef.current;
        setBuilderServerUpdate(hasRemoteUpdate);
        setPendingBuilderBank(hasRemoteUpdate ? remoteBank : null);
      } catch (error) {
        console.error(error);
        if (!ignore) setSyncStatus("offline");
      }
    };

    checkBuilderServerState();
    const timer = setInterval(checkBuilderServerState, 15000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [dataReady, session, isAdmin, entryPoint, activeTab]);

  const resetEmployeeForm = () => {
    setEmployeeForm(emptyEmployeeForm);
    setEditingEmployeeId(null);
    setEmployeeError("");
  };

  const startEditEmployee = (employee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      employeeCode: employee.employeeCode || "",
      fullName: employee.fullName || "",
      department: employee.department || "",
      position: employee.position || "",
      role: employee.role || "USER",
      isActive: employee.isActive !== false,
    });
    setEmployeeError("");
  };

  const saveEmployee = async () => {
    const payload = {
      employeeCode: employeeForm.employeeCode.trim(),
      fullName: employeeForm.fullName.trim(),
      department: employeeForm.department.trim(),
      position: employeeForm.position.trim(),
      role: employeeForm.role,
      isActive: Boolean(employeeForm.isActive),
    };

    if (!payload.employeeCode || !payload.fullName) {
      setEmployeeError("????????????????????????????");
      return;
    }

    try {
      setEmployeeStatus("saving");
      setEmployeeError("");
      const res = await fetch(`${API_BASE}/employees${editingEmployeeId ? `/${editingEmployeeId}` : ""}`, {
        method: editingEmployeeId ? "PUT" : "POST",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (editingEmployeeId) {
        setEmployees((prev) => prev.map((item) => (item.id === editingEmployeeId ? data : item)));
      } else {
        setEmployees((prev) => [data, ...prev]);
      }
      resetEmployeeForm();
      setEmployeeStatus("ready");
    } catch (error) {
      console.error(error);
      setEmployeeStatus("error");
      setEmployeeError(error.message || "????????????????????????????");
    }
  };

  const removeEmployee = async (employee) => {
    if (!window.confirm(`???????????????? ${employee.fullName} ??????????`)) return;

    try {
      setEmployeeStatus("saving");
      const res = await fetch(`${API_BASE}/employees/${employee.id}`, {
        method: "DELETE",
        headers: authHeaders(session),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEmployees((prev) => prev.filter((item) => item.id !== employee.id));
      if (editingEmployeeId === employee.id) resetEmployeeForm();
      setEmployeeStatus("ready");
    } catch (error) {
      console.error(error);
      setEmployeeStatus("error");
      setEmployeeError(error.message || "????????????????????????");
    }
  };

  const resetNewsForm = () => {
    setNewsForm(emptyNewsForm());
    setEditingNewsId(null);
    setNewsError("");
  };

  const startEditNews = (item) => {
    setEditingNewsId(item.id);
    setNewsForm({
      title: item.title || "",
      summary: item.summary || "",
      content: item.content || "",
      imageUrl: item.imageUrl || "",
      pinned: Boolean(item.pinned),
      published: item.published !== false,
    });
    setNewsError("");
  };

  const saveNews = async () => {
    const payload = {
      title: newsForm.title.trim(),
      summary: newsForm.summary.trim(),
      content: newsForm.content.trim(),
      imageUrl: newsForm.imageUrl.trim(),
      pinned: Boolean(newsForm.pinned),
      published: newsForm.published !== false,
    };
    if (!payload.title || !payload.content) {
      setNewsError("Please enter both a news title and news details");
      return;
    }

    try {
      setNewsError("");
      const endpoint = editingNewsId ? `${API_BASE}/news/${editingNewsId}` : `${API_BASE}/news`;
      const res = await fetch(endpoint, {
        method: editingNewsId ? "PUT" : "POST",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setNewsItems((prev) => (
        editingNewsId
          ? prev.map((item) => (item.id === editingNewsId ? data : item))
          : [data, ...prev]
      ));
      resetNewsForm();
    } catch (error) {
      console.error(error);
      setNewsError(error.message || "Saving news failed");
    }
  };

  const removeNews = async (item) => {
    if (!window.confirm(`Delete news "${item.title}"?`)) return;

    try {
      setNewsError("");
      const res = await fetch(`${API_BASE}/news/${item.id}`, {
        method: "DELETE",
        headers: authHeaders(session),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNewsItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (editingNewsId === item.id) resetNewsForm();
    } catch (error) {
      console.error(error);
      setNewsError(error.message || "Deleting news failed");
    }
  };

  const uploadNewsImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setNewsForm((prev) => ({ ...prev, imageUrl: String(e.target?.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const patchModel = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id === modelId ? { ...m, [f]: v } : m)) }));
  const patchPart = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id === partId ? { ...p, [f]: v } : p)) })) }));
  const patchQ = (id, patch) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id !== partId ? p : { ...p, questions: p.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })) })) }));
  const patchChoice = (id, key, value) => patchQ(id, { choices: { ...question.choices, [key]: value } });

  const addModel = () => {
    const n = emptyModel(bank.models.length + 1, false);
    setBank((b) => ({ ...b, models: [...b.models, n] }));
    setModelId(n.id);
    setPartId(n.parts[0].id);
    setQId(n.parts[0].questions[0].id);
  };

  const removeModel = () => {
    if (bank.models.length <= 1) return alert("??????????????? 1 Model");
    const remaining = bank.models.filter((m) => m.id !== model.id);
    setBank((b) => ({ ...b, models: remaining }));
    setModelId(remaining[0].id);
    setPartId(remaining[0].parts[0].id);
  };

  const addPart = () => {
    if (model.parts.length >= 20) return alert("1 Model ?????????????? 20 Part");
    const n = emptyPart(model.parts.length + 1, false);
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id === modelId ? { ...m, parts: [...m.parts, n] } : m)) }));
    setPartId(n.id);
    setQId(n.questions[0].id);
  };

  const removePart = () => {
    if (model.parts.length <= 1) return alert("??????????????? 1 Part ??? Model");
    const remaining = model.parts.filter((p) => p.id !== part.id);
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id === modelId ? { ...m, parts: remaining } : m)) }));
    setPartId(remaining[0].id);
    setQId(remaining[0].questions[0].id);
  };
  const addQ = () => {
    const n = emptyQ(part.questions.length + 1);
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id === partId ? { ...p, questions: [...p.questions, n] } : p)) })) }));
    setQId(n.id);
  };

  const dupQ = () => {
    const n = { ...question, id: uid(), questionNo: part.questions.length + 1 };
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id === partId ? { ...p, questions: reorder([...p.questions, n]) } : p)) })) }));
    setQId(n.id);
  };

  const delQ = () => {
    const remaining = reorder(part.questions.filter((q) => q.id !== question.id));
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id === partId ? { ...p, questions: remaining } : p)) })) }));
    setQId(remaining[0]?.id || null);
  };

  const moveQ = (d) => {
    const i = part.questions.findIndex((q) => q.id === question.id);
    const ni = i + d;
    if (ni < 0 || ni >= part.questions.length) return;
    const arr = [...part.questions];
    [arr[i], arr[ni]] = [arr[ni], arr[i]];
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => (p.id === partId ? { ...p, questions: reorder(arr) } : p)) })) }));
  };

  const uploadImg = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => patchQ(question.id, { imageUrl: String(e.target?.result || "") });
    r.readAsDataURL(file);
  };

  const login = async (e) => {
    e.preventDefault();
    const employeeCode = loginForm.employeeCode.trim();

    if (!employeeCode) return setLoginError("????????????????????");

    try {
      setLoginError("");
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "????????????????????");

      const nextSession = normalizeSession(data);
      if (!nextSession) throw new Error("????????????????????");

      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      } catch {
        // Ignore storage restrictions in locked-down browsers.
      }
      setSession(nextSession);
      setLoginForm({ employeeCode: "" });
      setDataReady(false);
      setSyncStatus("loading");
    } catch (error) {
      console.error(error);
      setLoginError(error.message || "????????????????????");
    }
  };

  const logout = async () => {
    try {
      if (session?.token) {
        await fetch(`${API_BASE}/logout`, {
          method: "POST",
          headers: authHeaders(session),
        });
      }
    } catch (error) {
      console.error(error);
    }
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage restrictions in locked-down browsers.
    }
    setSession(null);
    setEntryPoint("portal");
    setLoginError("");
    setLoginForm({ employeeCode: "" });
    setDataReady(false);
    setEmployees([]);
    resetEmployeeForm();
  };

  const submit = async () => {
    if (submitted) return;
    if (answered < part.questions.length) return setSubmitError(`????????????????????? (${answered}/${part.questions.length})`);
    setSubmitError("");
    setSubmitted(true);
    const entry = { id: uid(), submittedAt: new Date().toISOString(), candidateName: candidateName || "-", candidateCode: candidateCode || "-", modelId: model.id, modelCode: model.modelCode, modelName: model.modelName, partId: part.id, partCode: part.partCode, partName: part.partName, score: result.score, fullScore: scoreFull, passScore: part.passScore, correct: result.correct, questionCount: part.questions.length, status: result.status };
    setResultHistory((prev) => [entry, ...prev].slice(0, 1000));

    try {
      const res = await fetch(`${API_BASE}/results`, {
        method: "POST",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify(entry),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      if (Array.isArray(data)) setResultHistory(data);
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
    }
  };

  const reset = () => { if (isExamLocked) return; setAnswers({}); setSubmitted(false); setSubmitError(""); };
  const goToNextPart = () => {
    if (!nextPart) return;
    setPartId(nextPart.id);
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
  };
  const exportJSON = () => { const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "factory_exam_bank.json"; a.click(); URL.revokeObjectURL(url); };
  const importJSON = () => { try { const n = normalize(JSON.parse(importText)); setBank(n); setModelId(n.models[0].id); setPartId(n.models[0].parts[0].id); setQId(n.models[0].parts[0].questions[0]?.id || null); setImportText(""); reset(); } catch (e) { alert(`Import ?????????: ${e.message}`); } };
  const importJSONFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const n = normalize(JSON.parse(text));
      setBank(n);
      setModelId(n.models[0].id);
      setPartId(n.models[0].parts[0].id);
      setQId(n.models[0].parts[0].questions[0]?.id || null);
      setImportText(JSON.stringify(n, null, 2));
      reset();
    } catch (e) {
      alert(`?????????????????: ${e.message}`);
    }
  };
  const reloadBuilderFromServer = () => {
    if (!pendingBuilderBank) return;
    setBank(pendingBuilderBank);
    setModelId(pendingBuilderBank.models[0]?.id || null);
    setPartId(pendingBuilderBank.models[0]?.parts[0]?.id || null);
    setQId(pendingBuilderBank.models[0]?.parts[0]?.questions[0]?.id || null);
    lastSyncedBankRef.current = JSON.stringify(pendingBuilderBank);
    setBuilderServerUpdate(false);
    setPendingBuilderBank(null);
    setSyncStatus("synced");
  };
  const saveLocal = async () => {
    try {
      setSyncStatus("saving");
      const res = await fetch(`${API_BASE}/state`, {
        method: "PUT",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify({ bank, results: resultHistory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("????????????????????????????????????????");
      setSyncStatus("synced");
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
      alert("?????????????????????????? ???????????????????????????????????");
    }
  };

  const exportCSV = () => {
    if (!submitted) return alert("????????????????????????????????????");
    const now = new Date().toISOString();
    const rows = previewQs.map((q, i) => {
      const selected = answers[q.id] || "-";
      const ok = selected === q.correctAnswer;
      const score = Number(q.score || 0);
      return [i + 1, q.questionText || "", selected, q.correctAnswer, ok ? "TRUE" : "FALSE", score, ok ? score : 0];
    });
    downloadCsv(`${model.modelCode}_${part.partCode}_${candidateCode || "candidate"}_${now.slice(0, 10)}.csv`, ["question_no", "question_text", "selected_answer", "correct_answer", "is_correct", "question_score", "earned_score"], rows);
  };

  const exportDashboardSummaryCsv = () => {
    const now = new Date().toISOString().slice(0, 10);
    const rows = byModelPart.map((row) => [row.modelCode, row.modelName, row.partCode, row.partName, row.attempts, row.passed, row.passRate, row.avgPct]);
    downloadCsv(`dashboard_summary_${now}.csv`, ["model_code", "model_name", "part_code", "part_name", "attempts", "passed", "pass_rate_pct", "avg_score_pct"], rows);
  };

  const exportDashboardHistoryCsv = () => {
    const now = new Date().toISOString().slice(0, 10);
    const rows = filteredHistory.map((r) => [new Date(r.submittedAt).toISOString(), r.candidateName, r.candidateCode, r.modelCode, r.modelName, r.partCode, r.partName, r.score, r.fullScore, r.passScore, r.correct, r.questionCount, r.status]);
    downloadCsv(`dashboard_history_${now}.csv`, ["submitted_at", "candidate_name", "candidate_code", "model_code", "model_name", "part_code", "part_name", "score", "full_score", "pass_score", "correct", "question_count", "status"], rows);
  };

  const exportSelectedEmployeeResultsCsv = () => {
    if (!selectedEmployeeResults.length) return;
    const now = new Date().toISOString().slice(0, 10);
    const rows = selectedEmployeeResults.map((entry) => [new Date(entry.submittedAt).toISOString(), entry.candidateName, entry.candidateCode, entry.modelCode, entry.modelName, entry.partCode, entry.partName, entry.score, entry.fullScore, entry.status]);
    downloadCsv(`employee_results_${selectedEmployeeResultCode || "employee"}_${now}.csv`, ["submitted_at", "candidate_name", "candidate_code", "model_code", "model_name", "part_code", "part_name", "score", "full_score", "status"], rows);
  };

  const patchEvaluationMeta = (field, value) => {
    setEvaluationForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectEvaluationEmployeeByCode = (employeeCode) => {
    const selectedEmployee = activeEmployees.find((employee) => employee.employeeCode === employeeCode);
    setEvaluationForm((prev) => ({
      ...prev,
      employeeId: selectedEmployee?.id || "",
      employeeCode: selectedEmployee?.employeeCode || "",
      employeeName: selectedEmployee?.fullName || "",
    }));
  };

  const selectEvaluationEmployeeByName = (fullName) => {
    const selectedEmployee = activeEmployees.find((employee) => employee.fullName === fullName);
    setEvaluationForm((prev) => ({
      ...prev,
      employeeId: selectedEmployee?.id || "",
      employeeCode: selectedEmployee?.employeeCode || "",
      employeeName: selectedEmployee?.fullName || "",
    }));
  };

  const selectEvaluationModel = (modelIdValue) => {
    const selectedModel = bank.models.find((entry) => entry.id === modelIdValue) || null;
    setEvaluationForm((prev) => ({
      ...prev,
      modelId: modelIdValue,
      partId: selectedModel?.parts?.[0]?.id || "",
    }));
  };

  const selectEvaluationPart = (partIdValue) => {
    setEvaluationForm((prev) => ({
      ...prev,
      partId: partIdValue,
    }));
  };

  const patchEvaluationRow = (id, patch) => {
    setEvaluationForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const resetEvaluation = () => {
    setEvaluationForm({
      ...createEvaluationDraft(),
      modelId: bank.models[0]?.id || "",
      partId: bank.models[0]?.parts?.[0]?.id || "",
      employeeCode: session?.role === "ADMIN" ? "" : (session?.employeeCode || ""),
      employeeName: session?.role === "ADMIN" ? "" : (session?.displayName || ""),
      employeeId: session?.role === "ADMIN" ? "" : (session?.id || ""),
      evaluator: session?.role === "ADMIN" ? (session?.displayName || "") : "",
    });
    setEvaluationError("");
  };

  const exportEvaluationCsv = () => {
    const now = new Date().toISOString().slice(0, 10);
    const rows = evaluationForm.rows.map((row) => [
      row.no,
      row.item,
      row.method,
      row.score,
      row.weight,
      Number(row.score || 0) * Number(row.weight || 0),
    ]);
    rows.push(["", "TOTAL", "", "", "", evaluationTotal]);
    downloadCsv(
      `evaluation_form_${evaluationForm.employeeCode || "employee"}_${now}.csv`,
      ["no", "item", "method", "score_a", "weight_b", "score_axb"],
      rows,
    );
  };

  useEffect(() => {
    if (!session || session.role === "ADMIN") return;
    setEvaluationForm((prev) => ({
      ...prev,
      employeeId: prev.employeeId || session.id || "",
      employeeCode: prev.employeeCode || session.employeeCode || "",
      employeeName: prev.employeeName || session.displayName || "",
    }));
  }, [session]);

  useEffect(() => {
    if (!bank.models.length) return;
    setEvaluationForm((prev) => {
      const nextModelId = prev.modelId || bank.models[0]?.id || "";
      const selectedModel = bank.models.find((entry) => entry.id === nextModelId) || bank.models[0];
      const nextPartId = selectedModel?.parts.find((entry) => entry.id === prev.partId)?.id || selectedModel?.parts?.[0]?.id || "";
      if (nextModelId === prev.modelId && nextPartId === prev.partId) return prev;
      return {
        ...prev,
        modelId: nextModelId,
        partId: nextPartId,
      };
    });
  }, [bank.models]);

  useEffect(() => {
    if (!activeEmployees.length || !evaluationForm.employeeCode || evaluationForm.employeeId) return;
    const selectedEmployee = activeEmployees.find((employee) => employee.employeeCode === evaluationForm.employeeCode);
    if (!selectedEmployee) return;
    setEvaluationForm((prev) => ({
      ...prev,
      employeeId: selectedEmployee.id,
      employeeName: prev.employeeName || selectedEmployee.fullName,
    }));
  }, [activeEmployees, evaluationForm.employeeCode, evaluationForm.employeeId]);

  const saveEvaluation = async () => {
    if (!evaluationForm.employeeId) return setEvaluationError("?????????????????");
    if (!evaluationModel || !evaluationPart) return setEvaluationError("?????????? Model / Part");

    try {
      setEvaluationStatus("saving");
      setEvaluationError("");
      const payload = {
        employeeId: evaluationForm.employeeId,
        sectionTitle: evaluationForm.sectionTitle,
        evaluator: evaluationForm.evaluator,
        modelId: evaluationModel.id,
        modelCode: evaluationModel.modelCode,
        modelName: evaluationModel.modelName,
        partId: evaluationPart.id,
        partCode: evaluationPart.partCode,
        partName: evaluationPart.partName,
        totalScore: evaluationTotal,
        maxScore: evaluationMax,
        rows: evaluationForm.rows,
      };
      const res = await fetch(`${API_BASE}/evaluations`, {
        method: "POST",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEvaluationHistory((prev) => {
        const next = [data, ...prev.filter((entry) => entry.id !== data.id)];
        return next.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      });
      setEvaluationStatus("ready");
    } catch (error) {
      console.error(error);
      setEvaluationStatus("error");
      setEvaluationError(error.message || "????????????????????????");
    }
  };

  if (!session) {
    return (
      <div className="app-shell login-shell">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="login-layout">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="login-showcase">
            <div className="hero-badges"><Badge>Secure Access</Badge><Badge outline>Admin / User</Badge></div>
            <h1>???????????????????????????????????</h1>
            <p>?????????????????????????????? ?????????????????????????????????????????????????????????????????</p>
            <div className="login-feature-list">
              <div className="login-feature-item"><ShieldCheck size={18} /><span>ADMIN ????????????, Dashboard ??? Import/Export ???</span></div>
              <div className="login-feature-item"><Eye size={18} /><span>USER ???????????????????????????????????</span></div>
            </div>
          </motion.section>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="login-card">
              <CardHeader><div className="section-heading"><LockKeyhole size={18} /><div><h3>Login</h3><p>???????????????????????????????</p></div></div></CardHeader>
              <CardContent className="login-card-content">
                <form className="login-form" onSubmit={login}>
                  <div><Label>???????????</Label><Input value={loginForm.employeeCode} onChange={(e) => setLoginForm({ employeeCode: e.target.value })} placeholder="???? 199032 ???? ADMIN1234" /></div>
                  {loginError ? <div className="alert-error">{loginError}</div> : null}
                  <Button type="submit"><LockKeyhole size={16} /> ???????????</Button>
                </form>
                
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (entryPoint === "portal") {
    return (
      <div className="app-shell">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="app-container">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
            <div className="hero-copy">
              <div className="hero-topbar">
                <div className="hero-badges"><Badge>Welcome</Badge><Badge outline>{isAdmin ? "ADMIN ACCESS" : "USER ACCESS"}</Badge></div>
                <div className="hero-session"><span>{session.displayName} ({session.username})</span><Button variant="outline" onClick={logout}><LogOut size={16} /> ??????????</Button></div>
              </div>
              <h1>??????????????</h1>
              <p>?????????????????? ???????????????????????????????????????????????????????????????</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>?????????????</span><strong>{orderedNews.length}</strong></div>
              <div className="hero-stat"><span>Model ??????</span><strong>{bank.models.length}</strong></div>
              <div className="hero-stat"><span>Part ???????</span><strong>{bank.models.reduce((sum, entry) => sum + entry.parts.length, 0)}</strong></div>
              <div className="hero-stat"><span>??????????</span><strong>{isAdmin ? "ADMIN" : "USER"}</strong></div>
            </div>
          </motion.section>

          <div className="portal-grid">
            <Card className="portal-card">
              <CardContent className="portal-card-content">
                <div className="section-heading"><Eye size={20} /><div><h3>????????????</h3><p>????????????????????, ???????, dashboard ??????????????????????????</p></div></div>
                <Button onClick={() => setEntryPoint("exam")}>????????????</Button>
              </CardContent>
            </Card>

            <Card className="portal-card">
              <CardContent className="portal-card-content">
                <div className="section-heading"><Megaphone size={20} /><div><h3>???????????</h3><p>??????????????????, ???????????, ??????????????????????????????????</p></div></div>
                <Button onClick={() => setEntryPoint("news")}>?????????????</Button>
              </CardContent>
            </Card>

            {isAdmin ? (
              <Card className="portal-card">
                <CardContent className="portal-card-content">
                  <div className="section-heading"><BarChart3 size={20} /><div><h3>Employee score summary</h3><p>View average scores, latest results, and per-person details on a separate page.</p></div></div>
                  <Button onClick={() => setEntryPoint("scores")}>Open score summary</Button>
                </CardContent>
              </Card>
            ) : null}

          </div>
        </div>
      </div>
    );
  }

  if (entryPoint === "scores" && isAdmin) {
    return (
      <div className="app-shell">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="app-container">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
            <div className="hero-copy">
              <div className="hero-topbar">
                <div className="hero-badges"><Badge>Employee Scores</Badge><Badge outline>{employeeResultSummaries.length} employees</Badge></div>
                <div className="hero-session">
                  <Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> Back</Button>
                  <Button variant="outline" onClick={logout}><LogOut size={16} /> Logout</Button>
                </div>
              </div>
              <h1>Employee score summary</h1>
              <p>Separate summary screen for reviewing each employee's latest results, average score, and full exam history.</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>Employees</span><strong>{employeeResultSummaries.length}</strong></div>
              <div className="hero-stat"><span>Total attempts</span><strong>{resultHistory.length}</strong></div>
              <div className="hero-stat"><span>Latest pass</span><strong>{employeeResultSummaries.filter((entry) => entry.latestStatus === "PASS").length}</strong></div>
              <div className="hero-stat"><span>Average score</span><strong>{employeeResultSummaries.length ? Math.round(employeeResultSummaries.reduce((sum, entry) => sum + entry.avgPct, 0) / employeeResultSummaries.length) : 0}%</strong></div>
            </div>
          </motion.section>

          <div className="dashboard-layout">
            <Card>
              <CardContent>
                <div className="dashboard-filters">
                  <div>
                    <Label>Search employee</Label>
                    <Input value={employeeResultsSearch} onChange={(e) => setEmployeeResultsSearch(e.target.value)} placeholder="Employee name or code" />
                  </div>
                  <div>
                    <Label>Latest status</Label>
                    <select value={employeeResultsStatusFilter} onChange={(e) => setEmployeeResultsStatusFilter(e.target.value)} style={S.input}>
                      <option value="ALL">All</option>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                  <div>
                    <Label>Matched employees</Label>
                    <Input value={employeeResultSummaries.length} readOnly />
                  </div>
                  <div>
                    <Label>Export</Label>
                    <Button variant="outline" onClick={exportSelectedEmployeeResultsCsv} disabled={!selectedEmployeeResults.length}>Export employee CSV</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="employee-results-layout">
              <Card>
                <CardHeader><div className="section-heading"><Users size={18} /><div><h3>Employees with scores</h3><p>Select a name to open that employee's score summary.</p></div></div></CardHeader>
                <CardContent className="employee-result-list">
                  {employeeResultSummaries.length === 0 ? <div className="empty-state">No employee results matched the current filter.</div> : employeeResultSummaries.map((entry) => <button key={entry.candidateCode} className={`employee-result-row ${selectedEmployeeResultCode === entry.candidateCode ? "is-active" : ""}`.trim()} onClick={() => setSelectedEmployeeResultCode(entry.candidateCode)}><div><strong>{entry.candidateName}</strong><div className="employee-result-meta">{entry.candidateCode} | Latest {entry.latestModelPart || "-"}</div></div><div className="employee-result-side"><span className={`status-pill status-${String(entry.latestStatus || "").toLowerCase()}`.trim()}>{entry.latestStatus}</span><strong>{entry.avgPct}%</strong></div></button>)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>Score details</h3><p>Shows attempts, pass count, average score, and detailed exam records.</p></div></div></CardHeader>
                <CardContent>
                  {selectedEmployeeResults.length === 0 ? <div className="empty-state">Select an employee from the list to view details.</div> : <div className="detail-stack"><div className="dashboard-stats"><Card className="metric-card"><CardContent><div className="metric-label">Attempts</div><div className="metric-value">{selectedEmployeeResults.length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Passed</div><div className="metric-value">{selectedEmployeeResults.filter((entry) => entry.status === "PASS").length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Average score</div><div className="metric-value">{Math.round(selectedEmployeeResults.reduce((sum, entry) => sum + (entry.fullScore ? (entry.score / entry.fullScore) * 100 : 0), 0) / selectedEmployeeResults.length)}%</div></CardContent></Card></div><div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Time</th><th>Model/Part</th><th>Score</th><th>Status</th></tr></thead><tbody>{selectedEmployeeResults.map((entry) => <tr key={entry.id}><td>{new Date(entry.submittedAt).toLocaleString()}</td><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td>{entry.score}/{entry.fullScore}</td><td><span className={`status-pill status-${String(entry.status || "").toLowerCase()}`.trim()}>{entry.status}</span></td></tr>)}</tbody></table></div><Card><CardHeader><div className="section-heading"><ClipboardCheck size={18} /><div><h3>Exam vs evaluation by part</h3><p>Compare each part's latest exam score with the latest evaluation score for the same employee.</p></div></div></CardHeader><CardContent>{selectedEmployeePartComparison.length === 0 ? <div className="empty-state">No exam/evaluation comparison data for this employee yet.</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Part</th><th>Exam score</th><th>Exam status</th><th>Evaluation score</th><th>Evaluator</th><th>Latest record</th></tr></thead><tbody>{selectedEmployeePartComparison.map((entry) => <tr key={entry.key}><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td>{entry.examFullScore != null ? `${entry.examScore}/${entry.examFullScore}` : "-"}</td><td><span className={`status-pill status-${String(entry.examStatus || "").toLowerCase()}`.trim()}>{entry.examStatus}</span></td><td>{entry.evaluationMaxScore != null ? `${entry.evaluationScore}/${entry.evaluationMaxScore}` : "-"}</td><td>{entry.evaluator}</td><td>{entry.comparedAt ? new Date(entry.comparedAt).toLocaleString() : "-"}</td></tr>)}</tbody></table></div>}</CardContent></Card></div>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (entryPoint === "news") {
    return (
      <div className="app-shell">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="app-container">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
            <div className="hero-copy">
              <div className="hero-topbar">
                <div className="hero-badges"><Badge>News Center</Badge><Badge outline>{visibleNews.length} items</Badge></div>
                <div className="hero-session">
                  <Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> Back</Button>
                  <Button variant="outline" onClick={logout}><LogOut size={16} /> Logout</Button>
                </div>
              </div>
              <h1>News and announcements</h1>
              <p>Read the latest internal updates here, then jump back to the exam area whenever you need.</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>Pinned</span><strong>{orderedNews.filter((item) => item.pinned).length}</strong></div>
              <div className="hero-stat"><span>Published</span><strong>{orderedNews.filter((item) => item.published !== false).length}</strong></div>
              {isAdmin ? <div className="hero-stat"><span>Hidden</span><strong>{orderedNews.filter((item) => item.published === false).length}</strong></div> : null}
            </div>
          </motion.section>

          {isAdmin ? (
            <Card>
              <CardHeader><div className="section-heading"><Megaphone size={18} /><div><h3>Manage news</h3><p>Create, edit, and control which announcements are visible to all employees.</p></div></div></CardHeader>
              <CardContent>
                <div className="form-stack">
                  <Label>Title</Label>
                  <Input value={newsForm.title} onChange={(e) => setNewsForm((prev) => ({ ...prev, title: e.target.value }))} />
                  <Label>Summary</Label>
                  <Input value={newsForm.summary} onChange={(e) => setNewsForm((prev) => ({ ...prev, summary: e.target.value }))} />
                  <Label>Image URL</Label>
                  <Input value={newsForm.imageUrl} onChange={(e) => setNewsForm((prev) => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://..." />
                  <label className="upload-button">
                    <ImagePlus size={16} /> Upload news image
                    <input type="file" accept="image/*" hidden onChange={(e) => uploadNewsImage(e.target.files?.[0])} />
                  </label>
                  {newsForm.imageUrl ? <img src={newsForm.imageUrl} alt="news-preview" className="news-image" /> : null}
                  <Label>Detail</Label>
                  <Textarea rows={5} value={newsForm.content} onChange={(e) => setNewsForm((prev) => ({ ...prev, content: e.target.value }))} />
                  <label className="news-pin-toggle">
                    <input type="checkbox" checked={newsForm.pinned} onChange={(e) => setNewsForm((prev) => ({ ...prev, pinned: e.target.checked }))} />
                    <span>Pin this item to the top</span>
                  </label>
                  <label className="news-pin-toggle">
                    <input type="checkbox" checked={newsForm.published !== false} onChange={(e) => setNewsForm((prev) => ({ ...prev, published: e.target.checked }))} />
                    <span>Publish for all users</span>
                  </label>
                  {newsError ? <div className="alert-error">{newsError}</div> : null}
                  <div className="button-row">
                    <Button onClick={saveNews}>{editingNewsId ? "Save changes" : "Create news"}</Button>
                    <Button variant="outline" onClick={resetNewsForm}>Clear form</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="news-toolbar">
              <div className="news-search-wrap">
                <Search size={18} />
                <Input value={newsSearch} onChange={(e) => setNewsSearch(e.target.value)} placeholder="Search title, summary, or content" />
              </div>
              {isAdmin ? (
                <div>
                  <Label>Visibility</Label>
                  <select value={newsVisibilityFilter} onChange={(e) => setNewsVisibilityFilter(e.target.value)} style={S.input}>
                    <option value="ALL">All</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="HIDDEN">Hidden</option>
                  </select>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="news-grid">
            {visibleNews.length === 0 ? <Card><CardContent className="empty-state">No news matched the current filter.</CardContent></Card> : visibleNews.map((item) => (
              <Card key={item.id} className={`news-card ${item.published === false ? "is-hidden" : ""}`.trim()}>
                <CardContent className="news-card-content">
                  <div className="news-meta-row">
                    <div className="hero-badges">
                      {item.pinned ? <Badge>Pinned</Badge> : <Badge outline>News</Badge>}
                      <Badge outline>{new Date(item.publishedAt).toLocaleDateString()}</Badge>
                      {isAdmin ? <Badge outline>{item.published === false ? "Hidden" : "Published"}</Badge> : null}
                    </div>
                  </div>
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="news-image" /> : null}
                  <h3>{item.title}</h3>
                  {item.summary ? <p className="news-summary">{item.summary}</p> : null}
                  <div className="news-content">{item.content}</div>
                  {isAdmin ? (
                    <div className="button-row">
                      <Button variant="outline" onClick={() => startEditNews(item)}>Edit</Button>
                      <Button variant="destructive" onClick={() => removeNews(item)}>Delete</Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <div className="backdrop-grid" />
      <div className="backdrop-glow backdrop-glow-left" />
      <div className="backdrop-glow backdrop-glow-right" />
      <div className="app-container">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
          <div className="hero-copy">
            <div className="hero-topbar">
              <div className="hero-badges"><Badge>Factory Exam Builder</Badge><Badge outline>{isAdmin ? "ADMIN ACCESS" : "USER ACCESS"}</Badge></div>
              <div className="hero-session"><span>{session.displayName} ({session.username})</span><Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> ????????</Button><Badge outline>{syncStatus === "saving" ? "Saving..." : syncStatus === "offline" ? "Server Offline" : syncStatus === "loading" ? "Loading..." : "Server Synced"}</Badge><Button variant="outline" onClick={logout}><LogOut size={16} /> ??????????</Button></div>
            </div>
            <h1>{bank.title}</h1>
            <p>????????????????????????????? ?????????????????????? ?????????????????? ???????????????????? Dashboard ?????</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span>????? Model</span><strong>{bank.models.length}</strong></div>
            <div className="hero-stat"><span>Part ????????</span><strong>{model?.parts.length || 0}</strong></div>
            <div className="hero-stat"><span>???????? Part</span><strong>{part?.questions.length || 0}</strong></div>
            <div className="hero-stat"><span>?????????</span><strong>{scoreFull}</strong></div>
          </div>
        </motion.section>

        {isAdmin ? (
          <Card className="action-strip"><CardContent className="action-strip-content"><div><p className="section-kicker">Quick Actions</p><h2>????????????????????????????</h2></div><div className="action-buttons"><Button onClick={addQ}><Plus size={16} /> ???????????????</Button><Button variant="outline" onClick={saveLocal}><Save size={16} /> ?????????????????</Button><Button variant="outline" onClick={exportJSON}><FileJson size={16} /> Export JSON</Button></div></CardContent></Card>
        ) : (
          <Card className="action-strip"><CardContent className="action-strip-content"><div><p className="section-kicker">Exam Mode</p><h2>?????????????????????????????????????????</h2></div><div className="hero-badges"><Badge outline>Preview Only</Badge></div></CardContent></Card>
        )}

        <Tabs key={session.role} value={activeTab} onValueChange={setActiveTab} defaultValue={isAdmin ? "builder" : "preview"}>
          <TabsList>
            {isAdmin ? <TabsTrigger value="builder"><Settings2 size={16} /> Admin Builder</TabsTrigger> : null}
            <TabsTrigger value="preview"><Eye size={16} /> Student Preview</TabsTrigger>
            {isAdmin ? <><TabsTrigger value="evaluation"><FileSpreadsheet size={16} /> Evaluation</TabsTrigger><TabsTrigger value="employees"><Users size={16} /> Employees</TabsTrigger><TabsTrigger value="employee-results"><Users size={16} /> Employee Results</TabsTrigger><TabsTrigger value="dashboard"><BarChart3 size={16} /> Dashboard</TabsTrigger><TabsTrigger value="importexport"><FileJson size={16} /> Import / Export</TabsTrigger></> : null}
          </TabsList>

          {isAdmin ? (
            <TabsContent value="builder">
              <div className="split-grid">
                <Card>
                  <CardHeader><div className="section-heading"><BookOpen size={18} /><div><h3>??????? Model / Part</h3><p>??????????????????????????????????????? Part</p></div></div></CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <Label>????????</Label><Input value={bank.title} onChange={(e) => setBank((b) => ({ ...b, title: e.target.value }))} />
                      <Label>Model</Label>
                      <select value={model.id} onChange={(e) => { setModelId(e.target.value); const nextModel = bank.models.find((x) => x.id === e.target.value); setPartId(nextModel.parts[0].id); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select>
                      <div className="button-row"><Button onClick={addModel}><Plus size={16} /> ????? Model</Button><Button variant="destructive" onClick={removeModel}><Trash2 size={16} /> ?? Model</Button></div>
                      <Label>Model Code</Label><Input value={model.modelCode} onChange={(e) => patchModel("modelCode", e.target.value)} />
                      <Label>Model Name</Label><Input value={model.modelName} onChange={(e) => patchModel("modelName", e.target.value)} />
                      <Label>Part</Label>
                      <select value={part.id} onChange={(e) => setPartId(e.target.value)} style={S.input}>{model.parts.map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select>
                      <div className="button-row"><Button disabled={model.parts.length >= 20} onClick={addPart}><Plus size={16} /> ????? Part</Button><Button variant="destructive" onClick={removePart}><Trash2 size={16} /> ?? Part</Button></div>
                      <div className="mini-note">Model ????? {model.parts.length} Part (?????? 20)</div>
                      <Label>Part Code</Label><Input value={part.partCode} onChange={(e) => patchPart("partCode", e.target.value)} />
                      <Label>Part Name</Label><Input value={part.partName} onChange={(e) => patchPart("partName", e.target.value)} />
                      <Label>????????</Label><Input value={part.subtitle} onChange={(e) => patchPart("subtitle", e.target.value)} />
                      <div className="two-col"><div><Label>Pass Score</Label><Input type="number" value={part.passScore} onChange={(e) => patchPart("passScore", Number(e.target.value))} /></div><div><Label>Full Score</Label><Input type="number" value={scoreFull} disabled style={{ background: "rgba(14, 26, 36, 0.06)" }} /></div></div>
                      <div className="toggle-row"><span>???????????????</span><Button variant={part.randomizeQuestions ? "default" : "outline"} onClick={() => patchPart("randomizeQuestions", !part.randomizeQuestions)}>{part.randomizeQuestions ? "ON" : "OFF"}</Button></div>
                      <div className="toggle-row"><span>??????????????????</span><Button variant={part.showResultImmediately ? "default" : "outline"} onClick={() => patchPart("showResultImmediately", !part.showResultImmediately)}>{part.showResultImmediately ? "ON" : "OFF"}</Button></div>
                      <div className="question-list">{part.questions.map((q, i) => <button key={q.id} onClick={() => setQId(q.id)} className={`question-chip ${q.id === question?.id ? "is-active" : ""}`}><span className="question-chip-no">??? {i + 1}</span><strong>{q.questionText || "??????????????????"}</strong><small>{q.score} ?????</small></button>)}</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><div className="section-heading"><ClipboardCheck size={18} /><div><h3>???????????</h3><p>????????? ???????? ????????? ??????????????????</p></div></div></CardHeader>
                  <CardContent>
                      {builderServerUpdate ? (
                        <div className="alert-error" style={{ marginBottom: 16 }}>
                          ????????????????????? server ??????????????????????? ??????????????????????????????? 
                          <button type="button" onClick={reloadBuilderFromServer} style={{ background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontWeight: 700, padding: 0 }}>
                            ????????????????
                          </button>
                        </div>
                      ) : null}
                      {!question ? <div className="empty-state">??????????????</div> : <div className="editor-layout"><div className="button-row"><Button variant="outline" onClick={() => moveQ(-1)}>????</Button><Button variant="outline" onClick={() => moveQ(1)}>??</Button><Button variant="outline" onClick={dupQ}>??????</Button><Button variant="destructive" onClick={delQ}><Trash2 size={16} /> ??</Button></div><Label>?????</Label><Textarea rows={4} value={question.questionText} onChange={(e) => patchQ(question.id, { questionText: e.target.value })} /><div className="two-col"><div><Label>?????</Label><Input type="number" value={question.score} onChange={(e) => patchQ(question.id, { score: Number(e.target.value) })} /></div><div><Label>???????????</Label><select value={question.correctAnswer} onChange={(e) => patchQ(question.id, { correctAnswer: e.target.value })} style={S.input}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></div><Label>???????????</Label><Input value={question.imageUrl} onChange={(e) => patchQ(question.id, { imageUrl: e.target.value })} /><label className="upload-button"><ImagePlus size={16} /> ????????<input type="file" accept="image/*" hidden onChange={(e) => uploadImg(e.target.files?.[0])} /></label>{question.imageUrl ? <img src={question.imageUrl} alt="question" className="question-image" /> : null}<div className="choice-grid">{["A", "B", "C", "D"].map((key) => <Card key={key} className="choice-card"><CardContent><Label>???????? {key}</Label><Textarea rows={3} value={question.choices[key]} onChange={(e) => patchChoice(question.id, key, e.target.value)} /><Button variant="outline" onClick={() => patchQ(question.id, { correctAnswer: key })}>???????????????????</Button></CardContent></Card>)}</div></div>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="preview">
            <div className="split-grid">
              <Card className="sticky-card"><CardHeader><div className="section-heading"><Eye size={18} /><div><h3>Candidate details</h3><p>Preview the exam form and track the current attempt in real time.</p></div></div></CardHeader><CardContent><div className="form-stack"><Label>Model</Label><select value={model.id} onChange={(e) => { setModelId(e.target.value); const nextModel = bank.models.find((x) => x.id === e.target.value); setPartId(nextModel.parts[0].id); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select><Label>Part</Label><select value={part.id} onChange={(e) => setPartId(e.target.value)} style={S.input}>{model.parts.map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select><Label>Employee name</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} /><Label>Employee code</Label><Input value={candidateCode} onChange={(e) => setCandidateCode(e.target.value)} /><div className="progress-block"><div className="progress-label-row"><span>Progress</span><strong>{answered}/{part.questions.length}</strong></div><Progress value={progress} /></div>{submitError ? <div className="alert-error">{submitError}</div> : null}{isExamLocked ? <div className="alert-error">This part was already passed on {new Date(passedAttemptForCurrentPart.submittedAt).toLocaleString()} with score {passedAttemptForCurrentPart.score}/{passedAttemptForCurrentPart.fullScore}.</div> : null}<Button variant="outline" disabled={!submitted} onClick={exportCSV}>Export result CSV</Button><Button variant="outline" onClick={reset} disabled={isExamLocked}>Start over</Button></div></CardContent></Card>
              <div className="preview-column"><Card className="exam-overview"><CardContent><div className="hero-badges"><Badge>{model.modelCode}</Badge><Badge outline>{part.partCode}</Badge></div><h2>{bank.title}</h2><div className="overview-line">{model.modelName} | {part.partName}</div><p>{part.subtitle}</p></CardContent></Card>{previewQs.map((q, i) => <Card key={q.id} className="exam-question-card"><CardContent><div className="question-meta"><span>Question {i + 1}</span><strong>{q.score} pts</strong></div><h3>{q.questionText}</h3>{q.imageUrl ? <img src={q.imageUrl} alt={`question-${i + 1}`} className="question-image" /> : null}<div className="answer-grid">{["A", "B", "C", "D"].map((key) => { const selected = answers[q.id] === key; const correct = q.correctAnswer === key; let className = "answer-choice"; if (selected) className += " is-selected"; if (submitted && correct) className += " is-correct"; if (submitted && selected && !correct) className += " is-wrong"; return <button key={key} onClick={() => !submitted && !isExamLocked && setAnswers((p) => ({ ...p, [q.id]: key }))} className={className} disabled={isExamLocked}><strong>{key}.</strong> {q.choices[key]}</button>; })}</div></CardContent></Card>)}{isExamLocked ? <Card className="exam-lock-card"><CardContent className="exam-submit-actions"><div><div className="result-label">Part already passed</div><p>Retakes are disabled after a passing result. Latest score {passedAttemptForCurrentPart.score}/{passedAttemptForCurrentPart.fullScore}</p></div><div className="button-row"><Button variant="outline" disabled>Submission locked</Button>{nextPart ? <Button onClick={goToNextPart}>Go to next part</Button> : null}</div></CardContent></Card> : <Card className="exam-submit-card"><CardContent className="exam-submit-actions"><div><div className="result-label">Ready to submit</div><p>Review every answer and submit from the section below.</p></div><div className="button-row"><Button onClick={submit}>Submit answers</Button>{submitted && nextPart ? <Button variant="outline" onClick={goToNextPart}>Go to next part</Button> : null}</div></CardContent></Card>}{submitted && part.showResultImmediately ? <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Card className={`result-banner ${result.status === "PASS" ? "is-pass" : "is-fail"}`}><CardContent className="result-banner-content"><div><div className="result-label"><Trophy size={18} /> Exam result</div><h2>{result.score} / {scoreFull}</h2><p>Correct answers {result.correct} of {part.questions.length}</p></div><div className="result-status"><span>Status</span><strong>{result.status}</strong></div></CardContent></Card></motion.div> : null}</div>
            </div>
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="evaluation">
              <div className="evaluation-layout">
                <Card>
                  <CardHeader>
                    <div className="section-heading">
                      <FileSpreadsheet size={18} />
                      <div>
                        <h3>???????????????????????</h3>
                        <p>???????????????????????????????????????????????????????????</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <Label>?????????????????</Label>
                      <Input value={evaluationForm.sectionTitle} onChange={(e) => patchEvaluationMeta("sectionTitle", e.target.value)} />
                      <div className="three-col">
                        <div>
                          <Label>Model</Label>
                          <select value={evaluationForm.modelId} onChange={(e) => selectEvaluationModel(e.target.value)} style={S.input}>
                            <option value="">????? Model</option>
                            {bank.models.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.modelCode} - {entry.modelName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Part</Label>
                          <select value={evaluationForm.partId} onChange={(e) => selectEvaluationPart(e.target.value)} style={S.input}>
                            <option value="">????? Part</option>
                            {evaluationPartOptions.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.partCode} - {entry.partName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>???????????</Label>
                          <select value={evaluationForm.employeeCode} onChange={(e) => selectEvaluationEmployeeByCode(e.target.value)} style={S.input}>
                            <option value="">????????????????</option>
                            {activeEmployees.map((employee) => (
                              <option key={employee.id} value={employee.employeeCode}>
                                {employee.employeeCode}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>???????????</Label>
                          <select value={evaluationForm.employeeName} onChange={(e) => selectEvaluationEmployeeByName(e.target.value)} style={S.input}>
                            <option value="">????????????????</option>
                            {activeEmployees.map((employee) => (
                              <option key={employee.id} value={employee.fullName}>
                                {employee.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>??????????</Label>
                          <Input value={evaluationForm.evaluator} onChange={(e) => patchEvaluationMeta("evaluator", e.target.value)} />
                        </div>
                      </div>
                      <div className="evaluation-summary-strip">
                        <div className="mini-note">Part ????????: <strong>{evaluationPart ? `${evaluationPart.partCode} - ${evaluationPart.partName}` : "-"}</strong></div>
                        <div className="mini-note">??????????????: <strong>{latestEvaluationExamResult ? `${latestEvaluationExamResult.score}/${latestEvaluationExamResult.fullScore} (${latestEvaluationExamResult.status})` : "???????????????? Part ???"}</strong></div>
                      </div>
                      {evaluationError ? <div className="alert-error">{evaluationError}</div> : null}
                      <div className="button-row">
                        <Button onClick={saveEvaluation}>???????????????</Button>
                        <Button variant="outline" onClick={resetEvaluation}>???????????</Button>
                        <Button variant="outline" onClick={exportEvaluationCsv}>Export CSV</Button>
                        <Button variant="outline" onClick={() => window.print()}>??????????</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="evaluation-sheet-card">
                  <CardContent className="evaluation-sheet-wrap">
                    <div className="evaluation-sheet">
                      <div className="evaluation-sheet-title">{evaluationForm.sectionTitle}</div>
                      <div className="evaluation-sheet-meta">
                        <span>???????????: <strong>{evaluationForm.employeeCode || "-"}</strong></span>
                        <span>???????????: <strong>{evaluationForm.employeeName || "-"}</strong></span>
                        <span>Model/Part: <strong>{evaluationModel && evaluationPart ? `${evaluationModel.modelCode} / ${evaluationPart.partCode}` : "-"}</strong></span>
                        <span>??????????: <strong>{evaluationForm.evaluator || "-"}</strong></span>
                        <span>??????????????: <strong>{latestEvaluationExamResult ? `${latestEvaluationExamResult.score}/${latestEvaluationExamResult.fullScore} (${latestEvaluationExamResult.status})` : "-"}</strong></span>
                      </div>
                      <table className="evaluation-table">
                        <thead>
                          <tr>
                            <th rowSpan="2" className="col-no">???<br />No</th>
                            <th rowSpan="2" className="col-item">??????<br />Item</th>
                            <th colSpan={scoreLevels.length}>????????????????<br />Score Level</th>
                            <th rowSpan="2" className="col-method">???????</th>
                            <th rowSpan="2" className="col-score">?????<br />Score (A)</th>
                            <th rowSpan="2" className="col-weight">???????<br />Weight (B)</th>
                            <th rowSpan="2" className="col-total">???????????<br />(A) x (B)</th>
                          </tr>
                          <tr>
                            {scoreLevels.map((level) => <th key={level} className="col-level">{level}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {evaluationForm.rows.map((row) => (
                            <tr key={row.id}>
                              <td>{row.no}</td>
                              <td>
                                <Textarea
                                  rows={2}
                                  value={row.item}
                                  onChange={(e) => patchEvaluationRow(row.id, { item: e.target.value })}
                                  className="evaluation-textarea"
                                />
                              </td>
                              {scoreLevels.map((level) => (
                                <td key={level} className="evaluation-radio-cell">
                                  <input
                                    type="radio"
                                    name={`score-${row.id}`}
                                    checked={Number(row.score) === level}
                                    onChange={() => patchEvaluationRow(row.id, { score: level })}
                                  />
                                </td>
                              ))}
                              <td>
                                <Input
                                  value={row.method}
                                  onChange={(e) => patchEvaluationRow(row.id, { method: e.target.value })}
                                  className="evaluation-inline-input"
                                />
                              </td>
                              <td className="evaluation-number-cell">{row.score || "-"}</td>
                              <td>
                                <Input
                                  type="number"
                                  value={row.weight}
                                  onChange={(e) => patchEvaluationRow(row.id, { weight: Number(e.target.value) })}
                                  className="evaluation-inline-input"
                                />
                              </td>
                              <td className="evaluation-number-cell">{Number(row.score || 0) * Number(row.weight || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={scoreLevels.length + 4}>????????</td>
                            <td>{evaluationTotal}</td>
                          </tr>
                          <tr>
                            <td colSpan={scoreLevels.length + 4}>???????????????</td>
                            <td>{evaluationMax}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="table-header-row">
                      <div>
                        <h3>????????????????????????</h3>
                        <p>???????????????? Part ????????????? ?????????????????????</p>
                      </div>
                      <div className="mini-note">
                        {evaluationStatus === "loading" ? "?????????..." : `??????????? ${filteredEvaluationHistory.length} ??? ${evaluationHistory.length} ??????`}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="dashboard-filters">
                      <div>
                        <Label>?????</Label>
                        <Input value={evaluationSearch} onChange={(e) => setEvaluationSearch(e.target.value)} placeholder="???? / ???? / Model / Part / ??????????" />
                      </div>
                      <div>
                        <Label>Part</Label>
                        <select value={evaluationPartFilter} onChange={(e) => setEvaluationPartFilter(e.target.value)} style={S.input}>
                          <option value="ALL">???????</option>
                          {evaluationPartFilterOptions.map((entry) => (
                            <option key={entry.key} value={entry.key}>{entry.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>??????????</Label>
                        <select value={evaluationEvaluatorFilter} onChange={(e) => setEvaluationEvaluatorFilter(e.target.value)} style={S.input}>
                          <option value="ALL">???????</option>
                          {evaluationEvaluatorOptions.map((entry) => (
                            <option key={entry} value={entry}>{entry}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {filteredEvaluationHistory.length === 0 ? (
                      <div className="empty-state">???????????????????????</div>
                    ) : (
                      <div className="dashboard-table-wrap">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>????</th>
                              <th>???????</th>
                              <th>Model / Part</th>
                              <th>????????????</th>
                              <th>??????????????</th>
                              <th>??????????</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEvaluationHistory.map((entry) => (
                              <tr key={entry.id}>
                                <td>{new Date(entry.updatedAt || entry.createdAt).toLocaleString()}</td>
                                <td>{entry.employeeName} ({entry.employeeCode})</td>
                                <td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td>
                                <td>{entry.totalScore}/{entry.maxScore}</td>
                                <td>{entry.examFullScore ? `${entry.examScore}/${entry.examFullScore} (${entry.examStatus || "-"})` : "-"}</td>
                                <td>{entry.evaluator || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ) : null}

          {isAdmin ? (
            <TabsContent value="employees">
              <div className="split-grid">
                <Card>
                  <CardHeader>
                    <div className="section-heading">
                      <Users size={18} />
                      <div>
                        <h3>???????????????????</h3>
                        <p>??????????????????? ??????????? ???????????????????????????????????????</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <div className="two-col">
                        <div>
                          <Label>???????????</Label>
                          <Input value={employeeForm.employeeCode} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, employeeCode: e.target.value }))} />
                        </div>
                        <div>
                          <Label>??????</Label>
                          <select value={employeeForm.role} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))} style={S.input}>
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </div>
                      <div className="mini-note">???????????????????????????????????????????????</div>
                      <Label>????-???????</Label>
                      <Input value={employeeForm.fullName} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, fullName: e.target.value }))} />
                      <div className="two-col">
                        <div>
                          <Label>????</Label>
                          <Input value={employeeForm.department} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department: e.target.value }))} />
                        </div>
                        <div>
                          <Label>???????</Label>
                          <Input value={employeeForm.position} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, position: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>?????</Label>
                        <select value={employeeForm.isActive ? "ACTIVE" : "INACTIVE"} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, isActive: e.target.value === "ACTIVE" }))} style={S.input}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                      {employeeError ? <div className="alert-error">{employeeError}</div> : null}
                      <div className="button-row">
                        <Button onClick={saveEmployee}>{editingEmployeeId ? "??????????????" : "????????????"}</Button>
                        <Button variant="outline" onClick={resetEmployeeForm}>?????????</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="table-header-row">
                      <div>
                        <h3>??????????????</h3>
                        <p>???????????? {employees.length} ?? {employeeStatus === "loading" ? "(?????????...)" : ""}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {employees.length === 0 ? (
                      <div className="empty-state">????????????????????????????</div>
                    ) : (
                      <div className="dashboard-table-wrap">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>????</th>
                              <th>???????????</th>
                              <th>????/???????</th>
                              <th>??????</th>
                              <th>?????</th>
                              <th>??????</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((employee) => (
                              <tr key={employee.id}>
                                <td>{employee.fullName}</td>
                                <td>{employee.employeeCode}</td>
                                <td>{employee.department || "-"} / {employee.position || "-"}</td>
                                <td>{employee.role}</td>
                                <td>{employee.isActive ? "ACTIVE" : "INACTIVE"}</td>
                                <td>
                                  <div className="button-row">
                                    <Button variant="outline" onClick={() => startEditEmployee(employee)}>?????</Button>
                                    <Button variant="destructive" onClick={() => removeEmployee(employee)} disabled={employee.username === "ADMIN1234"}>??</Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ) : null}

          {isAdmin ? <TabsContent value="employee-results"><div className="dashboard-layout"><Card><CardContent><div className="dashboard-filters"><div><Label>Search employee</Label><Input value={employeeResultsSearch} onChange={(e) => setEmployeeResultsSearch(e.target.value)} placeholder="Employee name or code" /></div><div><Label>Latest status</Label><select value={employeeResultsStatusFilter} onChange={(e) => setEmployeeResultsStatusFilter(e.target.value)} style={S.input}><option value="ALL">All</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></div><div><Label>Matched employees</Label><Input value={employeeResultSummaries.length} readOnly /></div><div><Label>Export</Label><Button variant="outline" onClick={exportSelectedEmployeeResultsCsv} disabled={!selectedEmployeeResults.length}>Export employee CSV</Button></div></div></CardContent></Card><div className="employee-results-layout"><Card><CardHeader><div className="section-heading"><Users size={18} /><div><h3>Employees with exam history</h3><p>Select an employee to view recent attempts and score trends.</p></div></div></CardHeader><CardContent className="employee-result-list">{employeeResultSummaries.length === 0 ? <div className="empty-state">No employee results matched the current filter.</div> : employeeResultSummaries.map((entry) => <button key={entry.candidateCode} className={`employee-result-row ${selectedEmployeeResultCode === entry.candidateCode ? "is-active" : ""}`.trim()} onClick={() => setSelectedEmployeeResultCode(entry.candidateCode)}><div><strong>{entry.candidateName}</strong><div className="employee-result-meta">{entry.candidateCode} | Latest {entry.latestModelPart || "-"}</div></div><div className="employee-result-side"><span className={`status-pill status-${String(entry.latestStatus || "").toLowerCase()}`.trim()}>{entry.latestStatus}</span><strong>{entry.avgPct}%</strong></div></button>)}</CardContent></Card><Card><CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>Employee exam summary</h3><p>See attempt count, pass count, and the detailed exam list for the selected person.</p></div></div></CardHeader><CardContent>{selectedEmployeeResults.length === 0 ? <div className="empty-state">Select an employee from the list to view detailed attempts.</div> : <div className="detail-stack"><div className="dashboard-stats"><Card className="metric-card"><CardContent><div className="metric-label">Attempts</div><div className="metric-value">{selectedEmployeeResults.length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Passed</div><div className="metric-value">{selectedEmployeeResults.filter((entry) => entry.status === "PASS").length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Average score</div><div className="metric-value">{Math.round(selectedEmployeeResults.reduce((sum, entry) => sum + (entry.fullScore ? (entry.score / entry.fullScore) * 100 : 0), 0) / selectedEmployeeResults.length)}%</div></CardContent></Card></div><div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Time</th><th>Model/Part</th><th>Score</th><th>Status</th></tr></thead><tbody>{selectedEmployeeResults.map((entry) => <tr key={entry.id}><td>{new Date(entry.submittedAt).toLocaleString()}</td><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td>{entry.score}/{entry.fullScore}</td><td><span className={`status-pill status-${String(entry.status || "").toLowerCase()}`.trim()}>{entry.status}</span></td></tr>)}</tbody></table></div></div>}</CardContent></Card></div></div></TabsContent> : null}

          {isAdmin ? <TabsContent value="dashboard"><div className="dashboard-layout"><Card><CardContent><div className="dashboard-filters"><div><Label>Model</Label><select value={dashboardModelFilter} onChange={(e) => { setDashboardModelFilter(e.target.value); setDashboardPartFilter("ALL"); }} style={S.input}><option value="ALL">???????</option>{dashboardModelOptions.map((m) => <option key={m.modelCode} value={m.modelCode}>{m.modelCode} - {m.modelName}</option>)}</select></div><div><Label>Part</Label><select value={dashboardPartFilter} onChange={(e) => setDashboardPartFilter(e.target.value)} style={S.input}><option value="ALL">???????</option>{dashboardPartOptions.map((p) => <option key={p.key} value={p.key}>{p.modelCode}/{p.partCode} - {p.partName}</option>)}</select></div><div><Label>?????</Label><select value={dashboardStatusFilter} onChange={(e) => setDashboardStatusFilter(e.target.value)} style={S.input}><option value="ALL">???????</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></div><div><Label>?????</Label><Input value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} placeholder="???? / ???? / Model / Part" /></div></div></CardContent></Card><div className="dashboard-stats"><Card className="metric-card"><CardContent><div className="metric-label">????????????????????</div><div className="metric-value">{dashboardSummary.attempts}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">????????????</div><div className="metric-value">{dashboardSummary.passed}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">??????????????</div><div className="metric-value">{dashboardSummary.avgPct}%</div></CardContent></Card></div><Card><CardHeader><div className="table-header-row"><div><h3>??????? Model / Part</h3><p>???????????? ????????? ?????????????????????????????</p></div><div className="button-row"><Button variant="outline" onClick={exportDashboardSummaryCsv}>Export Summary CSV</Button><Button variant="outline" onClick={exportDashboardHistoryCsv}>Export History CSV</Button><Button variant="outline" onClick={() => { if (window.confirm("??????????????????????????????")) setResultHistory([]); }}>?????????? Dashboard</Button></div></div></CardHeader><CardContent>{byModelPart.length === 0 ? <div className="empty-state">???????????????????</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Model</th><th>Part</th><th>??????????</th><th>????</th><th>?????????</th><th>???????????</th></tr></thead><tbody>{byModelPart.map((row, idx) => <tr key={`${row.modelCode}-${row.partCode}-${idx}`}><td>{row.modelCode} - {row.modelName}</td><td>{row.partCode} - {row.partName}</td><td>{row.attempts}</td><td>{row.passed}</td><td>{row.passRate}%</td><td>{row.avgPct}%</td></tr>)}</tbody></table></div>}</CardContent></Card><Card><CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>???????????</h3><p>???????????????? 20 ????????????????????????</p></div></div></CardHeader><CardContent>{filteredHistory.length === 0 ? <div className="empty-state">???????????????????</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>????</th><th>???????</th><th>Model/Part</th><th>?????</th><th>?????</th></tr></thead><tbody>{filteredHistory.slice(0, 20).map((r) => <tr key={r.id}><td>{new Date(r.submittedAt).toLocaleString()}</td><td>{r.candidateName} ({r.candidateCode})</td><td>{r.modelCode}/{r.partCode}</td><td>{r.score}/{r.fullScore}</td><td>{r.status}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></TabsContent> : null}

          {isAdmin ? <TabsContent value="importexport"><div className="io-grid"><Card><CardHeader><div className="section-heading"><FileJson size={18} /><div><h3>Export JSON (Model/Part)</h3><p>?????????????????????????????????????????????????</p></div></div></CardHeader><CardContent className="io-card-content"><Textarea rows={18} value={JSON.stringify(bank, null, 2)} readOnly className="mono-textarea" /><Button onClick={exportJSON}><FileJson size={16} /> ????????? JSON</Button></CardContent></Card><Card><CardHeader><div className="section-heading"><FileJson size={18} /><div><h3>Import JSON</h3><p>??????????????????????? JSON ????????????????????????????? UI ?????????</p></div></div></CardHeader><CardContent className="io-card-content"><Textarea rows={18} value={importText} onChange={(e) => setImportText(e.target.value)} className="mono-textarea" /><label className="upload-button"><FileJson size={16} /> ????????? JSON<input type="file" accept=".json,application/json" hidden onChange={(e) => importJSONFile(e.target.files?.[0])} /></label><div className="button-row"><Button onClick={importJSON}>Import JSON</Button><Button variant="outline" onClick={() => setImportText("")}>???????????</Button></div></CardContent></Card></div></TabsContent> : null}
        </Tabs>
      </div>
    </div>
  );
}







