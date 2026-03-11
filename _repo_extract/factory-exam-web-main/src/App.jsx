import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ImagePlus, Save, BookOpen, ClipboardCheck, FileJson, Eye, Settings2, Trophy, BarChart3 } from "lucide-react";
import "./App.css";

const STORAGE_KEY = "factory_exam_builder_v2";
const RESULTS_KEY = "factory_exam_results_v1";
const uid = () => Math.random().toString(36).slice(2, 10);

const S = {
  card: { border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff" },
  btn: { border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", background: "#fff", cursor: "pointer" },
  input: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" },
};

const Card = ({ children }) => <div style={S.card}>{children}</div>;
const CardHeader = ({ children }) => <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9" }}>{children}</div>;
const CardContent = ({ children }) => <div style={{ padding: 16 }}>{children}</div>;
const Label = ({ children }) => <label style={{ fontSize: 13, fontWeight: 600 }}>{children}</label>;
const Input = (p) => <input {...p} style={{ ...S.input, ...(p.style || {}) }} />;
const Textarea = (p) => <textarea {...p} style={{ ...S.input, resize: "vertical", ...(p.style || {}) }} />;
const Badge = ({ children, outline = false }) => <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, border: outline ? "1px solid #cbd5e1" : "none", background: outline ? "#fff" : "#0f172a", color: outline ? "#0f172a" : "#fff" }}>{children}</span>;
const Button = ({ children, onClick, variant = "default", disabled = false }) => {
  const style = { ...S.btn, background: variant === "default" ? "#0f172a" : variant === "destructive" ? "#b91c1c" : "#fff", color: variant === "outline" ? "#0f172a" : "#fff", borderColor: variant === "outline" ? "#cbd5e1" : "transparent", opacity: disabled ? 0.5 : 1 };
  return <button disabled={disabled} onClick={onClick} style={style}>{children}</button>;
};

const TabsCtx = createContext(null);
const Tabs = ({ defaultValue, children }) => { const [value, setValue] = useState(defaultValue); return <TabsCtx.Provider value={{ value, setValue }}>{children}</TabsCtx.Provider>; };
const TabsList = ({ children }) => <div className="tabs-list">{children}</div>;
const TabsTrigger = ({ value, children }) => { const c = useContext(TabsCtx); const a = c?.value === value; return <button onClick={() => c?.setValue(value)} style={{ ...S.btn, background: a ? "#0f172a" : "#fff", color: a ? "#fff" : "#0f172a" }}>{children}</button>; };
const TabsContent = ({ value, children }) => { const c = useContext(TabsCtx); return c?.value === value ? <div style={{ marginTop: 12 }}>{children}</div> : null; };
const Progress = ({ value }) => <div style={{ width: "100%", background: "#e2e8f0", height: 10, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, background: "#0f172a", height: "100%" }} /></div>;

const emptyQ = (i = 1) => ({ id: uid(), questionNo: i, questionText: "", imageUrl: "", choices: { A: "", B: "", C: "", D: "" }, correctAnswer: "A", score: 2 });
const starterQs = () => [{ ...emptyQ(1), questionText: "ข้อใดคือวิธีตรวจสอบชิ้นงานก่อนเริ่มงานอย่างถูกต้อง", choices: { A: "ตรวจตาม WI และจุดควบคุม", B: "ดูคร่าว ๆ แล้วเริ่มงานได้เลย", C: "ถามเพื่อนข้าง ๆ อย่างเดียว", D: "ข้ามการตรวจสอบถ้างานรีบ" } }, { ...emptyQ(2), questionText: "เมื่อพบ NG ระหว่างการผลิต ควรทำอย่างไรเป็นอันดับแรก", correctAnswer: "B", choices: { A: "ปล่อยผ่านเพราะยังผลิตได้", B: "แยกงาน แจ้ง Leader และบันทึกตามระบบ", C: "นำไปใส่กล่องดีปนกัน", D: "รอให้ QA มาเจอเอง" } }];
const emptyPart = (i = 1, starter = false) => ({ id: uid(), partCode: `Part${String(i).padStart(2, "0")}`, partName: `Part ${i}`, subtitle: "ระบบข้อสอบออนไลน์พนักงาน", passScore: 35, randomizeQuestions: false, showResultImmediately: true, questions: starter ? starterQs() : [emptyQ(1)] });
const emptyModel = (i = 1, starter = false) => ({ id: uid(), modelCode: `RG${String(i).padStart(2, "0")}`, modelName: `Model ${i}`, parts: Array.from({ length: 5 }, (_, idx) => emptyPart(idx + 1, starter && idx === 0)) });
const starterBank = () => ({ title: "Factory Online Exam", models: [emptyModel(1, true)] });

