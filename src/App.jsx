import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCallback } from "react";
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
const EXAM_SELECTION_KEY = "factory_exam_selection_v1";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const SKILL_MATRIX_EXAM_WEIGHT = 40;
const SKILL_MATRIX_EVALUATION_WEIGHT = 60;
const SKILL_MATRIX_TOTAL_WEIGHT = SKILL_MATRIX_EXAM_WEIGHT + SKILL_MATRIX_EVALUATION_WEIGHT;

const uid = () => Math.random().toString(36).slice(2, 10);
const shuffleRank = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
};
const emptyEmployeeForm = {
  employeeCode: "",
  fullName: "",
  department: "",
  position: "",
  photoUrl: "",
  role: "USER",
  isActive: true,
};

const evaluationAssignedEvaluators = [
  "206006 นางสาวคณิตา ลุนใต้",
  "210027 นางสาวพรพิไล ศรีทนนาง",
  "211075 นางสาวบรรจง ราชณาจักร์",
  "204041 นางเบญจวรรณ การะเกษ",
  "206029 นางสาวพัชราภรณ์ ปัญญาสิทธิ์",
  "199033 นางสาววราลัย วงศ์จีรภัทร",
  "197036 นางอรุญณี บัวศรี",
  "203009 นางณาตยา ปรีถวิล",
];

const FIXED_QUESTION_SCORE = 5;
const FIXED_PASS_SCORE = 35;

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

const Button = ({ children, onClick, type = "button", variant = "default", disabled = false, className = "", style, ...props }) => {
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
      type={type}
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
  score: FIXED_QUESTION_SCORE,
});

const starterQs = () => [
  {
    ...emptyQ(1),
    questionText: "ข้อใดคือวิธีตรวจสอบชิ้นงานก่อนเริ่มงานอย่างถูกต้อง",
    choices: {
      A: "ตรวจตาม WI และจุดควบคุม",
      B: "ดูคร่าว ๆ แล้วเริ่มงานได้เลย",
      C: "ถามเพื่อนข้าง ๆ อย่างเดียว",
      D: "ข้ามการตรวจสอบถ้างานรีบ",
    },
  },
  {
    ...emptyQ(2),
    questionText: "เมื่อพบ NG ระหว่างการผลิต ควรทำอย่างไรเป็นอันดับแรก",
    correctAnswer: "B",
    choices: {
      A: "ปล่อยผ่านเพราะยังผลิตได้",
      B: "แยกงาน แจ้ง Leader และบันทึกตามระบบ",
      C: "นำไปใส่กล่องดีปนกัน",
      D: "รอให้ QA มาเจอเอง",
    },
  },
];

const emptyPart = (i = 1, starter = false) => ({
  id: uid(),
  partCode: `Part${String(i).padStart(2, "0")}`,
  partName: `Part ${i}`,
  subtitle: "ระบบข้อสอบออนไลน์พนักงาน",
  passScore: FIXED_PASS_SCORE,
  randomizeQuestions: false,
  showResultImmediately: true,
  questions: starter ? starterQs() : [emptyQ(1)],
});