const reorder = (qs) => qs.map((q, i) => ({ ...q, questionNo: i + 1 }));
const full = (qs) => qs.reduce((s, q) => s + Number(q.score || 0), 0);
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
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
    return {
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
          passScore: Number(p.passScore ?? 35),
          randomizeQuestions: Boolean(p.randomizeQuestions),
          showResultImmediately: p.showResultImmediately !== false,
          questions: reorder((Array.isArray(p.questions) && p.questions.length ? p.questions : [emptyQ(1)]).map((q, qi) => ({ ...emptyQ(qi + 1), ...q, id: q.id || uid(), choices: { A: q.choices?.A || "", B: q.choices?.B || "", C: q.choices?.C || "", D: q.choices?.D || "" } }))),
        })),
      })),
    };
  }
  if (Array.isArray(raw?.questions)) {
    const b = starterBank();
    b.title = raw.title || b.title;
    b.models[0].modelCode = raw.modelCode || b.models[0].modelCode;
    b.models[0].parts = [{ ...emptyPart(1), partCode: raw.partCode || "Part01", partName: raw.partName || "Part 1", subtitle: raw.subtitle || "ระบบข้อสอบออนไลน์พนักงาน", passScore: Number(raw.passScore ?? 35), randomizeQuestions: Boolean(raw.randomizeQuestions), showResultImmediately: raw.showResultImmediately !== false, questions: reorder(raw.questions.map((q, i) => ({ ...emptyQ(i + 1), ...q, id: q.id || uid(), choices: { A: q.choices?.A || "", B: q.choices?.B || "", C: q.choices?.C || "", D: q.choices?.D || "" } }))) }];
    return b;
  }
  return starterBank();
}