const emptyModel = (i = 1, starter = false) => ({
  id: uid(),
  modelCode: `RG${String(i).padStart(2, "0")}`,
  modelName: `Model ${i}`,
  parts: [emptyPart(1, starter)],
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
          const rawQuestions = Array.isArray(part.questions) && part.questions.length
            ? part.questions
            : [emptyQ(1)];
          const contentQuestions = rawQuestions.filter(hasQuestionContent);
          const sourceQuestions = contentQuestions.length ? contentQuestions : [rawQuestions[0] || emptyQ(1)];
          const questions = reorder(
            sourceQuestions.map((q, qIndex) => ({
              ...emptyQ(qIndex + 1),
              ...q,
              id: q.id || uid(),
              score: FIXED_QUESTION_SCORE,
              choices: {
                A: q.choices?.A || "",
                B: q.choices?.B || "",
                C: q.choices?.C || "",
                D: q.choices?.D || "",
              },
            })),
          );

          return {
            ...emptyPart(partIndex + 1),
            ...part,
            id: part.id || uid(),
            partCode: part.partCode || `Part${String(partIndex + 1).padStart(2, "0")}`,
            partName: part.partName || `Part ${partIndex + 1}`,
            subtitle: part.subtitle || "ระบบข้อสอบออนไลน์พนักงาน",
            passScore: FIXED_PASS_SCORE,
            randomizeQuestions: Boolean(part.randomizeQuestions),
            showResultImmediately: part.showResultImmediately !== false,
            questions,
          };
        })
        .filter(Boolean);

      const safeParts = parts.length ? parts : [emptyPart(1)];

      return {
        id: model.id || uid(),
        modelCode: model.modelCode || `RG${String(modelIndex + 1).padStart(2, "0")}`,
        modelName: model.modelName || `Model ${modelIndex + 1}`,
        parts: safeParts,
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

const scoreLevels = [1, 2, 3, 4];
const defaultEvaluationItems = [
  { item: "การเตรียมตัวก่อนปฏิบัติงาน การเตรียมงานและเอกสารการทำงานให้พร้อมตาม WI และมาตรฐานที่กำหนด", method: "สังเกต", weight: 1 },
  { item: "ปริมาณงานและผลงานที่ทำได้ตามเป้าหมายของหน่วยงาน", method: "ตรวจงาน", weight: 3 },
  { item: "คุณภาพและความถูกต้องของผลงานที่ทำได้", method: "ประเมิน", weight: 5 },
  { item: "การเปลี่ยนแม่พิมพ์และการตรวจสอบ ความถูกต้องของผลงานที่ทำได้ รวมถึงการจัดการงาน NG", method: "สัมภาษณ์", weight: 6 },
];

const createEvaluationRows = () => defaultEvaluationItems.map((row, index) => ({
  id: uid(),
  no: index + 1,
  item: row.item,
  method: row.method,
  weight: row.weight,
  score: 0,
}));

const learningStatusMeta = {
  NOT_STARTED: { label: "ยังไม่สอบ", className: "status-neutral" },
  EXAM_NOT_PASSED: { label: "สอบไม่ผ่าน", className: "status-fail" },
  WAITING_EVALUATION: { label: "รอประเมิน", className: "status-warning" },
  COMPLETED: { label: "ผ่านครบ", className: "status-pass" },
};

const getLearningStatusSummary = ({ attempts = 0, passed = 0, passedParts = 0, evaluatedParts = 0 }) => {
  if (!attempts) return { key: "NOT_STARTED", ...learningStatusMeta.NOT_STARTED };
  if (!passed) return { key: "EXAM_NOT_PASSED", ...learningStatusMeta.EXAM_NOT_PASSED };
  if (passedParts > evaluatedParts) return { key: "WAITING_EVALUATION", ...learningStatusMeta.WAITING_EVALUATION };
  return { key: "COMPLETED", ...learningStatusMeta.COMPLETED };
};

const createEvaluationDraft = () => ({
  sectionTitle: "ส่วนที่ 1 : การปฏิบัติงาน และ ความร่วมมือ",
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
    title: "ประกาศต้อนรับพนักงานเข้าสู่ระบบข้อสอบ",
    summary: "ติดตามข่าวสารสำคัญ, ตารางสอบ, และประกาศจากหัวหน้างานได้ในหน้านี้",
    content: "ระบบนี้ใช้สำหรับทั้งการทำข้อสอบออนไลน์และการสื่อสารข่าวสารภายในหน่วยงาน ผู้ใช้สามารถเลือกเข้าอ่านประกาศล่าสุดหรือเริ่มทำข้อสอบได้ทันทีหลังล็อกอิน",
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

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const downloadExcelHtml = (filename, html) => {
  const blob = new Blob([`\uFEFF${html}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadJson = (filename, payload) => {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const deriveWeightedSkillSummary = (exam, evaluation) => {
  const examWeightedScore = exam?.fullScore
    ? Math.round((Number(exam.score || 0) / Number(exam.fullScore)) * SKILL_MATRIX_EXAM_WEIGHT)
    : 0;
  const evaluationWeightedScore = evaluation?.maxScore
    ? Math.round((Number(evaluation.totalScore || 0) / Number(evaluation.maxScore)) * SKILL_MATRIX_EVALUATION_WEIGHT)
    : 0;
  const combinedScore = examWeightedScore + evaluationWeightedScore;
  const combinedFullScore = SKILL_MATRIX_TOTAL_WEIGHT;
  const combinedPct = Math.round((combinedScore / combinedFullScore) * 100);
  const skillPct = combinedPct <= 25
    ? 0
    : combinedPct <= 50
      ? 50
      : combinedPct <= 75
        ? 75
        : 100;
  return {
    examWeightedScore,
    evaluationWeightedScore,
    combinedScore,
    combinedFullScore,
    combinedPct,
    skillPct,
  };
};

const skillCircleColor = (skillPct) => {
  if (skillPct >= 100) return "#16a34a";
  if (skillPct >= 75) return "#f59e0b";
  if (skillPct >= 25) return "#dc2626";
  return "transparent";
};

const openPrintDocument = (title, html) => {
  const popup = window.open("", "_blank", "width=1440,height=900");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html.replace("<title>Skill Matrix</title>", `<title>${escapeHtml(title)}</title>`));
  popup.document.close();
  popup.focus();
  popup.onload = () => {
    popup.print();
  };
};

const fetchImageAsDataUrl = async (imageUrl) => {
  if (!imageUrl) return "";
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
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
          subtitle: p.subtitle || "ระบบข้อสอบออนไลน์พนักงาน",
          passScore: FIXED_PASS_SCORE,
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
      subtitle: raw.subtitle || "ระบบข้อสอบออนไลน์พนักงาน",
      passScore: FIXED_PASS_SCORE,
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

const normalizeEmployees = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((employee) => ({
    id: employee.id,
    username: employee.username || employee.employee_code || employee.employeeCode || "",
    employeeCode: employee.employeeCode || employee.employee_code || "",
    fullName: employee.fullName || employee.full_name || employee.displayName || employee.username || employee.employee_code || employee.employeeCode || "",
    department: employee.department || "",
    position: employee.position || "",
    photoUrl: employee.photoUrl || employee.photo_url || "",
    role: employee.role || "USER",
    isActive: employee.isActive !== false && employee.is_active !== 0 && employee.is_active !== false,
    createdAt: employee.createdAt || employee.created_at || "",
    updatedAt: employee.updatedAt || employee.updated_at || "",
  }));
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
  const [builderModelId, setBuilderModelId] = useState(initialBank.models[0]?.id || null);
  const [builderPartId, setBuilderPartId] = useState(initialBank.models[0]?.parts[0]?.id || null);
  const [builderQId, setBuilderQId] = useState(null);
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
  const [skillMatrixEntries, setSkillMatrixEntries] = useState([]);
  const [skillMatrixStatus, setSkillMatrixStatus] = useState("idle");
  const [skillMatrixError, setSkillMatrixError] = useState("");
  const [skillMatrixModelFilter, setSkillMatrixModelFilter] = useState("ALL");
  const [skillMatrixSearch, setSkillMatrixSearch] = useState("");
  const [skillMatrixPartsPerPage, setSkillMatrixPartsPerPage] = useState(6);
  const [skillMatrixPartPage, setSkillMatrixPartPage] = useState(0);
  const skillMatrixWrapRef = useRef(null);
  const skillMatrixTopScrollRef = useRef(null);
  const skillMatrixScrollSyncingRef = useRef(false);
  const [skillMatrixScrollWidth, setSkillMatrixScrollWidth] = useState(0);
  const [dashboardModelFilter, setDashboardModelFilter] = useState("ALL");
  const [dashboardPartFilter, setDashboardPartFilter] = useState("ALL");
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState("ALL");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [employeeResultsEmployeeFilter, setEmployeeResultsEmployeeFilter] = useState("ALL");
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
                    weight: Number(defaultRow.weight || 0),
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
  const [builderServerUpdate, setBuilderServerUpdate] = useState(false);
  const [pendingBuilderBank, setPendingBuilderBank] = useState(null);
  const [builderQuestionSearch, setBuilderQuestionSearch] = useState("");
  const [builderSaveMessage, setBuilderSaveMessage] = useState({ type: "", text: "" });
  const builderQuestionRefs = useRef({});
  const builderQuestionChipRefs = useRef({});
  const suppressBuilderQuestionAutoScrollRef = useRef(false);
  const builderPendingSelectionRef = useRef(null);
  const [questionShuffleSeed, setQuestionShuffleSeed] = useState(0);
  const lastTabSessionKeyRef = useRef("");
  const examSelectionTouchedRef = useRef(false);
  const currentBuilderModelIdRef = useRef(null);
  const currentBuilderPartIdRef = useRef(null);
  const currentBuilderQIdRef = useRef(null);

  const isAdmin = session?.role === "ADMIN";

  useEffect(() => {
    currentBuilderModelIdRef.current = builderModelId;
    currentBuilderPartIdRef.current = builderPartId;
    currentBuilderQIdRef.current = builderQId;
  }, [builderModelId, builderPartId, builderQId]);

  useEffect(() => {
    if (!session) return;
    const nextSessionKey = `${session.token || ""}:${session.role || ""}`;
    if (lastTabSessionKeyRef.current === nextSessionKey) return;
    lastTabSessionKeyRef.current = nextSessionKey;
    setActiveTab(isAdmin ? "builder" : "preview");
    setEntryPoint(isAdmin ? "portal" : "exam");
  }, [session, isAdmin]);

  useEffect(() => {
    if (!session || isAdmin) return;
    if (entryPoint !== "exam") {
      setEntryPoint("exam");
    }
  }, [session, isAdmin, entryPoint]);

  useEffect(() => {
    try {
      localStorage.setItem(EVALUATION_DRAFT_KEY, JSON.stringify(evaluationForm));
    } catch {
      // Ignore storage restrictions in locked-down browsers.
    }
  }, [evaluationForm]);

  useEffect(() => {
    setBuilderSaveMessage({ type: "", text: "" });
  }, [bank, builderModelId, builderPartId]);

  useEffect(() => {
    if (!session) {
      lastTabSessionKeyRef.current = "";
      setCandidateName("");
      setCandidateCode("");
      return;
    }

    if (session.role === "ADMIN") return;

    setCandidateName(session.displayName || session.username || "");
    setCandidateCode(session.employeeCode || "");
  }, [session]);

  useEffect(() => {
    if (!session?.employeeCode || isAdmin || !modelId || !partId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(EXAM_SELECTION_KEY) || "{}");
      localStorage.setItem(EXAM_SELECTION_KEY, JSON.stringify({
        ...saved,
        [session.employeeCode]: { modelId, partId },
      }));
    } catch {
      // Ignore storage restrictions in locked-down browsers.
    }
  }, [session?.employeeCode, isAdmin, modelId, partId]);

  const applySharedData = useCallback((nextBank, nextResults, nextNews, preserveSelection = false) => {
    setBank(nextBank);
    setResultHistory(nextResults);
    setNewsItems(nextNews);
    lastSyncedBankRef.current = JSON.stringify(nextBank);
    setBuilderServerUpdate(false);
    setPendingBuilderBank(null);

    if (!preserveSelection) {
      let defaultModel = nextBank.models[0] || null;
      let defaultPart = defaultModel?.parts?.[0] || null;

      if (!isAdmin && session?.employeeCode) {
        try {
          const saved = JSON.parse(localStorage.getItem(EXAM_SELECTION_KEY) || "{}");
          const employeeSelection = saved?.[session.employeeCode];
          const savedModel = nextBank.models.find((entry) => entry.id === employeeSelection?.modelId) || null;
          const savedPart = savedModel?.parts?.find((entry) => entry.id === employeeSelection?.partId) || null;
          if (savedModel && savedPart) {
            defaultModel = savedModel;
            defaultPart = savedPart;
          }
        } catch {
          // Ignore storage restrictions in locked-down browsers.
        }
      }

      setModelId(defaultModel?.id || null);
      setPartId(defaultPart?.id || null);
      return;
    }

    const activeBuilderModelId = currentBuilderModelIdRef.current;
    const activeBuilderPartId = currentBuilderPartIdRef.current;
    const activeBuilderQId = currentBuilderQIdRef.current;
    const selectedBuilderModel = nextBank.models.find((entry) => entry.id === activeBuilderModelId) || nextBank.models[0];
    const selectedBuilderPart = selectedBuilderModel?.parts.find((entry) => entry.id === activeBuilderPartId) || selectedBuilderModel?.parts[0];
    const selectedBuilderQuestion = selectedBuilderPart?.questions.find((entry) => entry.id === activeBuilderQId) || selectedBuilderPart?.questions[0] || null;
    setBuilderModelId(selectedBuilderModel?.id || null);
    setBuilderPartId(selectedBuilderPart?.id || null);
    setBuilderQId(selectedBuilderQuestion?.id || null);
  }, [isAdmin, session?.employeeCode]);

  const fetchSharedData = useCallback(async (activeSession, preserveSelection = false) => {
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
  }, [applySharedData]);

  useEffect(() => {
    let ignore = false;

    const hydrateSession = async () => {
      let nextSession = session;
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
        nextSession = normalizeSession(await authRes.json());
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
        await fetchSharedData(nextSession, examSelectionTouchedRef.current || Boolean(modelId || partId));
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
  }, [fetchSharedData, session]);

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
  }, [dataReady, entryPoint, fetchSharedData, isAdmin, modelId, partId, session]);

  const selectedModel = useMemo(() => bank.models.find((m) => m.id === modelId) || null, [bank.models, modelId]);
  const model = useMemo(() => selectedModel || bank.models[0] || null, [bank.models, selectedModel]);
  const selectedPart = useMemo(() => model?.parts.find((p) => p.id === partId) || null, [model, partId]);
  const part = useMemo(() => selectedPart || model?.parts[0] || null, [model, selectedPart]);
  const selectedBuilderModel = useMemo(() => bank.models.find((m) => m.id === builderModelId) || null, [bank.models, builderModelId]);
  const builderModel = useMemo(() => selectedBuilderModel || bank.models[0] || null, [bank.models, selectedBuilderModel]);
  const selectedBuilderPart = useMemo(() => builderModel?.parts.find((p) => p.id === builderPartId) || null, [builderModel, builderPartId]);
  const builderPart = useMemo(() => selectedBuilderPart || builderModel?.parts[0] || null, [builderModel, selectedBuilderPart]);
  const selectedBuilderQuestion = useMemo(() => builderPart?.questions.find((q) => q.id === builderQId) || null, [builderPart, builderQId]);
  const builderQuestion = useMemo(() => selectedBuilderQuestion || builderPart?.questions[0] || null, [builderPart, selectedBuilderQuestion]);
  const effectiveSyncStatus = syncStatus === "loading" && dataReady ? "synced" : syncStatus;
  const syncStatusLabel = effectiveSyncStatus === "saving"
    ? "Saving..."
    : effectiveSyncStatus === "offline"
      ? "Server Offline"
      : effectiveSyncStatus === "loading"
        ? "Loading..."
        : "Server Synced";
  const filteredBuilderQuestions = useMemo(() => {
    const keyword = builderQuestionSearch.trim().toLowerCase();
    if (!builderPart?.questions?.length) return [];
    if (!keyword) return builderPart.questions;
    return builderPart.questions.filter((entry, index) => {
      const haystack = [
        `ข้อ ${index + 1}`,
        entry.questionText,
        entry.choices?.A,
        entry.choices?.B,
        entry.choices?.C,
        entry.choices?.D,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [builderPart, builderQuestionSearch]);

  const queueBuilderSelection = useCallback((nextModelId, nextPartId, nextQuestionId) => {
    builderPendingSelectionRef.current = {
      modelId: nextModelId || null,
      partId: nextPartId || null,
      qId: nextQuestionId || null,
    };
  }, []);

  const applyBuilderSelection = useCallback((nextModelId, nextPartId, nextQuestionId) => {
    currentBuilderModelIdRef.current = nextModelId || null;
    currentBuilderPartIdRef.current = nextPartId || null;
    currentBuilderQIdRef.current = nextQuestionId || null;
    setBuilderModelId(nextModelId || null);
    setBuilderPartId(nextPartId || null);
    setBuilderQId(nextQuestionId || null);
    queueBuilderSelection(nextModelId, nextPartId, nextQuestionId);
  }, [queueBuilderSelection]);

  useEffect(() => {
    const pendingSelection = builderPendingSelectionRef.current;
    if (!pendingSelection) return;

    const selectedModel = bank.models.find((entry) => entry.id === pendingSelection.modelId);
    if (!selectedModel) return;

    const selectedPart = selectedModel.parts.find((entry) => entry.id === pendingSelection.partId) || selectedModel.parts[0] || null;
    const selectedQuestion = selectedPart?.questions.find((entry) => entry.id === pendingSelection.qId) || selectedPart?.questions[0] || null;

    if (builderModelId !== selectedModel.id) setBuilderModelId(selectedModel.id);
    if ((selectedPart?.id || null) !== builderPartId) setBuilderPartId(selectedPart?.id || null);
    if ((selectedQuestion?.id || null) !== builderQId) setBuilderQId(selectedQuestion?.id || null);

    builderPendingSelectionRef.current = null;
  }, [bank, builderModelId, builderPartId, builderQId]);

  useEffect(() => {
    if (builderPendingSelectionRef.current) return;
    if (!selectedBuilderModel && bank.models.length) {
      setBuilderModelId(bank.models[0].id);
      return;
    }
    if (selectedBuilderModel && builderModel && builderModel.id !== builderModelId) {
      setBuilderModelId(builderModel.id);
      setBuilderPartId(builderModel.parts[0]?.id || null);
    }
  }, [bank.models, builderModel, builderModelId, selectedBuilderModel]);

  useEffect(() => {
    if (builderPendingSelectionRef.current) return;
    if (builderModel && !selectedBuilderPart) setBuilderPartId(builderModel.parts[0]?.id || null);
  }, [builderModel, builderPartId, selectedBuilderPart]);
  useEffect(() => {
    if (builderPendingSelectionRef.current) return;
    if (builderPart && !selectedBuilderQuestion) setBuilderQId(builderPart.questions[0]?.id || null);
  }, [builderPart, builderQId, selectedBuilderQuestion]);
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
    setQuestionShuffleSeed((seed) => seed + 1);
  }, [modelId, partId]);
  useEffect(() => {
    if (!builderQId) return;
    const chipTimer = setTimeout(() => {
      builderQuestionChipRefs.current[builderQId]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 40);
    if (suppressBuilderQuestionAutoScrollRef.current) {
      suppressBuilderQuestionAutoScrollRef.current = false;
      return () => clearTimeout(chipTimer);
    }
    const timer = setTimeout(() => {
      builderQuestionRefs.current[builderQId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => {
      clearTimeout(chipTimer);
      clearTimeout(timer);
    };
  }, [builderQId]);

  const builderScoreFull = full(builderPart?.questions || []);
  const scoreFull = full(part?.questions || []);
  const answered = Object.keys(answers).length;
  const progress = part?.questions.length ? Math.round((answered / part.questions.length) * 100) : 0;

  const previewQs = useMemo(() => {
    const src = [...(part?.questions || [])];
    if (!part?.randomizeQuestions) return src;
    return src
      .map((entry) => ({
        question: entry,
        rank: shuffleRank(`${part.id}:${questionShuffleSeed}:${entry.id}`),
      }))
      .sort((left, right) => left.rank - right.rank)
      .map((entry, index) => ({ ...entry.question, questionNo: index + 1 }));
  }, [part, questionShuffleSeed]);

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
    () => employees.filter((employee) => employee.isActive !== false),
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
  const evaluationHistoryEvaluatorOptions = useMemo(() => {
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

  const employeeResultOptions = useMemo(() => {
    const map = new Map();
    employees.forEach((employee) => {
      const code = employee.employeeCode || "";
      if (!code) return;
      map.set(code, {
        candidateCode: code,
        candidateName: employee.fullName || employee.displayName || code,
      });
    });
    resultHistory.forEach((entry) => {
      const code = entry.candidateCode || entry.employeeCode || "";
      if (!code || map.has(code)) return;
      map.set(code, {
        candidateCode: code,
        candidateName: entry.candidateName || entry.employeeName || code,
      });
    });
    return Array.from(map.values()).sort((a, b) => a.candidateName.localeCompare(b.candidateName, "th"));
  }, [employees, resultHistory]);

  const employeeResultSummaries = useMemo(() => {
    const map = new Map();
    employees.forEach((employee) => {
      const code = employee.employeeCode || "";
      if (!code) return;
      map.set(code, {
        candidateCode: code,
        candidateName: employee.fullName || employee.displayName || code,
        attempts: 0,
        passed: 0,
        scorePctSum: 0,
        latestSubmittedAt: "",
        latestStatus: "-",
        latestModelPart: "-",
        passedParts: 0,
        evaluatedParts: 0,
        department: employee.department || "",
        position: employee.position || "",
      });
    });
    resultHistory.forEach((entry) => {
      const key = entry.candidateCode || entry.employeeCode || entry.id;
      const prev = map.get(key) || {
        candidateCode: entry.candidateCode || entry.employeeCode || "-",
        candidateName: entry.candidateName || entry.employeeName || "-",
        attempts: 0,
        passed: 0,
        scorePctSum: 0,
        latestSubmittedAt: "",
        latestStatus: "-",
        latestModelPart: "-",
        passedParts: 0,
        evaluatedParts: 0,
        department: "",
        position: "",
      };
      prev.attempts += 1;
      prev.passed += entry.status === "PASS" ? 1 : 0;
      prev.scorePctSum += entry.fullScore ? (entry.score / entry.fullScore) * 100 : 0;
      if (!prev.latestSubmittedAt || new Date(entry.submittedAt).getTime() > new Date(prev.latestSubmittedAt).getTime()) {
        prev.latestSubmittedAt = entry.submittedAt;
        prev.latestStatus = entry.status;
        prev.latestModelPart = [entry.modelCode, entry.partCode].filter(Boolean).join("/") || "-";
        prev.candidateName = entry.candidateName || entry.employeeName || prev.candidateName;
      }
      map.set(key, prev);
    });

    const passedPartsByEmployee = new Map();
    resultHistory
      .filter((entry) => entry.status === "PASS")
      .forEach((entry) => {
        const code = entry.candidateCode || entry.employeeCode || "";
        if (!code) return;
        const partKey = entry.partId || [entry.modelCode, entry.partCode].join("__");
        if (!passedPartsByEmployee.has(code)) passedPartsByEmployee.set(code, new Set());
        passedPartsByEmployee.get(code).add(partKey);
      });

    const evaluatedPartsByEmployee = new Map();
    evaluationHistory.forEach((entry) => {
      const code = entry.employeeCode || "";
      if (!code) return;
      const partKey = entry.partId || [entry.modelCode, entry.partCode].join("__");
      if (!evaluatedPartsByEmployee.has(code)) evaluatedPartsByEmployee.set(code, new Set());
      evaluatedPartsByEmployee.get(code).add(partKey);
    });

    return Array.from(map.values())
      .map((entry) => {
        const passedParts = passedPartsByEmployee.get(entry.candidateCode)?.size || 0;
        const evaluatedParts = evaluatedPartsByEmployee.get(entry.candidateCode)?.size || 0;
        const learningStatus = getLearningStatusSummary({
          attempts: entry.attempts,
          passed: entry.passed,
          passedParts,
          evaluatedParts,
        });
        return {
          ...entry,
          passedParts,
          evaluatedParts,
          avgPct: entry.attempts ? Math.round(entry.scorePctSum / entry.attempts) : 0,
          passRate: entry.attempts ? Math.round((entry.passed / entry.attempts) * 100) : 0,
          learningStatusKey: learningStatus.key,
          learningStatusLabel: learningStatus.label,
          learningStatusClassName: learningStatus.className,
        };
      })
      .filter((entry) => {
        if (employeeResultsEmployeeFilter !== "ALL" && entry.candidateCode !== employeeResultsEmployeeFilter) return false;
        if (employeeResultsStatusFilter !== "ALL" && entry.learningStatusKey !== employeeResultsStatusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const aTime = a.latestSubmittedAt ? new Date(a.latestSubmittedAt).getTime() : 0;
        const bTime = b.latestSubmittedAt ? new Date(b.latestSubmittedAt).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return a.candidateName.localeCompare(b.candidateName, "th");
      });
  }, [employees, resultHistory, evaluationHistory, employeeResultsEmployeeFilter, employeeResultsStatusFilter]);

  const selectedEmployeeResults = useMemo(
    () => resultHistory
      .filter((entry) => (entry.candidateCode || entry.employeeCode) === selectedEmployeeResultCode)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [resultHistory, selectedEmployeeResultCode],
  );

  const selectedEmployeeSummary = useMemo(
    () => employeeResultSummaries.find((entry) => entry.candidateCode === selectedEmployeeResultCode) || null,
    [employeeResultSummaries, selectedEmployeeResultCode],
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
      const learningStatus = getLearningStatusSummary({
        attempts: exam ? 1 : 0,
        passed: exam?.status === "PASS" ? 1 : 0,
        passedParts: exam?.status === "PASS" ? 1 : 0,
        evaluatedParts: evaluation ? 1 : 0,
      });
      const weighted = deriveWeightedSkillSummary(exam, evaluation);
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
        combinedScore: weighted.combinedScore,
        combinedFullScore: weighted.combinedFullScore,
        combinedPct: weighted.combinedPct,
        evaluator: evaluation?.evaluator || "-",
        comparedAt: evaluation?.createdAt || exam?.submittedAt || "",
        learningStatusLabel: learningStatus.label,
        learningStatusClassName: learningStatus.className,
      };
    }).sort((a, b) => a.partCode.localeCompare(b.partCode, "th"));
  }, [selectedEmployeeResultCode, selectedEmployeeResults, evaluationHistory]);

  const skillMatrixParts = useMemo(
    () => bank.models.flatMap((entry) => entry.parts.map((partEntry) => ({
      id: partEntry.id,
      modelCode: entry.modelCode,
      modelName: entry.modelName,
      partCode: partEntry.partCode,
      partName: partEntry.partName,
    }))),
    [bank.models],
  );

  const skillMatrixModelOptions = useMemo(
    () => bank.models.map((entry) => ({
      modelCode: entry.modelCode,
      modelName: entry.modelName,
      partCount: Array.isArray(entry.parts) ? entry.parts.length : 0,
    })),
    [bank.models],
  );

  const filteredSkillMatrixParts = useMemo(
    () => (
      (skillMatrixModelFilter === "ALL"
        ? skillMatrixParts
        : skillMatrixParts.filter((entry) => entry.modelCode === skillMatrixModelFilter))
        .filter((entry) => {
          const keyword = skillMatrixSearch.trim().toLowerCase();
          if (!keyword) return true;
          return [
            entry.modelCode,
            entry.modelName,
            entry.partCode,
            entry.partName,
          ].some((value) => String(value || "").toLowerCase().includes(keyword));
        })
    ),
    [skillMatrixModelFilter, skillMatrixParts, skillMatrixSearch],
  );

  const skillMatrixPartPageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredSkillMatrixParts.length / skillMatrixPartsPerPage)),
    [filteredSkillMatrixParts.length, skillMatrixPartsPerPage],
  );

  const visibleSkillMatrixParts = useMemo(
    () => filteredSkillMatrixParts.slice(
      skillMatrixPartPage * skillMatrixPartsPerPage,
      (skillMatrixPartPage * skillMatrixPartsPerPage) + skillMatrixPartsPerPage,
    ),
    [filteredSkillMatrixParts, skillMatrixPartPage, skillMatrixPartsPerPage],
  );

  useEffect(() => {
    setSkillMatrixPartPage(0);
  }, [skillMatrixModelFilter, skillMatrixSearch, skillMatrixPartsPerPage]);

  useEffect(() => {
    if (skillMatrixPartPage > skillMatrixPartPageCount - 1) {
      setSkillMatrixPartPage(Math.max(0, skillMatrixPartPageCount - 1));
    }
  }, [skillMatrixPartPage, skillMatrixPartPageCount]);

  const skillMatrixEntryMap = useMemo(() => {
    const map = new Map();
    skillMatrixEntries.forEach((entry) => {
      map.set(`${entry.employeeId}::${entry.partId}`, entry);
    });
    return map;
  }, [skillMatrixEntries]);

  const skillMatrixDerivedMap = useMemo(() => {
    const examByEmployeePart = new Map();
    resultHistory
      .slice()
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .forEach((entry) => {
        const employeeCode = entry.candidateCode || entry.employeeCode || "";
        const partKey = entry.partId || [entry.modelCode, entry.partCode].join("__");
        const mapKey = `${employeeCode}::${partKey}`;
        if (!employeeCode || examByEmployeePart.has(mapKey)) return;
        examByEmployeePart.set(mapKey, entry);
      });

    const evaluationByEmployeePart = new Map();
    evaluationHistory
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .forEach((entry) => {
        const employeeCode = entry.employeeCode || "";
        const partKey = entry.partId || [entry.modelCode, entry.partCode].join("__");
        const mapKey = `${employeeCode}::${partKey}`;
        if (!employeeCode || evaluationByEmployeePart.has(mapKey)) return;
        evaluationByEmployeePart.set(mapKey, entry);
      });

    const output = new Map();
    const allKeys = new Set([...examByEmployeePart.keys(), ...evaluationByEmployeePart.keys()]);
    allKeys.forEach((key) => {
      const exam = examByEmployeePart.get(key) || null;
      const evaluation = evaluationByEmployeePart.get(key) || null;
      const weighted = deriveWeightedSkillSummary(exam, evaluation);
      output.set(key, {
        combinedScore: weighted.combinedScore,
        combinedFullScore: weighted.combinedFullScore,
        combinedPct: weighted.combinedPct,
        skillPct: weighted.skillPct,
      });
    });
    return output;
  }, [resultHistory, evaluationHistory]);

  const syncSkillMatrixScrollMetrics = useCallback(() => {
    const wrap = skillMatrixWrapRef.current;
    if (!wrap) return;
    setSkillMatrixScrollWidth(wrap.scrollWidth);
  }, []);

  const skillMatrixTableWidth = useMemo(
    () => Math.max(1400, 390 + (visibleSkillMatrixParts.length * 190)),
    [visibleSkillMatrixParts.length],
  );

  useEffect(() => {
    syncSkillMatrixScrollMetrics();
    const handleResize = () => syncSkillMatrixScrollMetrics();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncSkillMatrixScrollMetrics, skillMatrixParts.length, activeEmployees.length, entryPoint]);

  const syncSkillMatrixScrollPosition = useCallback((source) => {
    const wrap = skillMatrixWrapRef.current;
    const topScroll = skillMatrixTopScrollRef.current;
    if (!wrap || !topScroll || skillMatrixScrollSyncingRef.current) return;
    skillMatrixScrollSyncingRef.current = true;
    if (source === "top") {
      wrap.scrollLeft = topScroll.scrollLeft;
    } else {
      topScroll.scrollLeft = wrap.scrollLeft;
    }
    window.requestAnimationFrame(() => {
      skillMatrixScrollSyncingRef.current = false;
    });
  }, []);

  const selectedEmployeeAttemptChart = useMemo(() => (
    selectedEmployeeResults
      .slice()
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(-8)
      .map((entry, index) => ({
        id: entry.id || `${entry.partId || entry.partCode}-${index}`,
        label: entry.partCode || `ครั้งที่ ${index + 1}`,
        pct: entry.fullScore ? Math.round((entry.score / entry.fullScore) * 100) : 0,
        raw: `${entry.score}/${entry.fullScore}`,
        status: entry.status,
      }))
  ), [selectedEmployeeResults]);

  const selectedEmployeePartChart = useMemo(() => (
    selectedEmployeePartComparison.map((entry) => ({
      key: entry.key,
      label: `${entry.partCode} - ${entry.partName}`,
      examPct: entry.examFullScore ? Math.round((entry.examScore / entry.examFullScore) * 100) : 0,
      evaluationPct: entry.evaluationMaxScore ? Math.round((entry.evaluationScore / entry.evaluationMaxScore) * 100) : 0,
      combinedPct: entry.combinedFullScore ? Math.round((entry.combinedScore / entry.combinedFullScore) * 100) : 0,
      combinedRaw: entry.combinedFullScore ? `${entry.combinedScore}/${entry.combinedFullScore}` : "-",
    }))
  ), [selectedEmployeePartComparison]);

  const selectedEmployeeAttemptTrend = useMemo(() => {
    if (!selectedEmployeeAttemptChart.length) return { points: "", areaPoints: "", labels: [] };
    const width = 560;
    const height = 220;
    const bottom = 190;
    const left = 28;
    const usableWidth = width - left * 2;
    const step = selectedEmployeeAttemptChart.length > 1 ? usableWidth / (selectedEmployeeAttemptChart.length - 1) : 0;
    const coords = selectedEmployeeAttemptChart.map((entry, index) => {
      const x = left + step * index;
      const y = bottom - (entry.pct / 100) * 150;
      return { ...entry, x, y };
    });
    const points = coords.map((entry) => `${entry.x},${entry.y}`).join(" ");
    const areaPoints = [`${left},${bottom}`, ...coords.map((entry) => `${entry.x},${entry.y}`), `${left + step * (coords.length - 1 || 0)},${bottom}`].join(" ");
    return { points, areaPoints, labels: coords };
  }, [selectedEmployeeAttemptChart]);

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
        setEmployees(normalizeEmployees(data));
        setEmployeeStatus("ready");
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setEmployeeStatus("error");
          setEmployeeError("โหลดรายชื่อพนักงานไม่สำเร็จ");
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
          setEvaluationError("โหลดประวัติผลประเมินไม่สำเร็จ");
        }
      }
    };

    fetchEvaluations();
    return () => { ignore = true; };
  }, [isAdmin, session]);

  useEffect(() => {
    let ignore = false;

    const fetchSkillMatrix = async () => {
      if (!session?.token || !isAdmin) {
        setSkillMatrixEntries([]);
        return;
      }

      try {
        setSkillMatrixStatus("loading");
        const res = await fetch(`${API_BASE}/skill-matrix`, {
          headers: authHeaders(session),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (ignore) return;
        setSkillMatrixEntries(Array.isArray(data) ? data : []);
        setSkillMatrixStatus("ready");
      } catch (error) {
        console.error(error);
        if (!ignore) {
          setSkillMatrixStatus("error");
          setSkillMatrixError("โหลดข้อมูล Skill Matrix ไม่สำเร็จ");
        }
      }
    };

    fetchSkillMatrix();
    return () => { ignore = true; };
  }, [isAdmin, session]);

  useEffect(() => {
    if (!dataReady || !session?.token || !isAdmin) return;

    const shouldRefreshSharedData = ["portal", "news", "scores", "score-charts", "skill-matrix"].includes(entryPoint) || ["employee-results", "dashboard", "evaluation", "preview", "importexport"].includes(activeTab);
    const shouldRefreshEmployees = ["scores", "score-charts", "skill-matrix"].includes(entryPoint) || ["employees", "evaluation", "employee-results"].includes(activeTab);
    const shouldRefreshEvaluations = ["scores", "score-charts"].includes(entryPoint) || ["evaluation", "employee-results"].includes(activeTab);
    const shouldRefreshSkillMatrix = entryPoint === "skill-matrix";
    if (!shouldRefreshSharedData && !shouldRefreshEmployees && !shouldRefreshEvaluations && !shouldRefreshSkillMatrix) return;

    let ignore = false;

    const refreshAdminViews = async () => {
      const tasks = [];

      if (shouldRefreshSharedData) {
        tasks.push(
          fetchSharedData(session, true).catch((error) => {
            console.error(error);
            if (!ignore) setSyncStatus("offline");
          }),
        );
      }

      if (shouldRefreshEmployees) {
        if (!ignore) setEmployeeStatus("loading");
        tasks.push((async () => {
          const employeesRes = await fetch(`${API_BASE}/employees`, {
            headers: authHeaders(session),
          });
          if (!employeesRes.ok) throw new Error(`HTTP ${employeesRes.status}`);
          const employeesData = await employeesRes.json();
          if (ignore) return;
          setEmployees(normalizeEmployees(employeesData));
          setEmployeeError("");
          setEmployeeStatus("ready");
        })().catch((error) => {
          console.error(error);
          if (!ignore) {
            setEmployeeStatus("error");
            setEmployeeError("โหลดรายชื่อพนักงานไม่สำเร็จ");
          }
        }));
      }

      if (shouldRefreshEvaluations) {
        if (!ignore) setEvaluationStatus("loading");
        tasks.push((async () => {
          const evaluationsRes = await fetch(`${API_BASE}/evaluations`, {
            headers: authHeaders(session),
          });
          if (!evaluationsRes.ok) throw new Error(`HTTP ${evaluationsRes.status}`);
          const evaluationsData = await evaluationsRes.json();
          if (ignore) return;
          setEvaluationHistory(Array.isArray(evaluationsData) ? evaluationsData : []);
          setEvaluationError("");
          setEvaluationStatus("ready");
        })().catch((error) => {
          console.error(error);
          if (!ignore) {
            setEvaluationStatus("error");
            setEvaluationError("โหลดประวัติผลประเมินไม่สำเร็จ");
          }
        }));
      }

      if (shouldRefreshSkillMatrix) {
        if (!ignore) setSkillMatrixStatus("loading");
        tasks.push((async () => {
          const skillMatrixRes = await fetch(`${API_BASE}/skill-matrix`, {
            headers: authHeaders(session),
          });
          if (!skillMatrixRes.ok) throw new Error(`HTTP ${skillMatrixRes.status}`);
          const skillMatrixData = await skillMatrixRes.json();
          if (ignore) return;
          setSkillMatrixEntries(Array.isArray(skillMatrixData) ? skillMatrixData : []);
          setSkillMatrixError("");
          setSkillMatrixStatus("ready");
        })().catch((error) => {
          console.error(error);
          if (!ignore) {
            setSkillMatrixStatus("error");
            setSkillMatrixError("โหลดข้อมูล Skill Matrix ไม่สำเร็จ");
          }
        }));
      }

      await Promise.allSettled(tasks);
    };

    refreshAdminViews();
    const timer = setInterval(refreshAdminViews, 15000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [dataReady, session, isAdmin, entryPoint, activeTab, modelId, partId, fetchSharedData]);

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

  const reloadBuilderFromServer = useCallback(() => {
    if (!pendingBuilderBank) return;
    setBank(pendingBuilderBank);
    applyBuilderSelection(
      pendingBuilderBank.models[0]?.id || null,
      pendingBuilderBank.models[0]?.parts[0]?.id || null,
      pendingBuilderBank.models[0]?.parts[0]?.questions[0]?.id || null,
    );
    lastSyncedBankRef.current = JSON.stringify(pendingBuilderBank);
    setBuilderServerUpdate(false);
    setPendingBuilderBank(null);
    setSyncStatus("synced");
  }, [applyBuilderSelection, pendingBuilderBank]);

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
      photoUrl: employee.photoUrl || "",
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
      photoUrl: employeeForm.photoUrl.trim(),
      role: employeeForm.role,
      isActive: Boolean(employeeForm.isActive),
    };

    if (!payload.employeeCode || !payload.fullName) {
      setEmployeeError("กรุณากรอกข้อมูลพนักงานให้ครบ");
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
      setEmployeeError(error.message || "บันทึกข้อมูลพนักงานไม่สำเร็จ");
    }
  };

  const removeEmployee = async (employee) => {
    if (!window.confirm(`ต้องการลบพนักงาน ${employee.fullName} ใช่หรือไม่`)) return;

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
      setEmployeeError(error.message || "ลบข้อมูลพนักงานไม่สำเร็จ");
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

  const patchModel = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id === builderModelId ? { ...m, [f]: v } : m)) }));
  const patchPart = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id === builderPartId ? { ...p, [f]: v } : p)) })) }));
  const patchQ = (id, patch) => setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id !== builderPartId ? p : { ...p, questions: p.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })) })) }));
  const patchChoice = (id, key, value, sourceChoices) => patchQ(id, { choices: { ...(sourceChoices || {}), [key]: value } });
  const isBankStructurallyValid = useCallback((candidateBank) => {
    const models = Array.isArray(candidateBank?.models) ? candidateBank.models : [];
    if (!models.length) return false;
    return models.every((candidateModel) => {
      const parts = Array.isArray(candidateModel?.parts) ? candidateModel.parts : [];
      if (!parts.length) return false;
      return parts.every((candidatePart) => Array.isArray(candidatePart?.questions) && candidatePart.questions.length > 0);
    });
  }, []);

  const addModel = (event) => {
    event?.preventDefault?.();
    const n = emptyModel(bank.models.length + 1, false);
    const nextBank = { ...bank, models: [...bank.models, n] };
    setBank(nextBank);
    applyBuilderSelection(n.id, n.parts[0].id, n.parts[0].questions[0].id);
    setBuilderQuestionSearch("");
    void saveLocal({ silent: true, bankOverride: nextBank });
  };

  const removeModel = () => {
    if (bank.models.length <= 1) return alert("ต้องมีอย่างน้อย 1 Model");
    const remaining = bank.models.filter((m) => m.id !== builderModel?.id);
    const nextBank = { ...bank, models: remaining };
    setBank(nextBank);
    applyBuilderSelection(remaining[0].id, remaining[0].parts[0].id, remaining[0].parts[0].questions[0]?.id || null);
    void saveLocal({ silent: true, bankOverride: nextBank });
  };

  const addPart = (event) => {
    event?.preventDefault?.();
    if (builderModel.parts.length >= 20) return alert("1 Model เพิ่มได้สูงสุด 20 Part");
    const n = emptyPart(builderModel.parts.length + 1, false);
    const nextBank = {
      ...bank,
      models: bank.models.map((m) => (m.id === builderModelId ? { ...m, parts: [...m.parts, n] } : m)),
    };
    setBank(nextBank);
    applyBuilderSelection(builderModelId, n.id, n.questions[0].id);
    setBuilderQuestionSearch("");
    void saveLocal({ silent: true, bankOverride: nextBank });
  };

  const uploadEmployeePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setEmployeeForm((prev) => ({ ...prev, photoUrl: String(e.target?.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const removePart = () => {
    if (builderModel.parts.length <= 1) return alert("ต้องมีอย่างน้อย 1 Part ต่อ Model");
    const remaining = builderModel.parts.filter((p) => p.id !== builderPart.id);
    const nextBank = {
      ...bank,
      models: bank.models.map((m) => (m.id === builderModelId ? { ...m, parts: remaining } : m)),
    };
    setBank(nextBank);
    applyBuilderSelection(builderModelId, remaining[0].id, remaining[0].questions[0]?.id || null);
    void saveLocal({ silent: true, bankOverride: nextBank });
  };
  const addQ = (event) => {
    event?.preventDefault?.();
    const n = emptyQ(builderPart.questions.length + 1);
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id === builderPartId ? { ...p, questions: [...p.questions, n] } : p)) })) }));
    suppressBuilderQuestionAutoScrollRef.current = true;
    queueBuilderSelection(builderModelId, builderPartId, n.id);
    setBuilderQuestionSearch("");
  };

  const dupQ = (sourceQuestion = builderQuestion) => {
    if (!sourceQuestion) return;
    const n = { ...sourceQuestion, id: uid(), questionNo: builderPart.questions.length + 1 };
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id === builderPartId ? { ...p, questions: reorder([...p.questions, n]) } : p)) })) }));
    suppressBuilderQuestionAutoScrollRef.current = true;
    queueBuilderSelection(builderModelId, builderPartId, n.id);
    setBuilderQuestionSearch("");
  };

  const delQ = (questionId = builderQuestion?.id) => {
    if (!questionId) return;
    const remaining = reorder(builderPart.questions.filter((q) => q.id !== questionId));
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id === builderPartId ? { ...p, questions: remaining } : p)) })) }));
    queueBuilderSelection(builderModelId, builderPartId, remaining[0]?.id || null);
  };

  const moveQ = (d, questionId = builderQuestion?.id) => {
    if (!questionId) return;
    const i = builderPart.questions.findIndex((q) => q.id === questionId);
    const ni = i + d;
    if (ni < 0 || ni >= builderPart.questions.length) return;
    const arr = [...builderPart.questions];
    [arr[i], arr[ni]] = [arr[ni], arr[i]];
    setBank((b) => ({ ...b, models: b.models.map((m) => (m.id !== builderModelId ? m : { ...m, parts: m.parts.map((p) => (p.id === builderPartId ? { ...p, questions: reorder(arr) } : p)) })) }));
    queueBuilderSelection(builderModelId, builderPartId, questionId);
  };

  const jumpQuestion = (direction) => {
    if (!builderPart?.questions?.length || !builderQuestion) return;
    const currentIndex = builderPart.questions.findIndex((entry) => entry.id === builderQuestion.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= builderPart.questions.length) return;
    setBuilderQId(builderPart.questions[nextIndex].id);
  };

  const uploadImg = (file, questionId = builderQuestion?.id) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = (e) => patchQ(questionId, { imageUrl: String(e.target?.result || "") });
    r.readAsDataURL(file);
  };

  const login = async (e) => {
    e.preventDefault();
    const employeeCode = loginForm.employeeCode.trim();

    if (!employeeCode) return setLoginError("กรุณากรอกรหัสพนักงาน");

    try {
      setLoginError("");
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");

      const nextSession = normalizeSession(data);
      if (!nextSession) throw new Error("เข้าสู่ระบบไม่สำเร็จ");

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
      setLoginError(error.message || "เข้าสู่ระบบไม่สำเร็จ");
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
    if (answered < part.questions.length) return setSubmitError(`กรุณาตอบให้ครบก่อนส่ง (${answered}/${part.questions.length})`);
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

  const reset = () => {
    if (isExamLocked) return;
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
    setQuestionShuffleSeed((seed) => seed + 1);
  };
  const goToNextPart = () => {
    if (!nextPart) return;
    examSelectionTouchedRef.current = true;
    setPartId(nextPart.id);
    setAnswers({});
    setSubmitted(false);
    setSubmitError("");
  };
  const exportJSON = () => { const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "factory_exam_bank.json"; a.click(); URL.revokeObjectURL(url); };
  const importJSON = () => { try { const n = normalize(JSON.parse(importText)); setBank(n); applyBuilderSelection(n.models[0].id, n.models[0].parts[0].id, n.models[0].parts[0].questions[0]?.id || null); setImportText(""); reset(); } catch (e) { alert(`Import ไม่สำเร็จ: ${e.message}`); } };
  const importJSONFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const n = normalize(JSON.parse(text));
      setBank(n);
      applyBuilderSelection(n.models[0].id, n.models[0].parts[0].id, n.models[0].parts[0].questions[0]?.id || null);
      setImportText(JSON.stringify(n, null, 2));
      reset();
    } catch (e) {
      alert(`เปิดไฟล์ไม่สำเร็จ: ${e.message}`);
    }
  };
  const saveLocal = useCallback(async ({ silent = false, bankOverride = null } = {}) => {
    try {
      const bankToSave = bankOverride || bank;
      const nextBankJson = JSON.stringify(bankToSave);
      if (nextBankJson === lastSyncedBankRef.current) return true;
      if (!isBankStructurallyValid(bankToSave)) {
        if (!silent) {
          setBuilderSaveMessage({ type: "error", text: "บันทึกไม่ได้ เนื่องจากมี Model หรือ Part ที่ยังไม่มีข้อสอบอย่างน้อย 1 ข้อ" });
        }
        return false;
      }
      if (!silent) setBuilderSaveMessage({ type: "", text: "" });
      setSyncStatus("saving");
      const res = await fetch(`${API_BASE}/state`, {
        method: "PUT",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify({ bank: bankToSave, results: resultHistory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const savedState = await res.json().catch(() => null);
      const savedBank = normalize(savedState?.bank ?? bankToSave);
      const savedResults = Array.isArray(savedState?.results) ? savedState.results : resultHistory;
      if (!silent) {
        setBuilderSaveMessage({ type: "success", text: "บันทึกสำเร็จแล้ว ข้อมูลข้อสอบถูกส่งขึ้น Server เรียบร้อย" });
      }
      setBank(savedBank);
      setResultHistory(savedResults);
      lastSyncedBankRef.current = JSON.stringify(savedBank);
      setBuilderServerUpdate(false);
      setPendingBuilderBank(null);
      setSyncStatus("synced");
      return true;
    } catch (error) {
      console.error(error);
      setSyncStatus("offline");
      if (!silent) {
        setBuilderSaveMessage({ type: "error", text: error?.message === "HTTP 400" ? "บันทึกไม่ได้ เนื่องจากโครงสร้างข้อสอบยังไม่ครบ" : "บันทึกลง Server ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออีกครั้ง" });
      }
      return false;
    }
  }, [bank, isBankStructurallyValid, resultHistory, session]);

  useEffect(() => {
    if (!dataReady || !session?.token || !isAdmin || entryPoint !== "exam" || activeTab !== "builder") return;
    if (!isBankStructurallyValid(bank)) return;
    if (JSON.stringify(bank) === lastSyncedBankRef.current) return;

    const timer = setTimeout(() => {
      void saveLocal({ silent: true });
    }, 900);

    return () => clearTimeout(timer);
  }, [activeTab, bank, dataReady, entryPoint, isAdmin, isBankStructurallyValid, saveLocal, session]);

  const exportCSV = () => {
    if (!submitted) return alert("กรุณาส่งคำตอบก่อนจึงจะบันทึกผลสอบได้");
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

  const exportEmployeesDataset = () => {
    const now = new Date().toISOString().slice(0, 10);
    downloadJson(`employees_dataset_${now}.json`, {
      exportedAt: new Date().toISOString(),
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      employees: employees.map((employee) => ({
        id: employee.id,
        employeeCode: employee.employeeCode,
        username: employee.username,
        fullName: employee.fullName,
        department: employee.department || "",
        position: employee.position || "",
        photoUrl: employee.photoUrl || "",
        role: employee.role || "USER",
        isActive: employee.isActive !== false,
        createdAt: employee.createdAt || "",
        updatedAt: employee.updatedAt || "",
      })),
    });
  };

  const buildSkillMatrixExportHtml = async (now) => {
    const embeddedPhotoMap = new Map(await Promise.all(
      activeEmployees.map(async (employee) => [employee.id, await fetchImageAsDataUrl(employee.photoUrl)]),
    ));
    const modelGroups = [];
    visibleSkillMatrixParts.forEach((partEntry) => {
      const last = modelGroups[modelGroups.length - 1];
      if (last && last.modelCode === partEntry.modelCode && last.modelName === partEntry.modelName) {
        last.count += 1;
        return;
      }
      modelGroups.push({
        modelCode: partEntry.modelCode,
        modelName: partEntry.modelName,
        count: 1,
      });
    });

    const groupedHeaders = modelGroups.map((group) => `
      <th class="model-group-head" colspan="${group.count}">
        <div class="model-group-code">${escapeHtml(group.modelCode)}</div>
        <div class="model-group-name">${escapeHtml(group.modelName)}</div>
      </th>
    `).join("");

    const partHeaders = visibleSkillMatrixParts.map((partEntry) => `
      <th class="part-head">
        <div class="part-code">${escapeHtml(partEntry.modelCode)}/${escapeHtml(partEntry.partCode)}</div>
        <div class="part-name">${escapeHtml(partEntry.partName)}</div>
      </th>
    `).join("");

    const employeeRows = activeEmployees.map((employee, index) => {
      const partCells = visibleSkillMatrixParts.map((partEntry) => {
        const entry = skillMatrixEntryMap.get(`${employee.id}::${partEntry.id}`);
        const derived = skillMatrixDerivedMap.get(`${employee.employeeCode}::${partEntry.id}`);
        const skillPct = Number(derived?.skillPct ?? entry?.scorePct ?? 0);
        const combinedScore = derived?.combinedScore ?? "";
        const combinedFullScore = derived?.combinedFullScore ?? "";
        const scoreNote = derived ? `${combinedScore}/${combinedFullScore}` : `${skillPct}%`;
        return `
          <td class="skill-cell">
            <div class="skill-circle skill-${skillPct}">
              <span>${skillPct}%</span>
            </div>
            <div class="score-note">${escapeHtml(scoreNote)}</div>
            <div class="score-source">${derived ? "SYNC" : "MANUAL"}</div>
          </td>
        `;
      }).join("");

      return `
        <tr>
          <td class="employee-index">${index + 1}</td>
          <td class="employee-name">
            <div class="employee-strong">${escapeHtml(employee.fullName)}</div>
            <div class="employee-meta">${escapeHtml(employee.department || "-")} / ${escapeHtml(employee.position || "-")}</div>
          </td>
          <td class="employee-code">${escapeHtml(employee.employeeCode)}</td>
          <td class="employee-photo">
            ${(embeddedPhotoMap.get(employee.id) || employee.photoUrl)
              ? `<img src="${escapeHtml(embeddedPhotoMap.get(employee.id) || employee.photoUrl)}" alt="${escapeHtml(employee.fullName)}" />`
              : "<span>No photo</span>"}
          </td>
          ${partCells}
        </tr>
      `;
    }).join("");

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <title>Skill Matrix</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Segoe UI, Tahoma, sans-serif; color: #1f2937; }
            .sheet-head { margin-bottom: 14px; border: 1px solid #94a3b8; }
            .sheet-title { background: #155e75; color: #fff; text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 0.3px; padding: 18px 12px; }
            .sheet-meta { width: 100%; border-collapse: collapse; }
            .sheet-meta td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
            .meta-label { width: 110px; background: #f8fafc; font-weight: 700; color: #334155; }
            .meta-value { font-weight: 700; color: #0f172a; }
            .legend { margin: 0 0 12px; font-size: 12px; }
            .legend span { display: inline-block; margin-right: 12px; padding: 4px 8px; background: #eef2ff; border-radius: 999px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
            th { background: #e2e8f0; text-align: center; }
            .model-group-head { background: #bae6fd; }
            .model-group-code { font-size: 13px; font-weight: 800; color: #0f172a; }
            .model-group-name { font-size: 11px; color: #334155; margin-top: 4px; }
            .part-head { min-width: 150px; }
            .part-code { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
            .part-name { font-size: 11px; color: #334155; }
            .employee-index { min-width: 54px; text-align: center; font-weight: 800; }
            .employee-name { min-width: 220px; }
            .employee-strong { font-weight: 700; margin-bottom: 4px; }
            .employee-meta { font-size: 11px; color: #64748b; }
            .employee-code { min-width: 90px; text-align: center; font-weight: 700; }
            .employee-photo { width: 88px; min-width: 88px; text-align: center; }
            .employee-photo img { width: 70px; height: 86px; object-fit: cover; border-radius: 10px; border: 1px solid #cbd5e1; }
            .skill-cell { min-width: 130px; text-align: center; }
            .skill-circle { width: 64px; height: 64px; margin: 0 auto 8px; border-radius: 999px; position: relative; border: 2px solid #94a3b8; box-sizing: border-box; }
            .skill-circle::before, .skill-circle::after { content: ""; position: absolute; background: rgba(15, 23, 42, 0.22); }
            .skill-circle::before { width: 2px; top: 6px; bottom: 6px; left: 50%; transform: translateX(-50%); }
            .skill-circle::after { height: 2px; left: 6px; right: 6px; top: 50%; transform: translateY(-50%); }
            .skill-circle span { position: absolute; inset: 12px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 999px; font-size: 12px; font-weight: 700; z-index: 1; }
            .skill-0 { background: conic-gradient(#e2e8f0 0 100%); }
            .skill-25 { background: conic-gradient(#dc2626 0 25%, #e2e8f0 25% 100%); }
            .skill-50 { background: conic-gradient(#dc2626 0 50%, #e2e8f0 50% 100%); }
            .skill-75 { background: conic-gradient(#f59e0b 0 75%, #e2e8f0 75% 100%); }
            .skill-100 { background: conic-gradient(#16a34a 0 100%); }
            .score-note { font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
            .score-source { font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="sheet-head">
            <div class="sheet-title">Skill Matrix</div>
            <table class="sheet-meta">
              <tr>
                <td class="meta-label">วันที่ Export</td>
                <td class="meta-value">${escapeHtml(now)}</td>
                <td class="meta-label">Model Filter</td>
                <td class="meta-value">${escapeHtml(skillMatrixModelFilter === "ALL" ? "ทั้งหมด" : skillMatrixModelFilter)}</td>
                <td class="meta-label">จำนวนพนักงาน</td>
                <td class="meta-value">${escapeHtml(activeEmployees.length)}</td>
              </tr>
              <tr>
                <td class="meta-label">จำนวน Part</td>
                <td class="meta-value">${escapeHtml(visibleSkillMatrixParts.length)}</td>
                <td class="meta-label">เกณฑ์วงกลม</td>
                <td class="meta-value">แบ่ง 100 เป็น 4 ส่วน</td>
                <td class="meta-label">ที่มา</td>
                <td class="meta-value">Skill Matrix / Exam / Evaluation</td>
              </tr>
            </table>
          </div>
          <div class="legend">
            <span>0-25 = 0%</span>
            <span>26-50 = 50%</span>
            <span>51-75 = 75%</span>
            <span>76-100 = 100%</span>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">ที่</th>
                <th rowspan="2">พนักงาน</th>
                <th rowspan="2">รหัส</th>
                <th rowspan="2">รูป</th>
                ${groupedHeaders}
              </tr>
              <tr>
                ${partHeaders}
              </tr>
            </thead>
            <tbody>
              ${employeeRows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  const exportSkillMatrixExcel = async () => {
    const now = new Date().toISOString().slice(0, 10);
    const html = await buildSkillMatrixExportHtml(now);
    downloadExcelHtml(`skill_matrix_layout_${now}.xls`, html);
  };

  const exportSkillMatrixPdf = async () => {
    const now = new Date().toISOString().slice(0, 10);
    const html = await buildSkillMatrixExportHtml(now);
    openPrintDocument(`Skill Matrix ${now}`, html);
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
    if (!evaluationForm.employeeId) return setEvaluationError("กรุณาเลือกพนักงาน");
    if (!evaluationModel || !evaluationPart) return setEvaluationError("กรุณาเลือก Model / Part");

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
      setEvaluationError(error.message || "บันทึกผลประเมินไม่สำเร็จ");
    }
  };

  const cycleSkillScore = async (employeeId, partId) => {
    const currentEntry = skillMatrixEntryMap.get(`${employeeId}::${partId}`);
    const levels = [0, 25, 50, 75, 100];
    const currentIndex = levels.indexOf(Number(currentEntry?.scorePct || 0));
    const nextScorePct = levels[(currentIndex + 1 + levels.length) % levels.length];

    try {
      setSkillMatrixStatus("saving");
      setSkillMatrixError("");
      const res = await fetch(`${API_BASE}/skill-matrix`, {
        method: "PUT",
        headers: authHeaders(session, { "Content-Type": "application/json" }),
        body: JSON.stringify({ employeeId, partId, scorePct: nextScorePct }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSkillMatrixEntries((prev) => {
        const next = [...prev];
        const index = next.findIndex((entry) => entry.employeeId === employeeId && entry.partId === partId);
        if (index >= 0) {
          next[index] = data;
        } else {
          next.push(data);
        }
        return next;
      });
      setSkillMatrixStatus("ready");
    } catch (error) {
      console.error(error);
      setSkillMatrixStatus("error");
      setSkillMatrixError(error.message || "บันทึก Skill Matrix ไม่สำเร็จ");
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
            <h1>เข้าสู่ระบบเพื่อใช้งานข้อสอบออนไลน์</h1>
            <p>กรอกรหัสพนักงานเพียงอย่างเดียว ระบบจะจับคู่ชื่อและสิทธิ์การใช้งานจากฐานข้อมูลพนักงานให้อัตโนมัติ</p>
            <div className="login-feature-list">
              <div className="login-feature-item"><ShieldCheck size={18} /><span>ADMIN จัดการข้อสอบ, Dashboard และ Import/Export ได้</span></div>
              <div className="login-feature-item"><Eye size={18} /><span>USER เห็นเฉพาะหน้า Student Preview สำหรับทำข้อสอบเท่านั้น</span></div>
            </div>
          </motion.section>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="login-card">
              <CardHeader><div className="section-heading"><LockKeyhole size={18} /><div><h3>Login</h3><p>กรอกรหัสพนักงานเพื่อเข้าสู่ระบบ</p></div></div></CardHeader>
              <CardContent className="login-card-content">
                <form className="login-form" onSubmit={login}>
                  <div><Label>รหัสพนักงาน</Label><Input value={loginForm.employeeCode} onChange={(e) => setLoginForm({ employeeCode: e.target.value })} placeholder="เช่น 199032 หรือ ADMIN1234" /></div>
                  {loginError ? <div className="alert-error">{loginError}</div> : null}
                  <Button type="submit"><LockKeyhole size={16} /> เข้าสู่ระบบ</Button>
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
                <div className="hero-session"><span>{session.displayName} ({session.username})</span><Button variant="outline" onClick={logout}><LogOut size={16} /> ออกจากระบบ</Button></div>
              </div>
              <h1>เลือกการใช้งาน</h1>
              <p>หลังจากล็อกอินแล้ว คุณสามารถเลือกเข้าทำข้อสอบหรือเข้าอ่านข่าวสารภายในได้จากหน้านี้</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>ข่าวสารล่าสุด</span><strong>{orderedNews.length}</strong></div>
              <div className="hero-stat"><span>Model ข้อสอบ</span><strong>{bank.models.length}</strong></div>
              <div className="hero-stat"><span>Part ทั้งหมด</span><strong>{bank.models.reduce((sum, entry) => sum + entry.parts.length, 0)}</strong></div>
              <div className="hero-stat"><span>โหมดใช้งาน</span><strong>{isAdmin ? "ADMIN" : "USER"}</strong></div>
            </div>
          </motion.section>

          <div className="portal-grid">
            <Card className="portal-card">
              <CardContent className="portal-card-content">
                <div className="section-heading"><Eye size={20} /><div><h3>เข้าทำข้อสอบ</h3><p>{isAdmin ? "เปิดหน้าใช้งานข้อสอบ, ประเมิน, dashboard และเครื่องมือที่เกี่ยวข้อง" : "เปิดหน้า Student Preview เพื่อทำข้อสอบและดูผลของ Part ปัจจุบัน"}</p></div></div>
                <Button onClick={() => setEntryPoint("exam")}>ไปหน้าข้อสอบ</Button>
              </CardContent>
            </Card>

            <Card className="portal-card">
              <CardContent className="portal-card-content">
                <div className="section-heading"><Megaphone size={20} /><div><h3>อ่านข่าวสาร</h3><p>ติดตามประกาศล่าสุด, ข้อมูลภายใน, และข่าวสารที่เกี่ยวข้องกับการทำงาน</p></div></div>
                <Button onClick={() => setEntryPoint("news")}>ไปหน้าข่าวสาร</Button>
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

            {isAdmin ? (
              <Card className="portal-card">
                <CardContent className="portal-card-content">
                  <div className="section-heading"><ClipboardCheck size={20} /><div><h3>Employee score charts</h3><p>Open the chart view for exam trends and exam-vs-evaluation comparisons by employee.</p></div></div>
                  <Button onClick={() => setEntryPoint("score-charts")}>Open score charts</Button>
                </CardContent>
              </Card>
            ) : null}

            {isAdmin ? (
              <Card className="portal-card">
                <CardContent className="portal-card-content">
                  <div className="section-heading"><ClipboardCheck size={20} /><div><h3>Skill Matrix</h3><p>ดูทักษะราย Part ของพนักงาน พร้อมบันทึกความพร้อมเป็นวงกลม 4 ส่วนได้ในหน้าเดียว</p></div></div>
                  <Button onClick={() => setEntryPoint("skill-matrix")}>Open skill matrix</Button>
                </CardContent>
              </Card>
            ) : null}

          </div>
        </div>
      </div>
    );
  }

  if (entryPoint === "skill-matrix" && isAdmin) {
    return (
      <div className="app-shell skill-matrix-page">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="app-container skill-matrix-container">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel skill-matrix-hero">
            <div className="hero-copy">
              <div className="hero-topbar">
                <div className="hero-badges"><Badge>Skill Matrix</Badge><Badge outline>{activeEmployees.length} employees</Badge></div>
                <div className="hero-session">
                  <Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> กลับเมนู</Button>
                  <Button variant="outline" onClick={logout}><LogOut size={16} /> ออกจากระบบ</Button>
                </div>
              </div>
              <h1>Skill Matrix</h1>
              <p>ดึงข้อมูลพนักงานจากฐานข้อมูลเดิมและดึง Part จากคลังข้อสอบจริง พร้อมบันทึก skill เป็นวงกลม 4 ส่วน ส่วนละ 25%</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>พนักงาน</span><strong>{activeEmployees.length}</strong></div>
              <div className="hero-stat"><span>Part ในคลัง</span><strong>{skillMatrixParts.length}</strong></div>
              <div className="hero-stat"><span>Skill entries</span><strong>{skillMatrixEntries.length}</strong></div>
              <div className="hero-stat"><span>สถานะ</span><strong>{skillMatrixStatus === "saving" ? "Saving" : skillMatrixStatus === "loading" ? "Loading" : skillMatrixStatus === "error" ? "Error" : "Ready"}</strong></div>
            </div>
          </motion.section>

          <Card className="skill-matrix-card">
            <CardHeader>
              <div className="skill-matrix-header">
                <ClipboardCheck size={18} />
                <div className="skill-matrix-header-text">
                  <h3>Skill Matrix by employee and part</h3>
                  <p>คะแนนรวมจะถูกแมปเป็น 4 ระดับตามช่วงคะแนน 0-25 = 0%, 26-50 = 50%, 51-75 = 75%, 76-100 = 100%</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {skillMatrixError ? <div className="alert-error">{skillMatrixError}</div> : null}
              <div className="skill-matrix-legend">
                <div className="skill-matrix-legend-title">เกณฑ์ระดับวงกลม</div>
                <div className="skill-matrix-legend-items">
                  <span className="skill-matrix-legend-item"><strong>0-25</strong> = 0%</span>
                  <span className="skill-matrix-legend-item"><strong>26-50</strong> = 50%</span>
                  <span className="skill-matrix-legend-item"><strong>51-75</strong> = 75%</span>
                  <span className="skill-matrix-legend-item"><strong>76-100</strong> = 100%</span>
                </div>
              </div>
              <div className="skill-matrix-controls">
                <div>
                  <Label>Model</Label>
                  <select
                    value={skillMatrixModelFilter}
                    onChange={(e) => setSkillMatrixModelFilter(e.target.value)}
                    style={S.input}
                  >
                    <option value="ALL">ทั้งหมด ({skillMatrixParts.length} Part)</option>
                    {skillMatrixModelOptions.map((entry) => (
                      <option key={entry.modelCode} value={entry.modelCode}>
                        {entry.modelCode} - {entry.modelName} ({entry.partCount} Part)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>ค้นหา Part</Label>
                  <Input
                    value={skillMatrixSearch}
                    onChange={(e) => setSkillMatrixSearch(e.target.value)}
                    placeholder="พิมพ์ชื่อหรือรหัส Part"
                  />
                </div>
                <div>
                  <Label>แสดงต่อหน้า</Label>
                  <select
                    value={skillMatrixPartsPerPage}
                    onChange={(e) => setSkillMatrixPartsPerPage(Number(e.target.value) || 6)}
                    style={S.input}
                  >
                    <option value={6}>6 Part</option>
                    <option value={8}>8 Part</option>
                    <option value={10}>10 Part</option>
                    <option value={12}>12 Part</option>
                  </select>
                </div>
                <div className="skill-matrix-summary-chips">
                  <span className="skill-matrix-summary-chip">แสดง {visibleSkillMatrixParts.length} จาก {filteredSkillMatrixParts.length} Part</span>
                  <span className="skill-matrix-summary-chip">{activeEmployees.length} employees</span>
                  <span className="skill-matrix-summary-chip">หน้า {skillMatrixPartPage + 1} / {skillMatrixPartPageCount}</span>
                  <Button variant="outline" onClick={() => setSkillMatrixPartPage((prev) => Math.max(0, prev - 1))} disabled={skillMatrixPartPage === 0}>
                    <ArrowLeft size={16} />
                    ก่อนหน้า
                  </Button>
                  <Button variant="outline" onClick={() => setSkillMatrixPartPage((prev) => Math.min(skillMatrixPartPageCount - 1, prev + 1))} disabled={skillMatrixPartPage >= skillMatrixPartPageCount - 1}>
                    ถัดไป
                  </Button>
                  <Button variant="outline" onClick={exportSkillMatrixPdf}>
                    <FileSpreadsheet size={16} />
                    Export PDF
                  </Button>
                  <Button variant="outline" onClick={exportSkillMatrixExcel}>
                    <FileSpreadsheet size={16} />
                    Export Excel
                  </Button>
                </div>
              </div>
              <div className="skill-matrix-scroll-note">เลื่อนแถบนี้เพื่อดู Part อื่น ๆ ทางขวา</div>
              <div
                className="skill-matrix-top-scroll"
                ref={skillMatrixTopScrollRef}
                onScroll={() => syncSkillMatrixScrollPosition("top")}
              >
                <div className="skill-matrix-top-scroll-inner" style={{ width: `${Math.max(skillMatrixScrollWidth, skillMatrixTableWidth)}px` }} />
              </div>
              <div
                className="skill-matrix-wrap"
                ref={skillMatrixWrapRef}
                onScroll={() => {
                  syncSkillMatrixScrollMetrics();
                  syncSkillMatrixScrollPosition("table");
                }}
              >
                <table className="skill-matrix-table" style={{ minWidth: `${skillMatrixTableWidth}px` }}>
                  <thead>
                    <tr>
                      <th>พนักงาน</th>
                      <th>รหัส</th>
                      <th>รูป</th>
                      {visibleSkillMatrixParts.map((partEntry) => (
                        <th key={partEntry.id}>
                          <div className="skill-matrix-part-heading">
                            <strong>{partEntry.modelCode}/{partEntry.partCode}</strong>
                            <span>{partEntry.partName}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td>
                          <div className="skill-matrix-employee-name">
                            <strong>{employee.fullName}</strong>
                            <span>{employee.department || "-"} / {employee.position || "-"}</span>
                          </div>
                        </td>
                        <td>{employee.employeeCode}</td>
                        <td>
                          <div className="skill-matrix-photo-frame">
                            {employee.photoUrl ? <img src={employee.photoUrl} alt={employee.fullName} className="skill-matrix-photo" /> : <span>No photo</span>}
                          </div>
                        </td>
                        {visibleSkillMatrixParts.map((partEntry) => {
                          const entry = skillMatrixEntryMap.get(`${employee.id}::${partEntry.id}`);
                          const derived = skillMatrixDerivedMap.get(`${employee.employeeCode}::${partEntry.id}`);
                          const pct = Number(derived?.skillPct ?? entry?.scorePct ?? 0);
                          return (
                            <td key={`${employee.id}-${partEntry.id}`}>
                              <button
                                type="button"
                                className="skill-matrix-cell"
                                disabled={Boolean(derived)}
                                onClick={() => cycleSkillScore(employee.id, partEntry.id)}
                                title={`${employee.fullName} / ${partEntry.partName} = ${derived ? `${derived.combinedScore}/${derived.combinedFullScore} (sync from exam+evaluation)` : `${pct}%`}`}
                              >
                                <span
                                  className="skill-matrix-circle"
                                  style={{
                                    background: pct <= 0
                                      ? "conic-gradient(rgba(226,232,240,0.95) 0 100%)"
                                      : `conic-gradient(${skillCircleColor(pct)} 0 ${pct}%, rgba(226,232,240,0.95) ${pct}% 100%)`,
                                  }}
                                >
                                  <span className="skill-matrix-circle-core">{pct}%</span>
                                  <span className="skill-matrix-circle-line line-v" />
                                  <span className="skill-matrix-circle-line line-h" />
                                </span>
                                <span className="skill-matrix-score-note">{derived ? `${derived.combinedScore}/${derived.combinedFullScore}` : `${pct}%`}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                    <Label>Employee name</Label>
                    <select value={employeeResultsEmployeeFilter} onChange={(e) => setEmployeeResultsEmployeeFilter(e.target.value)} style={S.input}>
                      <option value="ALL">All</option>
                      {employeeResultOptions.map((entry) => (
                        <option key={entry.candidateCode} value={entry.candidateCode}>
                          {entry.candidateName} ({entry.candidateCode})
                        </option>
                      ))}
                    </select>
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
                  {!selectedEmployeeSummary ? (
                    <div className="empty-state">Select an employee from the list to view details.</div>
                  ) : (
                    <div className="detail-stack">
                      <div className="dashboard-stats">
                        <Card className="metric-card"><CardContent><div className="metric-label">Learning status</div><div className="metric-value metric-value--status"><span className={`status-pill ${selectedEmployeeSummary.learningStatusClassName}`.trim()}>{selectedEmployeeSummary.learningStatusLabel}</span></div></CardContent></Card>
                        <Card className="metric-card"><CardContent><div className="metric-label">Attempts</div><div className="metric-value">{selectedEmployeeSummary.attempts}</div></CardContent></Card>
                        <Card className="metric-card"><CardContent><div className="metric-label">Passed parts</div><div className="metric-value">{selectedEmployeeSummary.passedParts}</div></CardContent></Card>
                        <Card className="metric-card"><CardContent><div className="metric-label">Evaluated parts</div><div className="metric-value">{selectedEmployeeSummary.evaluatedParts}</div></CardContent></Card>
                        <Card className="metric-card"><CardContent><div className="metric-label">Average score</div><div className="metric-value">{selectedEmployeeSummary.avgPct}%</div></CardContent></Card>
                      </div>

                      <div className="employee-learning-summary">
                        <div>
                          <strong>{selectedEmployeeSummary.candidateName}</strong>
                          <div className="employee-result-meta">{selectedEmployeeSummary.candidateCode} | {selectedEmployeeSummary.department || "-"} / {selectedEmployeeSummary.position || "-"}</div>
                        </div>
                        <div className="employee-result-meta">{selectedEmployeeSummary.latestModelPart !== "-" ? `ล่าสุด ${selectedEmployeeSummary.latestModelPart}` : "ยังไม่มีประวัติสอบ"}</div>
                      </div>

                      <div className="dashboard-table-wrap">
                        <table className="dashboard-table">
                          <thead><tr><th>Time</th><th>Model/Part</th><th>Score</th><th>Status</th></tr></thead>
                          <tbody>
                            {selectedEmployeeResults.length === 0 ? <tr><td colSpan={4}>ยังไม่มีประวัติการสอบ</td></tr> : selectedEmployeeResults.map((entry) => <tr key={entry.id}><td>{new Date(entry.submittedAt).toLocaleString()}</td><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td>{entry.score}/{entry.fullScore}</td><td><span className={`status-pill status-${String(entry.status || "").toLowerCase()}`.trim()}>{entry.status}</span></td></tr>)}
                          </tbody>
                        </table>
                      </div>

                      <Card>
                        <CardHeader><div className="section-heading"><ClipboardCheck size={18} /><div><h3>Exam vs evaluation by part</h3><p>Compare each part's latest exam score with the latest evaluation score for the same employee.</p></div></div></CardHeader>
                        <CardContent>
                          {selectedEmployeePartComparison.length === 0 ? (
                            <div className="empty-state">No exam/evaluation comparison data for this employee yet.</div>
                          ) : (
                            <div className="dashboard-table-wrap">
                              <table className="dashboard-table">
                                <thead><tr><th>Part</th><th>Learning status</th><th>Exam score</th><th>Exam status</th><th>Evaluation score</th><th>ผลรวม</th><th>Evaluator</th><th>Latest record</th></tr></thead>
                                <tbody>
                                  {selectedEmployeePartComparison.map((entry) => <tr key={entry.key}><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td><span className={`status-pill ${entry.learningStatusClassName}`.trim()}>{entry.learningStatusLabel}</span></td><td>{entry.examFullScore != null ? `${entry.examScore}/${entry.examFullScore}` : "-"}</td><td><span className={`status-pill status-${String(entry.examStatus || "").toLowerCase()}`.trim()}>{entry.examStatus}</span></td><td>{entry.evaluationMaxScore != null ? `${entry.evaluationScore}/${entry.evaluationMaxScore}` : "-"}</td><td>{entry.combinedFullScore ? `${entry.combinedScore}/${entry.combinedFullScore}` : "-"}</td><td>{entry.evaluator}</td><td>{entry.comparedAt ? new Date(entry.comparedAt).toLocaleString() : "-"}</td></tr>)}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (entryPoint === "score-charts" && isAdmin) {
    return (
      <div className="app-shell">
        <div className="backdrop-grid" />
        <div className="backdrop-glow backdrop-glow-left" />
        <div className="backdrop-glow backdrop-glow-right" />
        <div className="app-container">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hero-panel">
            <div className="hero-copy">
              <div className="hero-topbar">
                <div className="hero-badges"><Badge>Employee Charts</Badge><Badge outline>{selectedEmployeeSummary ? selectedEmployeeSummary.candidateName : "ยังไม่ได้เลือกพนักงาน"}</Badge></div>
                <div className="hero-session">
                  <Button variant="outline" onClick={() => setEntryPoint("scores")}><ArrowLeft size={16} /> กลับหน้าสรุป</Button>
                  <Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> กลับเมนู</Button>
                  <Button variant="outline" onClick={logout}><LogOut size={16} /> ออกจากระบบ</Button>
                </div>
              </div>
              <h1>Employee score charts</h1>
              <p>ดูกราฟผลสอบย้อนหลัง และกราฟเปรียบเทียบคะแนนสอบกับคะแนนประเมินของพนักงานแต่ละคนแบบแยกหน้า</p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><span>พนักงานที่เลือก</span><strong>{selectedEmployeeSummary?.candidateCode || "-"}</strong></div>
              <div className="hero-stat"><span>Attempts</span><strong>{selectedEmployeeSummary?.attempts || 0}</strong></div>
              <div className="hero-stat"><span>Average score</span><strong>{selectedEmployeeSummary?.avgPct || 0}%</strong></div>
              <div className="hero-stat"><span>Part ที่มีข้อมูล</span><strong>{selectedEmployeePartChart.length}</strong></div>
            </div>
          </motion.section>

          <div className="dashboard-layout">
            <Card>
              <CardContent>
                <div className="dashboard-filters">
                  <div>
                    <Label>Employee name</Label>
                    <select value={employeeResultsEmployeeFilter} onChange={(e) => setEmployeeResultsEmployeeFilter(e.target.value)} style={S.input}>
                      <option value="ALL">All</option>
                      {employeeResultOptions.map((entry) => (
                        <option key={entry.candidateCode} value={entry.candidateCode}>
                          {entry.candidateName} ({entry.candidateCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Learning status</Label>
                    <select value={employeeResultsStatusFilter} onChange={(e) => setEmployeeResultsStatusFilter(e.target.value)} style={S.input}>
                      <option value="ALL">ทั้งหมด</option>
                      <option value="NOT_STARTED">ยังไม่สอบ</option>
                      <option value="EXAM_NOT_PASSED">สอบไม่ผ่าน</option>
                      <option value="WAITING_EVALUATION">รอประเมิน</option>
                      <option value="COMPLETED">ผ่านครบ</option>
                    </select>
                  </div>
                  <div>
                    <Label>พนักงานที่เปิดกราฟ</Label>
                    <select value={selectedEmployeeResultCode} onChange={(e) => setSelectedEmployeeResultCode(e.target.value)} style={S.input}>
                      {employeeResultSummaries.map((entry) => (
                        <option key={entry.candidateCode} value={entry.candidateCode}>
                          {entry.candidateName} ({entry.candidateCode})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>ข้อมูลกราฟ</Label>
                    <Input value={selectedEmployeeSummary ? `${selectedEmployeeSummary.passedParts} ผ่าน / ${selectedEmployeeSummary.evaluatedParts} ประเมิน` : "-"} readOnly />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!selectedEmployeeSummary ? (
              <Card><CardContent className="empty-state">Select an employee to view charts.</CardContent></Card>
            ) : (
              <div className="detail-stack">
                <div className="employee-learning-summary">
                  <div>
                    <strong>{selectedEmployeeSummary.candidateName}</strong>
                    <div className="employee-result-meta">{selectedEmployeeSummary.candidateCode} | {selectedEmployeeSummary.department || "-"} / {selectedEmployeeSummary.position || "-"}</div>
                  </div>
                  <div className="employee-result-meta">{selectedEmployeeSummary.latestModelPart !== "-" ? `ล่าสุด ${selectedEmployeeSummary.latestModelPart}` : "ยังไม่มีประวัติสอบ"}</div>
                </div>

                <div className="score-chart-grid">
                  <Card>
                    <CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>แนวโน้มผลสอบย้อนหลัง</h3><p>แสดงผลสอบล่าสุดสูงสุด 8 ครั้งในรูปแบบเส้นแนวโน้ม</p></div></div></CardHeader>
                    <CardContent>
                      {selectedEmployeeAttemptChart.length === 0 ? (
                        <div className="empty-state">ยังไม่มีประวัติผลสอบสำหรับแสดงกราฟ</div>
                      ) : (
                        <div className="trend-chart-card">
                          <div className="trend-chart-shell">
                            <svg viewBox="0 0 560 220" className="trend-chart-svg" preserveAspectRatio="none" aria-label="Exam score trend">
                              <defs>
                                <linearGradient id="trendAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="rgba(14,165,233,0.35)" />
                                  <stop offset="100%" stopColor="rgba(14,165,233,0.02)" />
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map((tick) => {
                                const y = 190 - (tick / 100) * 150;
                                return (
                                  <g key={tick}>
                                    <line x1="28" y1={y} x2="532" y2={y} className="trend-grid-line" />
                                    <text x="4" y={y + 4} className="trend-grid-text">{tick}</text>
                                  </g>
                                );
                              })}
                              <polygon points={selectedEmployeeAttemptTrend.areaPoints} className="trend-area" />
                              <polyline points={selectedEmployeeAttemptTrend.points} className="trend-line" />
                              {selectedEmployeeAttemptTrend.labels.map((entry) => (
                                <g key={entry.id}>
                                  <circle cx={entry.x} cy={entry.y} r="5.5" className={`trend-point trend-point-${String(entry.status || "").toLowerCase()}`.trim()} />
                                </g>
                              ))}
                            </svg>
                          </div>
                          <div className="trend-chart-legend">
                            {selectedEmployeeAttemptTrend.labels.map((entry) => (
                              <div key={entry.id} className="trend-chart-legend-item">
                                <div className={`trend-dot trend-dot-${String(entry.status || "").toLowerCase()}`.trim()} />
                                <div>
                                  <strong>{entry.pct}%</strong>
                                  <span>{entry.label} • {entry.raw}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><div className="section-heading"><ClipboardCheck size={18} /><div><h3>เทียบคะแนนราย Part</h3><p>เปรียบเทียบคะแนนสอบ ประเมิน และคะแนนรวมของแต่ละ Part แบบแนวนอน</p></div></div></CardHeader>
                    <CardContent>
                      {selectedEmployeePartChart.length === 0 ? (
                        <div className="empty-state">ยังไม่มีข้อมูล Part สำหรับแสดงกราฟ</div>
                      ) : (
                        <div className="part-compare-list">
                          {selectedEmployeePartChart.map((entry) => (
                            <div key={entry.key} className="part-compare-card">
                              <div className="part-chart-header">
                                <strong>{entry.label}</strong>
                                <span>{entry.combinedRaw}</span>
                              </div>
                              <div className="part-chart-bars">
                                <div className="part-chart-row"><span>Exam</span><div className="part-chart-track"><div className="part-chart-fill is-exam" style={{ width: `${entry.examPct}%` }} /></div><strong>{entry.examPct}%</strong></div>
                                <div className="part-chart-row"><span>Eval</span><div className="part-chart-track"><div className="part-chart-fill is-eval" style={{ width: `${entry.evaluationPct}%` }} /></div><strong>{entry.evaluationPct}%</strong></div>
                                <div className="part-chart-row"><span>Total</span><div className="part-chart-track"><div className="part-chart-fill is-total" style={{ width: `${entry.combinedPct}%` }} /></div><strong>{entry.combinedPct}%</strong></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
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
              <div className="hero-session"><span>{session.displayName} ({session.username})</span>{isAdmin ? <Button variant="outline" onClick={() => setEntryPoint("portal")}><ArrowLeft size={16} /> กลับเมนู</Button> : null}<Badge outline>{syncStatusLabel}</Badge><Button variant="outline" onClick={logout}><LogOut size={16} /> ออกจากระบบ</Button></div>
            </div>
            <h1>{bank.title}</h1>
            <p>จัดการข้อสอบพนักงานแบบครบวงจร ตั้งแต่สร้างคลังข้อสอบ แสดงตัวอย่างข้อสอบ ไปจนถึงติดตามผลสอบใน Dashboard เดียว</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span>จำนวน Model</span><strong>{bank.models.length}</strong></div>
            <div className="hero-stat"><span>Part ที่เลือก</span><strong>{model?.parts.length || 0}</strong></div>
            <div className="hero-stat"><span>ข้อสอบใน Part</span><strong>{part?.questions.length || 0}</strong></div>
            <div className="hero-stat"><span>คะแนนเต็ม</span><strong>{scoreFull}</strong></div>
          </div>
        </motion.section>

        {isAdmin ? (
          <Card className="action-strip"><CardContent className="action-strip-content"><div><p className="section-kicker">Quick Actions</p><h2>เริ่มแก้ไขคลังข้อสอบได้ทันที</h2></div><div className="action-buttons"><Button onClick={addQ}><Plus size={16} /> เพิ่มข้อสอบใหม่</Button><Button variant="outline" onClick={saveLocal}><Save size={16} /> บันทึกลงฐานข้อมูล</Button><Button variant="outline" onClick={exportJSON}><FileJson size={16} /> Export JSON</Button></div></CardContent></Card>
        ) : (
          <Card className="action-strip"><CardContent className="action-strip-content"><div><p className="section-kicker">Exam Mode</p><h2>บัญชีผู้ใช้งานทั่วไปทำข้อสอบได้อย่างเดียว</h2></div><div className="hero-badges"><Badge outline>Preview Only</Badge></div></CardContent></Card>
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
                  <CardHeader><div className="section-heading"><BookOpen size={18} /><div><h3>ตั้งค่า Model / Part</h3><p>กำหนดโครงสร้างข้อสอบและเงื่อนไขของแต่ละ Part</p></div></div></CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <Label>ชื่อระบบ</Label><Input value={bank.title} onChange={(e) => setBank((b) => ({ ...b, title: e.target.value }))} />
                      <Label>Model</Label>
                      <select value={builderModelId || ""} onChange={(e) => { const nextModel = bank.models.find((x) => x.id === e.target.value); applyBuilderSelection(e.target.value, nextModel?.parts?.[0]?.id || null, nextModel?.parts?.[0]?.questions?.[0]?.id || null); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select>
                      <div className="button-row"><Button onClick={addModel}><Plus size={16} /> เพิ่ม Model</Button><Button variant="destructive" onClick={removeModel}><Trash2 size={16} /> ลบ Model</Button></div>
                      <Label>Model Code</Label><Input value={builderModel?.modelCode || ""} onChange={(e) => patchModel("modelCode", e.target.value)} />
                      <Label>Model Name</Label><Input value={builderModel?.modelName || ""} onChange={(e) => patchModel("modelName", e.target.value)} />
                      <Label>Part</Label>
                      <select value={builderPartId || ""} onChange={(e) => { const nextPart = builderModel?.parts.find((p) => p.id === e.target.value); applyBuilderSelection(builderModelId, e.target.value, nextPart?.questions?.[0]?.id || null); }} style={S.input}>{(builderModel?.parts || []).map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select>
                      <div className="button-row"><Button disabled={(builderModel?.parts?.length || 0) >= 20} onClick={addPart}><Plus size={16} /> เพิ่ม Part</Button><Button variant="destructive" onClick={removePart}><Trash2 size={16} /> ลบ Part</Button></div>
                      <div className="mini-note">Model นี้มี {builderModel?.parts?.length || 0} Part (สูงสุด 20)</div>
                      <Label>Part Code</Label><Input value={builderPart?.partCode || ""} onChange={(e) => patchPart("partCode", e.target.value)} />
                      <Label>Part Name</Label><Input value={builderPart?.partName || ""} onChange={(e) => patchPart("partName", e.target.value)} />
                      <Label>คำอธิบาย</Label><Input value={builderPart?.subtitle || ""} onChange={(e) => patchPart("subtitle", e.target.value)} />
                      <div className="two-col"><div><Label>Pass Score</Label><Input value={`${FIXED_PASS_SCORE}/${builderScoreFull}`} readOnly disabled style={{ background: "rgba(14, 26, 36, 0.06)" }} /></div><div><Label>Full Score</Label><Input type="number" value={builderScoreFull} disabled style={{ background: "rgba(14, 26, 36, 0.06)" }} /></div></div>
                      <div className="toggle-row"><span>สุ่มลำดับข้อสอบ</span><Button variant={builderPart?.randomizeQuestions ? "default" : "outline"} onClick={() => patchPart("randomizeQuestions", !builderPart?.randomizeQuestions)}>{builderPart?.randomizeQuestions ? "ON" : "OFF"}</Button></div>
                      <div className="toggle-row"><span>แสดงผลทันทีหลังส่ง</span><Button variant={builderPart?.showResultImmediately ? "default" : "outline"} onClick={() => patchPart("showResultImmediately", !builderPart?.showResultImmediately)}>{builderPart?.showResultImmediately ? "ON" : "OFF"}</Button></div>
                      <div className="builder-question-tools">
                        <div>
                          <Label>ค้นหาข้อสอบ</Label>
                          <Input
                            value={builderQuestionSearch}
                            onChange={(e) => setBuilderQuestionSearch(e.target.value)}
                            placeholder="พิมพ์เลขข้อหรือคำบางส่วนของคำถาม"
                          />
                        </div>
                        <div>
                          <Label>ไปที่ข้อ</Label>
                          <select value={builderQuestion?.id || ""} onChange={(e) => setBuilderQId(e.target.value)} style={S.input}>
                            {(builderPart?.questions || []).map((q, i) => (
                              <option key={q.id} value={q.id}>
                                ข้อ {i + 1} - {(q.questionText || "ยังไม่ได้กรอกคำถาม").slice(0, 60)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="question-list-meta">
                        <span>ทั้งหมด {builderPart?.questions?.length || 0} ข้อ</span>
                        <span>แสดง {filteredBuilderQuestions.length} ข้อ</span>
                        <span>กำลังแก้ข้อ {builderQuestion?.questionNo || "-"}</span>
                      </div>
                      <div className="question-list">
                        {filteredBuilderQuestions.length ? filteredBuilderQuestions.map((q, i) => {
                          const actualIndex = builderPart.questions.findIndex((entry) => entry.id === q.id);
                          return (
                            <button key={q.id} ref={(node) => { if (node) builderQuestionChipRefs.current[q.id] = node; }} onClick={() => setBuilderQId(q.id)} className={`question-chip ${q.id === builderQuestion?.id ? "is-active" : ""}`}>
                              <span className="question-chip-no">ข้อ {actualIndex + 1}</span>
                              <strong>{q.questionText || "ยังไม่ได้กรอกคำถาม"}</strong>
                              <small>{q.score} คะแนน</small>
                            </button>
                          );
                        }) : <div className="empty-state">ไม่พบข้อสอบตามคำค้นหา</div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><div className="section-heading"><ClipboardCheck size={18} /><div><h3>แก้ไขข้อสอบ</h3><p>ปรับคำถาม ตัวเลือก รูปประกอบ และคะแนนในจุดเดียว</p></div></div></CardHeader>
                  <CardContent>
                    {builderServerUpdate ? (
                      <div className="alert-error" style={{ marginBottom: 16 }}>
                        New exam data is available on the server from another device. Click {" "}
                        <button
                          type="button"
                          onClick={reloadBuilderFromServer}
                          style={{ background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", fontWeight: 700, padding: 0 }}
                        >
                          Load latest data
                        </button>
                      </div>
                    ) : null}
                    {!builderPart?.questions?.length ? <div className="empty-state">ยังไม่มีข้อสอบ</div> : (
                      <div className="editor-layout">
                        <div className="button-row">
                          <Button onClick={addQ}><Plus size={16} /> เพิ่มข้อสอบใหม่</Button>
                          <Button variant="outline" onClick={() => jumpQuestion(-1)} disabled={builderPart.questions.findIndex((entry) => entry.id === builderQuestion?.id) <= 0}>เลื่อนไปข้อก่อนหน้า</Button>
                          <Button variant="outline" onClick={() => jumpQuestion(1)} disabled={builderPart.questions.findIndex((entry) => entry.id === builderQuestion?.id) >= builderPart.questions.length - 1}>เลื่อนไปข้อถัดไป</Button>
                        </div>
                        <div className="builder-question-stack">
                          {filteredBuilderQuestions.map((editingQuestion, visibleIndex) => {
                            const actualIndex = builderPart.questions.findIndex((entry) => entry.id === editingQuestion.id);
                            const active = editingQuestion.id === builderQuestion?.id;
                            return (
                              <div
                                key={editingQuestion.id}
                                ref={(node) => {
                                  if (node) builderQuestionRefs.current[editingQuestion.id] = node;
                                }}
                                className={`builder-question-panel ${active ? "is-active" : ""}`}
                              >
                                <div className="builder-question-panel-header">
                                  <div>
                                    <div className="question-chip-no">ข้อ {actualIndex + 1}</div>
                                    <strong>{editingQuestion.questionText || `ข้อใหม่ ${visibleIndex + 1}`}</strong>
                                  </div>
                                  <div className="button-row">
                                    <Button variant="outline" onClick={() => { setBuilderQId(editingQuestion.id); moveQ(-1, editingQuestion.id); }} disabled={actualIndex <= 0}>ขึ้น</Button>
                                    <Button variant="outline" onClick={() => { setBuilderQId(editingQuestion.id); moveQ(1, editingQuestion.id); }} disabled={actualIndex >= builderPart.questions.length - 1}>ลง</Button>
                                    <Button variant="outline" onClick={() => { setBuilderQId(editingQuestion.id); dupQ(editingQuestion); }}>คัดลอก</Button>
                                    <Button variant="destructive" onClick={() => { setBuilderQId(editingQuestion.id); delQ(editingQuestion.id); }}><Trash2 size={16} /> ลบ</Button>
                                  </div>
                                </div>
                                <Label>คำถาม</Label>
                                <Textarea rows={4} value={editingQuestion.questionText} onChange={(e) => { setBuilderQId(editingQuestion.id); patchQ(editingQuestion.id, { questionText: e.target.value }); }} />
                                <div className="two-col">
                                  <div>
                                    <Label>คะแนน</Label>
                                    <Input type="number" value={FIXED_QUESTION_SCORE} readOnly disabled style={{ background: "rgba(14, 26, 36, 0.06)" }} />
                                  </div>
                                  <div>
                                    <Label>คำตอบที่ถูก</Label>
                                    <select value={editingQuestion.correctAnswer} onChange={(e) => { setBuilderQId(editingQuestion.id); patchQ(editingQuestion.id, { correctAnswer: e.target.value }); }} style={S.input}>
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                      <option value="C">C</option>
                                      <option value="D">D</option>
                                    </select>
                                  </div>
                                </div>
                                <Label>ลิงก์รูปภาพ</Label>
                                <Input value={editingQuestion.imageUrl} onChange={(e) => { setBuilderQId(editingQuestion.id); patchQ(editingQuestion.id, { imageUrl: e.target.value }); }} />
                                <label className="upload-button">
                                  <ImagePlus size={16} /> เลือกรูป
                                  <input type="file" accept="image/*" hidden onChange={(e) => uploadImg(e.target.files?.[0], editingQuestion.id)} />
                                </label>
                                {editingQuestion.imageUrl ? <img src={editingQuestion.imageUrl} alt="question" className="question-image" /> : null}
                                <div className="choice-grid">
                                  {["A", "B", "C", "D"].map((key) => (
                                    <Card key={key} className="choice-card">
                                      <CardContent>
                                        <Label>ตัวเลือก {key}</Label>
                                        <Textarea
                                          rows={3}
                                          value={editingQuestion.choices[key]}
                                          onChange={(e) => {
                                            setBuilderQId(editingQuestion.id);
                                            patchChoice(editingQuestion.id, key, e.target.value, editingQuestion.choices);
                                          }}
                                        />
                                        <Button variant="outline" onClick={() => { setBuilderQId(editingQuestion.id); patchQ(editingQuestion.id, { correctAnswer: key }); }}>ตั้งเป็นคำตอบที่ถูก</Button>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="builder-save-footer">
                          <div>
                            <div className="result-label">
                              <Save size={16} /> ยืนยันการบันทึกข้อมูล
                            </div>
                            <p className="mini-note">กดปุ่มนี้หลังแก้ไขข้อสอบข้อสุดท้าย เพื่อบันทึกคลังข้อสอบลง Server ทันที</p>
                            {builderSaveMessage.text ? (
                              <div className={builderSaveMessage.type === "error" ? "alert-error" : "alert-success"} style={{ marginTop: 10 }}>
                                {builderSaveMessage.text}
                              </div>
                            ) : null}
                          </div>
                          <Button
                            onClick={saveLocal}
                            disabled={syncStatus === "saving"}
                          >
                            <Save size={16} /> {syncStatus === "saving" ? "กำลังบันทึก..." : "บันทึกข้อมูลลง Server"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="preview">
            <div className="split-grid">
              <Card className="sticky-card"><CardHeader><div className="section-heading"><Eye size={18} /><div><h3>Candidate details</h3><p>Preview the exam form and track the current attempt in real time.</p></div></div></CardHeader><CardContent><div className="form-stack"><Label>Model</Label><select value={model.id} onChange={(e) => { examSelectionTouchedRef.current = true; setModelId(e.target.value); const nextModel = bank.models.find((x) => x.id === e.target.value); setPartId(nextModel.parts[0].id); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select><Label>Part</Label><select value={part.id} onChange={(e) => { examSelectionTouchedRef.current = true; setPartId(e.target.value); }} style={S.input}>{model.parts.map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select><Label>Employee name</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} /><Label>Employee code</Label><Input value={candidateCode} onChange={(e) => setCandidateCode(e.target.value)} /><div className="progress-block"><div className="progress-label-row"><span>Progress</span><strong>{answered}/{part.questions.length}</strong></div><Progress value={progress} /></div>{submitError ? <div className="alert-error">{submitError}</div> : null}{isExamLocked ? <div className="alert-error">This part was already passed on {new Date(passedAttemptForCurrentPart.submittedAt).toLocaleString()} with score {passedAttemptForCurrentPart.score}/{passedAttemptForCurrentPart.fullScore}.</div> : null}<Button variant="outline" disabled={!submitted} onClick={exportCSV}>Export result CSV</Button><Button variant="outline" onClick={reset} disabled={isExamLocked}>Start over</Button></div></CardContent></Card>
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
                        <h3>แบบประเมินการปฏิบัติงาน</h3>
                        <p>หน้าใหม่สำหรับกรอกคะแนนแบบตารางตามฟอร์มประเมินงานจากหน้างาน</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <Label>หัวข้อส่วนประเมิน</Label>
                      <Input value={evaluationForm.sectionTitle} onChange={(e) => patchEvaluationMeta("sectionTitle", e.target.value)} />
                      <div className="three-col">
                        <div>
                          <Label>Model</Label>
                          <select value={evaluationForm.modelId} onChange={(e) => selectEvaluationModel(e.target.value)} style={S.input}>
                            <option value="">เลือก Model</option>
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
                            <option value="">เลือก Part</option>
                            {evaluationPartOptions.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.partCode} - {entry.partName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>รหัสพนักงาน</Label>
                          <select value={evaluationForm.employeeCode} onChange={(e) => selectEvaluationEmployeeByCode(e.target.value)} style={S.input}>
                            <option value="">เลือกรหัสพนักงาน</option>
                            {activeEmployees.map((employee) => (
                              <option key={employee.id} value={employee.employeeCode}>
                                {employee.employeeCode}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>ชื่อพนักงาน</Label>
                          <select value={evaluationForm.employeeName} onChange={(e) => selectEvaluationEmployeeByName(e.target.value)} style={S.input}>
                            <option value="">เลือกชื่อพนักงาน</option>
                            {activeEmployees.map((employee) => (
                              <option key={employee.id} value={employee.fullName}>
                                {employee.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>ผู้ประเมิน</Label>
                          <select value={evaluationForm.evaluator} onChange={(e) => patchEvaluationMeta("evaluator", e.target.value)} style={S.input}>
                            <option value="">เลือกผู้ประเมิน</option>
                            {evaluationAssignedEvaluators.map((entry) => (
                              <option key={entry} value={entry}>{entry}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="evaluation-summary-strip">
                        <div className="mini-note">Part ที่เลือก: <strong>{evaluationPart ? `${evaluationPart.partCode} - ${evaluationPart.partName}` : "-"}</strong></div>
                        <div className="mini-note">คะแนนสอบล่าสุด: <strong>{latestEvaluationExamResult ? `${latestEvaluationExamResult.score}/${latestEvaluationExamResult.fullScore} (${latestEvaluationExamResult.status})` : "ยังไม่มีผลสอบของ Part นี้"}</strong></div>
                      </div>
                      {evaluationError ? <div className="alert-error">{evaluationError}</div> : null}
                      <div className="button-row">
                        <Button onClick={saveEvaluation}>บันทึกผลประเมิน</Button>
                        <Button variant="outline" onClick={resetEvaluation}>รีเซ็ตฟอร์ม</Button>
                        <Button variant="outline" onClick={exportEvaluationCsv}>Export CSV</Button>
                        <Button variant="outline" onClick={() => window.print()}>พิมพ์ฟอร์ม</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="evaluation-sheet-card">
                  <CardContent className="evaluation-sheet-wrap">
                    <div className="evaluation-sheet">
                      <div className="evaluation-sheet-title">{evaluationForm.sectionTitle}</div>
                      <div className="evaluation-sheet-meta">
                        <span>รหัสพนักงาน: <strong>{evaluationForm.employeeCode || "-"}</strong></span>
                        <span>ชื่อพนักงาน: <strong>{evaluationForm.employeeName || "-"}</strong></span>
                        <span>Model/Part: <strong>{evaluationModel && evaluationPart ? `${evaluationModel.modelCode} / ${evaluationPart.partCode}` : "-"}</strong></span>
                        <span>ผู้ประเมิน: <strong>{evaluationForm.evaluator || "-"}</strong></span>
                        <span>คะแนนสอบล่าสุด: <strong>{latestEvaluationExamResult ? `${latestEvaluationExamResult.score}/${latestEvaluationExamResult.fullScore} (${latestEvaluationExamResult.status})` : "-"}</strong></span>
                      </div>
                      <table className="evaluation-table">
                        <thead>
                          <tr>
                            <th rowSpan="2" className="col-no">ที่<br />No</th>
                            <th rowSpan="2" className="col-item">หัวข้อ<br />Item</th>
                            <th colSpan={scoreLevels.length}>ระดับการให้คะแนน<br />Score Level</th>
                            <th rowSpan="2" className="col-method">วิธีการ</th>
                            <th rowSpan="2" className="col-score">คะแนน<br />Score (A)</th>
                            <th rowSpan="2" className="col-weight">น้ำหนัก<br />Weight (B)</th>
                            <th rowSpan="2" className="col-total">คะแนนที่ได้<br />(A) x (B)</th>
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
                                  readOnly
                                  disabled
                                  className="evaluation-inline-input"
                                />
                              </td>
                              <td className="evaluation-number-cell">{Number(row.score || 0) * Number(row.weight || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={scoreLevels.length + 4}>รวมคะแนน</td>
                            <td>{evaluationTotal}</td>
                          </tr>
                          <tr>
                            <td colSpan={scoreLevels.length + 4}>คะแนนเต็มสูงสุด</td>
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
                        <h3>ประวัติผลประเมินย้อนหลัง</h3>
                        <p>ผูกกับพนักงานและ Part เดียวกับผลสอบ เพื่อย้อนดูได้ภายหลัง</p>
                      </div>
                      <div className="mini-note">
                        {evaluationStatus === "loading" ? "กำลังโหลด..." : `ตรงเงื่อนไข ${filteredEvaluationHistory.length} จาก ${evaluationHistory.length} รายการ`}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="dashboard-filters">
                      <div>
                        <Label>ค้นหา</Label>
                        <Input value={evaluationSearch} onChange={(e) => setEvaluationSearch(e.target.value)} placeholder="ชื่อ / รหัส / Model / Part / ผู้ประเมิน" />
                      </div>
                      <div>
                        <Label>Part</Label>
                        <select value={evaluationPartFilter} onChange={(e) => setEvaluationPartFilter(e.target.value)} style={S.input}>
                          <option value="ALL">ทั้งหมด</option>
                          {evaluationPartFilterOptions.map((entry) => (
                            <option key={entry.key} value={entry.key}>{entry.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>ผู้ประเมิน</Label>
                        <select value={evaluationEvaluatorFilter} onChange={(e) => setEvaluationEvaluatorFilter(e.target.value)} style={S.input}>
                          <option value="ALL">ทั้งหมด</option>
                          {evaluationHistoryEvaluatorOptions.map((entry) => (
                            <option key={entry} value={entry}>{entry}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {filteredEvaluationHistory.length === 0 ? (
                      <div className="empty-state">ยังไม่มีผลประเมินในระบบ</div>
                    ) : (
                      <div className="dashboard-table-wrap">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>เวลา</th>
                              <th>พนักงาน</th>
                              <th>Model / Part</th>
                              <th>คะแนนประเมิน</th>
                              <th>คะแนนสอบล่าสุด</th>
                              <th>ผู้ประเมิน</th>
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
                        <h3>จัดการข้อมูลพนักงาน</h3>
                        <p>สร้างบัญชีผู้ใช้งาน กำหนดสิทธิ์ และตั้งค่าการเข้าใช้งานจากฐานข้อมูลกลาง</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="form-stack">
                      <div className="two-col">
                        <div>
                          <Label>รหัสพนักงาน</Label>
                          <Input value={employeeForm.employeeCode} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, employeeCode: e.target.value }))} />
                        </div>
                        <div>
                          <Label>สิทธิ์</Label>
                          <select value={employeeForm.role} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, role: e.target.value }))} style={S.input}>
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </div>
                      </div>
                      <div className="mini-note">ระบบจะใช้รหัสพนักงานเป็นรหัสล็อกอินโดยอัตโนมัติ</div>
                      <Label>ชื่อ-นามสกุล</Label>
                      <Input value={employeeForm.fullName} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, fullName: e.target.value }))} />
                      <div className="two-col">
                        <div>
                          <Label>แผนก</Label>
                          <Input value={employeeForm.department} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department: e.target.value }))} />
                        </div>
                        <div>
                          <Label>ตำแหน่ง</Label>
                          <Input value={employeeForm.position} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, position: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>รูปพนักงาน</Label>
                        <Input value={employeeForm.photoUrl} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, photoUrl: e.target.value }))} placeholder="วาง URL หรือใช้ปุ่มเลือกรูป" />
                        <label className="upload-button" style={{ marginTop: 10 }}>
                          <ImagePlus size={16} /> เลือกรูปพนักงาน
                          <input type="file" accept="image/*" hidden onChange={(e) => uploadEmployeePhoto(e.target.files?.[0])} />
                        </label>
                        {employeeForm.photoUrl ? (
                          <div className="employee-photo-preview">
                            <img src={employeeForm.photoUrl} alt={employeeForm.fullName || "employee"} />
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <Label>สถานะ</Label>
                        <select value={employeeForm.isActive ? "ACTIVE" : "INACTIVE"} onChange={(e) => setEmployeeForm((prev) => ({ ...prev, isActive: e.target.value === "ACTIVE" }))} style={S.input}>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>
                      {employeeError ? <div className="alert-error">{employeeError}</div> : null}
                      <div className="button-row">
                        <Button onClick={saveEmployee}>{editingEmployeeId ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}</Button>
                        <Button variant="outline" onClick={resetEmployeeForm}>ล้างฟอร์ม</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="table-header-row">
                      <div>
                        <h3>รายชื่อพนักงาน</h3>
                        <p>จำนวนทั้งหมด {employees.length} คน {employeeStatus === "loading" ? "(กำลังโหลด...)" : ""}</p>
                      </div>
                      <Button variant="outline" onClick={exportEmployeesDataset} disabled={!employees.length}>
                        <FileJson size={16} /> Export Employees JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {employees.length === 0 ? (
                      <div className="empty-state">ยังไม่มีรายชื่อพนักงานในระบบ</div>
                    ) : (
                      <div className="dashboard-table-wrap">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>รูป</th>
                              <th>ชื่อ</th>
                              <th>รหัสพนักงาน</th>
                              <th>แผนก/ตำแหน่ง</th>
                              <th>สิทธิ์</th>
                              <th>สถานะ</th>
                              <th>จัดการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((employee) => (
                              <tr key={employee.id}>
                                <td>{employee.photoUrl ? <div className="employee-table-photo"><img src={employee.photoUrl} alt={employee.fullName} /></div> : <span>-</span>}</td>
                                <td>{employee.fullName}</td>
                                <td>{employee.employeeCode}</td>
                                <td>{employee.department || "-"} / {employee.position || "-"}</td>
                                <td>{employee.role}</td>
                                <td>{employee.isActive ? "ACTIVE" : "INACTIVE"}</td>
                                <td>
                                  <div className="button-row">
                                    <Button variant="outline" onClick={() => startEditEmployee(employee)}>แก้ไข</Button>
                                    <Button variant="destructive" onClick={() => removeEmployee(employee)} disabled={employee.username === "ADMIN1234"}>ลบ</Button>
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

          {isAdmin ? <TabsContent value="employee-results"><div className="dashboard-layout"><Card><CardContent><div className="dashboard-filters"><div><Label>Employee name</Label><select value={employeeResultsEmployeeFilter} onChange={(e) => setEmployeeResultsEmployeeFilter(e.target.value)} style={S.input}><option value="ALL">All</option>{employeeResultOptions.map((entry) => <option key={entry.candidateCode} value={entry.candidateCode}>{entry.candidateName} ({entry.candidateCode})</option>)}</select></div><div><Label>Latest status</Label><select value={employeeResultsStatusFilter} onChange={(e) => setEmployeeResultsStatusFilter(e.target.value)} style={S.input}><option value="ALL">All</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></div><div><Label>Matched employees</Label><Input value={employeeResultSummaries.length} readOnly /></div><div><Label>Export</Label><Button variant="outline" onClick={exportSelectedEmployeeResultsCsv} disabled={!selectedEmployeeResults.length}>Export employee CSV</Button></div></div></CardContent></Card><div className="employee-results-layout"><Card><CardHeader><div className="section-heading"><Users size={18} /><div><h3>Employees with exam history</h3><p>Select an employee to view recent attempts and score trends.</p></div></div></CardHeader><CardContent className="employee-result-list">{employeeResultSummaries.length === 0 ? <div className="empty-state">No employee results matched the current filter.</div> : employeeResultSummaries.map((entry) => <button key={entry.candidateCode} className={`employee-result-row ${selectedEmployeeResultCode === entry.candidateCode ? "is-active" : ""}`.trim()} onClick={() => setSelectedEmployeeResultCode(entry.candidateCode)}><div><strong>{entry.candidateName}</strong><div className="employee-result-meta">{entry.candidateCode} | Latest {entry.latestModelPart || "-"}</div></div><div className="employee-result-side"><span className={`status-pill status-${String(entry.latestStatus || "").toLowerCase()}`.trim()}>{entry.latestStatus}</span><strong>{entry.avgPct}%</strong></div></button>)}</CardContent></Card><Card><CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>Employee exam summary</h3><p>See attempt count, pass count, and the detailed exam list for the selected person.</p></div></div></CardHeader><CardContent>{selectedEmployeeResults.length === 0 ? <div className="empty-state">Select an employee from the list to view detailed attempts.</div> : <div className="detail-stack"><div className="dashboard-stats"><Card className="metric-card"><CardContent><div className="metric-label">Attempts</div><div className="metric-value">{selectedEmployeeResults.length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Passed</div><div className="metric-value">{selectedEmployeeResults.filter((entry) => entry.status === "PASS").length}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">Average score</div><div className="metric-value">{Math.round(selectedEmployeeResults.reduce((sum, entry) => sum + (entry.fullScore ? (entry.score / entry.fullScore) * 100 : 0), 0) / selectedEmployeeResults.length)}%</div></CardContent></Card></div><div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Time</th><th>Model/Part</th><th>Score</th><th>Status</th></tr></thead><tbody>{selectedEmployeeResults.map((entry) => <tr key={entry.id}><td>{new Date(entry.submittedAt).toLocaleString()}</td><td>{entry.modelCode}/{entry.partCode} - {entry.partName}</td><td>{entry.score}/{entry.fullScore}</td><td><span className={`status-pill status-${String(entry.status || "").toLowerCase()}`.trim()}>{entry.status}</span></td></tr>)}</tbody></table></div></div>}</CardContent></Card></div></div></TabsContent> : null}

          {isAdmin ? <TabsContent value="dashboard"><div className="dashboard-layout"><Card><CardContent><div className="dashboard-filters"><div><Label>Model</Label><select value={dashboardModelFilter} onChange={(e) => { setDashboardModelFilter(e.target.value); setDashboardPartFilter("ALL"); }} style={S.input}><option value="ALL">ทั้งหมด</option>{dashboardModelOptions.map((m) => <option key={m.modelCode} value={m.modelCode}>{m.modelCode} - {m.modelName}</option>)}</select></div><div><Label>Part</Label><select value={dashboardPartFilter} onChange={(e) => setDashboardPartFilter(e.target.value)} style={S.input}><option value="ALL">ทั้งหมด</option>{dashboardPartOptions.map((p) => <option key={p.key} value={p.key}>{p.modelCode}/{p.partCode} - {p.partName}</option>)}</select></div><div><Label>สถานะ</Label><select value={dashboardStatusFilter} onChange={(e) => setDashboardStatusFilter(e.target.value)} style={S.input}><option value="ALL">ทั้งหมด</option><option value="PASS">PASS</option><option value="FAIL">FAIL</option></select></div><div><Label>ค้นหา</Label><Input value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} placeholder="ชื่อ / รหัส / Model / Part" /></div></div></CardContent></Card><div className="dashboard-stats"><Card className="metric-card"><CardContent><div className="metric-label">จำนวนครั้งสอบทั้งหมด</div><div className="metric-value">{dashboardSummary.attempts}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">จำนวนที่ผ่าน</div><div className="metric-value">{dashboardSummary.passed}</div></CardContent></Card><Card className="metric-card"><CardContent><div className="metric-label">คะแนนเฉลี่ยรวม</div><div className="metric-value">{dashboardSummary.avgPct}%</div></CardContent></Card></div><Card><CardHeader><div className="table-header-row"><div><h3>สรุปราย Model / Part</h3><p>ดูจำนวนครั้ง อัตราผ่าน และคะแนนเฉลี่ยแยกตามสายการสอบ</p></div><div className="button-row"><Button variant="outline" onClick={exportDashboardSummaryCsv}>Export Summary CSV</Button><Button variant="outline" onClick={exportDashboardHistoryCsv}>Export History CSV</Button><Button variant="outline" onClick={() => { if (window.confirm("ต้องการล้างผลสอบทั้งหมดหรือไม่")) setResultHistory([]); }}>ล้างข้อมูล Dashboard</Button></div></div></CardHeader><CardContent>{byModelPart.length === 0 ? <div className="empty-state">ยังไม่มีผลสอบในระบบ</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Model</th><th>Part</th><th>จำนวนครั้ง</th><th>ผ่าน</th><th>อัตราผ่าน</th><th>คะแนนเฉลี่ย</th></tr></thead><tbody>{byModelPart.map((row, idx) => <tr key={`${row.modelCode}-${row.partCode}-${idx}`}><td>{row.modelCode} - {row.modelName}</td><td>{row.partCode} - {row.partName}</td><td>{row.attempts}</td><td>{row.passed}</td><td>{row.passRate}%</td><td>{row.avgPct}%</td></tr>)}</tbody></table></div>}</CardContent></Card><Card><CardHeader><div className="section-heading"><BarChart3 size={18} /><div><h3>ผลสอบล่าสุด</h3><p>แสดงข้อมูลล่าสุด 20 รายการตามตัวกรองปัจจุบัน</p></div></div></CardHeader><CardContent>{filteredHistory.length === 0 ? <div className="empty-state">ยังไม่มีผลสอบในระบบ</div> : <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>เวลา</th><th>พนักงาน</th><th>Model/Part</th><th>คะแนน</th><th>สถานะ</th></tr></thead><tbody>{filteredHistory.slice(0, 20).map((r) => <tr key={r.id}><td>{new Date(r.submittedAt).toLocaleString()}</td><td>{r.candidateName} ({r.candidateCode})</td><td>{r.modelCode}/{r.partCode}</td><td>{r.score}/{r.fullScore}</td><td>{r.status}</td></tr>)}</tbody></table></div>}</CardContent></Card></div></TabsContent> : null}

          {isAdmin ? <TabsContent value="importexport"><div className="io-grid"><Card><CardHeader><div className="section-heading"><FileJson size={18} /><div><h3>Export JSON (Model/Part)</h3><p>สำรองโครงสร้างคลังข้อสอบเพื่อย้ายหรือเก็บเวอร์ชัน</p></div></div></CardHeader><CardContent className="io-card-content"><Textarea rows={18} value={JSON.stringify(bank, null, 2)} readOnly className="mono-textarea" /><Button onClick={exportJSON}><FileJson size={16} /> ดาวน์โหลด JSON</Button></CardContent></Card><Card><CardHeader><div className="section-heading"><FileJson size={18} /><div><h3>Import JSON</h3><p>วางข้อความหรือเลือกไฟล์ JSON แล้วระบบจะจัดรูปแบบให้เข้ากับ UI อัตโนมัติ</p></div></div></CardHeader><CardContent className="io-card-content"><Textarea rows={18} value={importText} onChange={(e) => setImportText(e.target.value)} className="mono-textarea" /><label className="upload-button"><FileJson size={16} /> เลือกไฟล์ JSON<input type="file" accept=".json,application/json" hidden onChange={(e) => importJSONFile(e.target.files?.[0])} /></label><div className="button-row"><Button onClick={importJSON}>Import JSON</Button><Button variant="outline" onClick={() => setImportText("")}>ล้างข้อความ</Button></div></CardContent></Card></div></TabsContent> : null}
        </Tabs>
      </div>
    </div>
  );
}