const loadBank = () => { try { const s = localStorage.getItem(STORAGE_KEY); return s ? normalize(JSON.parse(s)) : starterBank(); } catch { return starterBank(); } };
const loadResults = () => { try { const s = localStorage.getItem(RESULTS_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };

export default function App() {
  const [bank, setBank] = useState(loadBank);
  const [modelId, setModelId] = useState(() => loadBank().models[0]?.id || null);
  const [partId, setPartId] = useState(() => loadBank().models[0]?.parts[0]?.id || null);
  const [qId, setQId] = useState(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateCode, setCandidateCode] = useState("");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [importText, setImportText] = useState("");
  const [resultHistory, setResultHistory] = useState(loadResults);
  const [dashboardModelFilter, setDashboardModelFilter] = useState("ALL");
  const [dashboardPartFilter, setDashboardPartFilter] = useState("ALL");
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState("ALL");
  const [dashboardSearch, setDashboardSearch] = useState("");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(bank)); }, [bank]);
  useEffect(() => { localStorage.setItem(RESULTS_KEY, JSON.stringify(resultHistory)); }, [resultHistory]);

  const model = useMemo(() => bank.models.find((m) => m.id === modelId) || bank.models[0], [bank.models, modelId]);
  const part = useMemo(() => model?.parts.find((p) => p.id === partId) || model?.parts[0], [model, partId]);
  const question = useMemo(() => part?.questions.find((q) => q.id === qId) || part?.questions[0] || null, [part, qId]);

  useEffect(() => { if (model && model.id !== modelId) { setModelId(model.id); setPartId(model.parts[0]?.id || null); } }, [model, modelId]);
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

  const dashboardModelOptions = useMemo(() => {
    const map = new Map();
    resultHistory.forEach((r) => {
      if (!map.has(r.modelCode)) map.set(r.modelCode, r.modelName);
    });
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
      if (q) {
        const hay = `${r.candidateName} ${r.candidateCode} ${r.modelCode} ${r.modelName} ${r.partCode} ${r.partName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resultHistory, dashboardModelFilter, dashboardPartFilter, dashboardStatusFilter, dashboardSearch]);

  const dashboardSummary = useMemo(() => {
    const attempts = filteredHistory.length;
    const passed = filteredHistory.filter((r) => r.status === "PASS").length;
    const avgPct = attempts ? Math.round((filteredHistory.reduce((sum, r) => sum + (r.fullScore ? (r.score / r.fullScore) * 100 : 0), 0) / attempts)) : 0;
    return {
      attempts,
      passed,
      passRate: attempts ? Math.round((passed / attempts) * 100) : 0,
      avgPct,
    };
  }, [filteredHistory]);

  const byModelPart = useMemo(() => {
    const map = new Map();
    filteredHistory.forEach((r) => {
      const key = `${r.modelId}_${r.partId}`;
      const prev = map.get(key) || {
        modelCode: r.modelCode,
        modelName: r.modelName,
        partCode: r.partCode,
        partName: r.partName,
        attempts: 0,
        passed: 0,
        scorePctSum: 0,
      };
      prev.attempts += 1;
      prev.passed += r.status === "PASS" ? 1 : 0;
      prev.scorePctSum += r.fullScore ? (r.score / r.fullScore) * 100 : 0;
      map.set(key, prev);
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        passRate: row.attempts ? Math.round((row.passed / row.attempts) * 100) : 0,
        avgPct: row.attempts ? Math.round(row.scorePctSum / row.attempts) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [filteredHistory]);

  const patchModel = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => m.id === modelId ? { ...m, [f]: v } : m) }));
  const patchPart = (f, v) => setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id === partId ? { ...p, [f]: v } : p) }) }));
  const patchQ = (id, patch) => setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id !== partId ? p : { ...p, questions: p.questions.map((q) => q.id === id ? { ...q, ...patch } : q) }) }) }));
  const patchChoice = (id, k, v) => patchQ(id, { choices: { ...question.choices, [k]: v } });

  const addModel = () => { const n = emptyModel(bank.models.length + 1, false); setBank((b) => ({ ...b, models: [...b.models, n] })); setModelId(n.id); setPartId(n.parts[0].id); setQId(n.parts[0].questions[0].id); };
  const removeModel = () => { if (bank.models.length <= 1) return alert("ต้องมีอย่างน้อย 1 Model"); const r = bank.models.filter((m) => m.id !== model.id); setBank((b) => ({ ...b, models: r })); setModelId(r[0].id); setPartId(r[0].parts[0].id); };
  const addPart = () => { if (model.parts.length >= 6) return alert("1 Model เพิ่มได้สูงสุด 6 Part"); const n = emptyPart(model.parts.length + 1, false); setBank((b) => ({ ...b, models: b.models.map((m) => m.id === modelId ? { ...m, parts: [...m.parts, n] } : m) })); setPartId(n.id); setQId(n.questions[0].id); };
  const removePart = () => { if (model.parts.length <= 1) return alert("ต้องมีอย่างน้อย 1 Part ต่อ Model"); const r = model.parts.filter((p) => p.id !== part.id); setBank((b) => ({ ...b, models: b.models.map((m) => m.id === modelId ? { ...m, parts: r } : m) })); setPartId(r[0].id); setQId(r[0].questions[0].id); };
  const addQ = () => { const n = emptyQ(part.questions.length + 1); setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id === partId ? { ...p, questions: [...p.questions, n] } : p) }) })); setQId(n.id); };
  const dupQ = () => { const n = { ...question, id: uid(), questionNo: part.questions.length + 1 }; setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id === partId ? { ...p, questions: reorder([...p.questions, n]) } : p) }) })); setQId(n.id); };
  const delQ = () => { const r = reorder(part.questions.filter((q) => q.id !== question.id)); setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id === partId ? { ...p, questions: r } : p) }) })); setQId(r[0]?.id || null); };
  const moveQ = (d) => { const i = part.questions.findIndex((q) => q.id === question.id); const ni = i + d; if (ni < 0 || ni >= part.questions.length) return; const arr = [...part.questions]; [arr[i], arr[ni]] = [arr[ni], arr[i]]; setBank((b) => ({ ...b, models: b.models.map((m) => m.id !== modelId ? m : { ...m, parts: m.parts.map((p) => p.id === partId ? { ...p, questions: reorder(arr) } : p) }) })); };
  const uploadImg = (file) => { if (!file) return; const r = new FileReader(); r.onload = (e) => patchQ(question.id, { imageUrl: String(e.target?.result || "") }); r.readAsDataURL(file); };

  const submit = () => {
    if (submitted) return;
    if (answered < part.questions.length) return setSubmitError(`กรุณาตอบให้ครบก่อนส่ง (${answered}/${part.questions.length})`);
    setSubmitError("");
    setSubmitted(true);
    const entry = {
      id: uid(),
      submittedAt: new Date().toISOString(),
      candidateName: candidateName || "-",
      candidateCode: candidateCode || "-",
      modelId: model.id,
      modelCode: model.modelCode,
      modelName: model.modelName,
      partId: part.id,
      partCode: part.partCode,
      partName: part.partName,
      score: result.score,
      fullScore: scoreFull,
      passScore: part.passScore,
      correct: result.correct,
      questionCount: part.questions.length,
      status: result.status,
    };
    setResultHistory((prev) => [entry, ...prev].slice(0, 1000));
  };
  const reset = () => { setAnswers({}); setSubmitted(false); setSubmitError(""); };

  const exportJSON = () => { const blob = new Blob([JSON.stringify(bank, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "factory_exam_bank.json"; a.click(); URL.revokeObjectURL(url); };
  const importJSON = () => { try { const n = normalize(JSON.parse(importText)); setBank(n); setModelId(n.models[0].id); setPartId(n.models[0].parts[0].id); setQId(n.models[0].parts[0].questions[0]?.id || null); setImportText(""); reset(); } catch (e) { alert(`Import ไม่สำเร็จ: ${e.message}`); } };
  const saveLocal = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(bank)); alert("บันทึกคลังข้อสอบ Model/Part ไว้ในเครื่องเรียบร้อยแล้ว"); };

  const exportCSV = () => {
    if (!submitted) return alert("กรุณาส่งคำตอบก่อนจึงจะบันทึกผลสอบได้");
    const now = new Date().toISOString();
    const rows = previewQs.map((q, i) => {
      const s = answers[q.id] || "-";
      const ok = s === q.correctAnswer;
      const sc = Number(q.score || 0);
      return [i + 1, q.questionText || "", s, q.correctAnswer, ok ? "TRUE" : "FALSE", sc, ok ? sc : 0];
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

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          <Card><CardContent><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}><Badge>Exam Builder UI</Badge><Badge outline>Model / Part</Badge></div><h1 style={{ margin: 0 }}>{bank.title}</h1><p>แยกข้อสอบเป็น Model และใน 1 Model มีได้ 5-6 Part</p></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(140px,1fr))", gap: 8 }}><div style={{ background: "#e2e8f0", borderRadius: 12, padding: 12 }}><div>จำนวน Model</div><strong>{bank.models.length}</strong></div><div style={{ background: "#e2e8f0", borderRadius: 12, padding: 12 }}><div>Part ใน Model</div><strong>{model.parts.length}</strong></div></div></div></CardContent></Card>
          <Card><CardContent><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={addQ}><Plus size={16} /> เพิ่มข้อสอบใหม่</Button><Button variant="outline" onClick={saveLocal}><Save size={16} /> บันทึกไว้ในเครื่อง</Button><Button variant="outline" onClick={exportJSON}><FileJson size={16} /> Export JSON</Button></div></CardContent></Card>
        </motion.div>

        <Tabs defaultValue="builder">
          <TabsList>
            <TabsTrigger value="builder"><Settings2 size={16} /> Admin Builder</TabsTrigger>
            <TabsTrigger value="preview"><Eye size={16} /> Student Preview</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 size={16} /> Dashboard</TabsTrigger>
            <TabsTrigger value="importexport"><FileJson size={16} /> Import / Export</TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <div className="split-grid">
              <Card>
                <CardHeader><h3 style={{ margin: 0, fontSize: 18 }}><BookOpen size={16} /> ตั้งค่า Model / Part</h3></CardHeader>
                <CardContent>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Label>ชื่อระบบ</Label><Input value={bank.title} onChange={(e) => setBank((b) => ({ ...b, title: e.target.value }))} />
                    <Label>Model</Label>
                    <select value={model.id} onChange={(e) => { setModelId(e.target.value); const m = bank.models.find((x) => x.id === e.target.value); setPartId(m.parts[0].id); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select>
                    <div style={{ display: "flex", gap: 8 }}><Button onClick={addModel}><Plus size={16} /> เพิ่ม Model</Button><Button variant="destructive" onClick={removeModel}><Trash2 size={16} /> ลบ Model</Button></div>
                    <Label>Model Code</Label><Input value={model.modelCode} onChange={(e) => patchModel("modelCode", e.target.value)} />
                    <Label>Model Name</Label><Input value={model.modelName} onChange={(e) => patchModel("modelName", e.target.value)} />

                    <Label>Part</Label>
                    <select value={part.id} onChange={(e) => setPartId(e.target.value)} style={S.input}>{model.parts.map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select>
                    <div style={{ display: "flex", gap: 8 }}><Button disabled={model.parts.length >= 6} onClick={addPart}><Plus size={16} /> เพิ่ม Part</Button><Button variant="destructive" onClick={removePart}><Trash2 size={16} /> ลบ Part</Button></div>
                    <div style={{ fontSize: 12, color: "#475569" }}>Model นี้มี {model.parts.length} Part (สูงสุด 6)</div>

                    <Label>Part Code</Label><Input value={part.partCode} onChange={(e) => patchPart("partCode", e.target.value)} />
                    <Label>Part Name</Label><Input value={part.partName} onChange={(e) => patchPart("partName", e.target.value)} />
                    <Label>คำอธิบาย</Label><Input value={part.subtitle} onChange={(e) => patchPart("subtitle", e.target.value)} />
                    <Label>Pass Score</Label><Input type="number" value={part.passScore} onChange={(e) => patchPart("passScore", Number(e.target.value))} />
                    <Label>Full Score</Label><Input type="number" value={scoreFull} disabled style={{ background: "#f1f5f9" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>สุ่มลำดับข้อสอบ</span><Button variant={part.randomizeQuestions ? "default" : "outline"} onClick={() => patchPart("randomizeQuestions", !part.randomizeQuestions)}>{part.randomizeQuestions ? "ON" : "OFF"}</Button></div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>แสดงผลทันทีหลังส่ง</span><Button variant={part.showResultImmediately ? "default" : "outline"} onClick={() => patchPart("showResultImmediately", !part.showResultImmediately)}>{part.showResultImmediately ? "ON" : "OFF"}</Button></div>

                    <div style={{ maxHeight: 300, overflow: "auto", display: "grid", gap: 8 }}>
                      {part.questions.map((q, i) => <button key={q.id} onClick={() => setQId(q.id)} style={{ ...S.btn, textAlign: "left", background: q.id === question?.id ? "#0f172a" : "#fff", color: q.id === question?.id ? "#fff" : "#0f172a" }}><div>ข้อ {i + 1}</div><div>{q.questionText || "ยังไม่ได้กรอกคำถาม"}</div><div>{q.score} คะแนน</div></button>)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><h3 style={{ margin: 0, fontSize: 18 }}><ClipboardCheck size={16} /> แก้ไขข้อสอบ</h3></CardHeader>
                <CardContent>
                  {!question ? <div>ยังไม่มีข้อสอบ</div> : <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button variant="outline" onClick={() => moveQ(-1)}>ขึ้น</Button><Button variant="outline" onClick={() => moveQ(1)}>ลง</Button><Button variant="outline" onClick={dupQ}>คัดลอก</Button><Button variant="destructive" onClick={delQ}><Trash2 size={16} /> ลบ</Button></div>
                    <Label>คำถาม</Label><Textarea rows={3} value={question.questionText} onChange={(e) => patchQ(question.id, { questionText: e.target.value })} />
                    <Label>คะแนน</Label><Input type="number" value={question.score} onChange={(e) => patchQ(question.id, { score: Number(e.target.value) })} />
                    <Label>คำตอบที่ถูก</Label><select value={question.correctAnswer} onChange={(e) => patchQ(question.id, { correctAnswer: e.target.value })} style={S.input}><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
                    <Label>ลิงก์รูปภาพ</Label><Input value={question.imageUrl} onChange={(e) => patchQ(question.id, { imageUrl: e.target.value })} />
                    <label style={{ ...S.btn, display: "inline-flex", width: "fit-content", alignItems: "center", gap: 8 }}><ImagePlus size={16} /> เลือกรูป<input type="file" accept="image/*" hidden onChange={(e) => uploadImg(e.target.files?.[0])} /></label>
                    {question.imageUrl ? <img src={question.imageUrl} alt="q" style={{ maxHeight: 320, width: "100%", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 12 }} /> : null}
                    <div className="choice-grid">{["A", "B", "C", "D"].map((k) => <Card key={k}><CardContent><Label>ตัวเลือก {k}</Label><Textarea rows={3} value={question.choices[k]} onChange={(e) => patchChoice(question.id, k, e.target.value)} /><Button variant="outline" onClick={() => patchQ(question.id, { correctAnswer: k })}>ตั้งเป็นคำตอบที่ถูก</Button></CardContent></Card>)}</div>
                  </div>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="split-grid">
              <Card>
                <CardHeader><h3 style={{ margin: 0, fontSize: 18 }}>ข้อมูลผู้เข้าสอบ</h3></CardHeader>
                <CardContent>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Label>Model</Label><select value={model.id} onChange={(e) => { setModelId(e.target.value); const m = bank.models.find((x) => x.id === e.target.value); setPartId(m.parts[0].id); }} style={S.input}>{bank.models.map((m) => <option key={m.id} value={m.id}>{m.modelCode} - {m.modelName}</option>)}</select>
                    <Label>Part</Label><select value={part.id} onChange={(e) => setPartId(e.target.value)} style={S.input}>{model.parts.map((p) => <option key={p.id} value={p.id}>{p.partCode} - {p.partName}</option>)}</select>
                    <Label>ชื่อพนักงาน</Label><Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
                    <Label>รหัสพนักงาน</Label><Input value={candidateCode} onChange={(e) => setCandidateCode(e.target.value)} />
                    <div><div style={{ marginBottom: 8 }}>{answered}/{part.questions.length}</div><Progress value={progress} /></div>
                    <Button onClick={submit}>ส่งคำตอบ</Button>
                    {submitError ? <div className="alert-error">{submitError}</div> : null}
                    <Button variant="outline" disabled={!submitted} onClick={exportCSV}>บันทึกผลสอบเป็น CSV</Button>
                    <Button variant="outline" onClick={reset}>เริ่มทำใหม่</Button>
                  </div>
                </CardContent>
              </Card>

              <div style={{ display: "grid", gap: 12 }}>
                <Card><CardContent><div style={{ display: "flex", gap: 8, marginBottom: 8 }}><Badge>{model.modelCode}</Badge><Badge outline>{part.partCode}</Badge></div><h2 style={{ marginBottom: 8 }}>{bank.title}</h2><div style={{ fontWeight: 600 }}>{model.modelName} | {part.partName}</div><div style={{ color: "#475569" }}>{part.subtitle}</div></CardContent></Card>
                {previewQs.map((q, i) => <Card key={q.id}><CardContent><div>ข้อ {i + 1}</div><h3>{q.questionText}</h3><div>{q.score} คะแนน</div>{q.imageUrl ? <img src={q.imageUrl} alt={`q-${i + 1}`} style={{ maxHeight: 320, width: "100%", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 12 }} /> : null}<div style={{ display: "grid", gap: 8 }}>{["A", "B", "C", "D"].map((k) => { const sel = answers[q.id] === k; const ok = q.correctAnswer === k; let bg = "#fff", c = "#0f172a"; if (sel) { bg = "#0f172a"; c = "#fff"; } if (submitted && ok) { bg = "#dcfce7"; c = "#14532d"; } if (submitted && sel && !ok) { bg = "#fee2e2"; c = "#7f1d1d"; } return <button key={k} onClick={() => !submitted && setAnswers((p) => ({ ...p, [q.id]: k }))} style={{ ...S.btn, textAlign: "left", background: bg, color: c }}><strong>{k}.</strong> {q.choices[k]}</button>; })}</div></CardContent></Card>)}
                {submitted && part.showResultImmediately ? <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Card><CardContent><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><Trophy size={18} /> <strong>ผลการสอบ</strong></div><h2 style={{ margin: "8px 0" }}>{result.score} / {scoreFull}</h2><div>ตอบถูก {result.correct} จาก {part.questions.length} ข้อ</div></div><div style={{ borderRadius: 12, padding: 14, background: result.status === "PASS" ? "#dcfce7" : "#fee2e2" }}><div>สถานะ</div><strong>{result.status}</strong></div></div></CardContent></Card></motion.div> : null}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dashboard">
            <div style={{ display: "grid", gap: 12 }}>
              <Card>
                <CardContent>
                  <div className="dashboard-filters">
                    <div>
                      <Label>Model</Label>
                      <select value={dashboardModelFilter} onChange={(e) => { setDashboardModelFilter(e.target.value); setDashboardPartFilter("ALL"); }} style={S.input}>
                        <option value="ALL">ทั้งหมด</option>
                        {dashboardModelOptions.map((m) => <option key={m.modelCode} value={m.modelCode}>{m.modelCode} - {m.modelName}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Part</Label>
                      <select value={dashboardPartFilter} onChange={(e) => setDashboardPartFilter(e.target.value)} style={S.input}>
                        <option value="ALL">ทั้งหมด</option>
                        {dashboardPartOptions.map((p) => <option key={p.key} value={p.key}>{p.modelCode}/{p.partCode} - {p.partName}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>สถานะ</Label>
                      <select value={dashboardStatusFilter} onChange={(e) => setDashboardStatusFilter(e.target.value)} style={S.input}>
                        <option value="ALL">ทั้งหมด</option>
                        <option value="PASS">PASS</option>
                        <option value="FAIL">FAIL</option>
                      </select>
                    </div>
                    <div>
                      <Label>ค้นหา</Label>
                      <Input value={dashboardSearch} onChange={(e) => setDashboardSearch(e.target.value)} placeholder="ชื่อ / รหัส / Model / Part" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="dashboard-stats">
                <Card><CardContent><div style={{ fontSize: 12, color: "#475569" }}>จำนวนครั้งสอบทั้งหมด</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{dashboardSummary.attempts}</div></CardContent></Card>
                <Card><CardContent><div style={{ fontSize: 12, color: "#475569" }}>อัตราผ่านรวม</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{dashboardSummary.passRate}%</div></CardContent></Card>
                <Card><CardContent><div style={{ fontSize: 12, color: "#475569" }}>คะแนนเฉลี่ยรวม</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>{dashboardSummary.avgPct}%</div></CardContent></Card>
              </div>

              <Card>
                <CardHeader>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>สรุปราย Model / Part</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button variant="outline" onClick={exportDashboardSummaryCsv}>Export Summary CSV</Button>
                    <Button variant="outline" onClick={exportDashboardHistoryCsv}>Export History CSV</Button>
                    <Button variant="outline" onClick={() => {
                      if (window.confirm("ต้องการล้างผลสอบทั้งหมดหรือไม่")) {
                        setResultHistory([]);
                      }
                    }}>
                      ล้างข้อมูล Dashboard
                    </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {byModelPart.length === 0 ? (
                    <div style={{ color: "#64748b" }}>ยังไม่มีผลสอบในระบบ</div>
                  ) : (
                    <div className="dashboard-table-wrap">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Model</th>
                            <th>Part</th>
                            <th>จำนวนครั้ง</th>
                            <th>ผ่าน</th>
                            <th>อัตราผ่าน</th>
                            <th>คะแนนเฉลี่ย</th>
                          </tr>
                        </thead>
                        <tbody>
                          {byModelPart.map((row, idx) => (
                            <tr key={`${row.modelCode}-${row.partCode}-${idx}`}>
                              <td>{row.modelCode} - {row.modelName}</td>
                              <td>{row.partCode} - {row.partName}</td>
                              <td>{row.attempts}</td>
                              <td>{row.passed}</td>
                              <td>{row.passRate}%</td>
                              <td>{row.avgPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><h3 style={{ margin: 0, fontSize: 18 }}>ผลสอบล่าสุด</h3></CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <div style={{ color: "#64748b" }}>ยังไม่มีผลสอบในระบบ</div>
                  ) : (
                    <div className="dashboard-table-wrap">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>เวลา</th>
                            <th>พนักงาน</th>
                            <th>Model/Part</th>
                            <th>คะแนน</th>
                            <th>สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.slice(0, 20).map((r) => (
                            <tr key={r.id}>
                              <td>{new Date(r.submittedAt).toLocaleString()}</td>
                              <td>{r.candidateName} ({r.candidateCode})</td>
                              <td>{r.modelCode}/{r.partCode}</td>
                              <td>{r.score}/{r.fullScore}</td>
                              <td>{r.status}</td>
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
          <TabsContent value="importexport">
            <div className="io-grid">
              <Card><CardHeader><h3 style={{ margin: 0, fontSize: 18 }}>Export JSON (Model/Part)</h3></CardHeader><CardContent><Textarea rows={18} value={JSON.stringify(bank, null, 2)} readOnly style={{ fontFamily: "monospace", fontSize: 12 }} /><Button onClick={exportJSON}><FileJson size={16} /> ดาวน์โหลด JSON</Button></CardContent></Card>
              <Card><CardHeader><h3 style={{ margin: 0, fontSize: 18 }}>Import JSON</h3></CardHeader><CardContent><Textarea rows={18} value={importText} onChange={(e) => setImportText(e.target.value)} style={{ fontFamily: "monospace", fontSize: 12 }} /><div style={{ display: "flex", gap: 8 }}><Button onClick={importJSON}>Import JSON</Button><Button variant="outline" onClick={() => setImportText("")}>ล้างข้อความ</Button></div></CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}



