export const evaluationAssignedEvaluators = [
  "206006 - ผู้ประเมิน",
  "210027 - ผู้ประเมิน",
  "211075 - ผู้ประเมิน",
  "204041 - ผู้ประเมิน",
  "206029 - ผู้ประเมิน",
  "199033 - ผู้ประเมิน",
  "197036 - ผู้ประเมิน",
  "203009 - ผู้ประเมิน",
];

export const scoreLevels = [1, 2, 3, 4];

const defaultEvaluationItems = [
  { item: "ความเข้าใจขั้นตอนการทำงานและการอ้างอิง WI อย่างถูกต้อง", method: "สังเกต", weight: 1 },
  { item: "ความถูกต้องของการปฏิบัติงานตามมาตรฐานที่กำหนด", method: "ตรวจงาน", weight: 3 },
  { item: "ความสามารถในการทำงานได้อย่างต่อเนื่องและปลอดภัย", method: "ทดสอบ", weight: 5 },
  { item: "การตอบสนองเมื่อพบความผิดปกติและการแยกชิ้นงาน NG ได้เหมาะสม", method: "สัมภาษณ์", weight: 6 },
];

const learningStatusMeta = {
  NOT_STARTED: { label: "ยังไม่เริ่ม", className: "status-neutral" },
  EXAM_NOT_PASSED: { label: "สอบไม่ผ่าน", className: "status-fail" },
  WAITING_EVALUATION: { label: "รอประเมิน", className: "status-warning" },
  COMPLETED: { label: "เสร็จสิ้น", className: "status-pass" },
};

export const createEvaluationRows = (createId) => defaultEvaluationItems.map((row, index) => ({
  id: createId(),
  no: index + 1,
  item: row.item,
  method: row.method,
  weight: row.weight,
  score: 0,
}));

export const createEvaluationDraft = (createId) => ({
  sectionTitle: "หัวข้อที่ 1 : การประเมินหน้างาน และทักษะงาน",
  modelId: "",
  partId: "",
  employeeId: "",
  employeeCode: "",
  employeeName: "",
  evaluator: "",
  rows: createEvaluationRows(createId),
});

export const getLearningStatusSummary = ({ attempts = 0, passed = 0, passedParts = 0, evaluatedParts = 0 }) => {
  if (!attempts) return { key: "NOT_STARTED", ...learningStatusMeta.NOT_STARTED };
  if (!passed) return { key: "EXAM_NOT_PASSED", ...learningStatusMeta.EXAM_NOT_PASSED };
  if (passedParts > evaluatedParts) return { key: "WAITING_EVALUATION", ...learningStatusMeta.WAITING_EVALUATION };
  return { key: "COMPLETED", ...learningStatusMeta.COMPLETED };
};

export const patchEvaluationRows = (rows, id, patch) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row));

export const selectEvaluationEmployeeByCodeDraft = (employees, employeeCode, previousDraft) => {
  const selectedEmployee = employees.find((employee) => employee.employeeCode === employeeCode);
  return {
    ...previousDraft,
    employeeId: selectedEmployee?.id || "",
    employeeCode: selectedEmployee?.employeeCode || "",
    employeeName: selectedEmployee?.fullName || "",
  };
};

export const selectEvaluationEmployeeByNameDraft = (employees, fullName, previousDraft) => {
  const selectedEmployee = employees.find((employee) => employee.fullName === fullName);
  return {
    ...previousDraft,
    employeeId: selectedEmployee?.id || "",
    employeeCode: selectedEmployee?.employeeCode || "",
    employeeName: selectedEmployee?.fullName || "",
  };
};

export const selectEvaluationModelDraft = (models, modelIdValue, previousDraft) => {
  const selectedModel = models.find((entry) => entry.id === modelIdValue) || null;
  return {
    ...previousDraft,
    modelId: modelIdValue,
    partId: selectedModel?.parts?.[0]?.id || "",
  };
};

export const selectEvaluationPartDraft = (partIdValue, previousDraft) => ({
  ...previousDraft,
  partId: partIdValue,
});

export const resetEvaluationDraft = ({ createId, bankModels, session }) => ({
  ...createEvaluationDraft(createId),
  modelId: bankModels[0]?.id || "",
  partId: bankModels[0]?.parts?.[0]?.id || "",
  employeeCode: session?.role === "ADMIN" ? "" : (session?.employeeCode || ""),
  employeeName: session?.role === "ADMIN" ? "" : (session?.displayName || ""),
  employeeId: session?.role === "ADMIN" ? "" : (session?.id || ""),
  evaluator: session?.role === "ADMIN" ? (session?.displayName || "") : "",
});

export const ensureEvaluationSelectionDraft = (bankModels, previousDraft) => {
  if (!bankModels.length) return previousDraft;
  const nextModelId = previousDraft.modelId || bankModels[0]?.id || "";
  const selectedModel = bankModels.find((entry) => entry.id === nextModelId) || bankModels[0];
  const nextPartId = selectedModel?.parts.find((entry) => entry.id === previousDraft.partId)?.id || selectedModel?.parts?.[0]?.id || "";
  if (nextModelId === previousDraft.modelId && nextPartId === previousDraft.partId) return previousDraft;
  return {
    ...previousDraft,
    modelId: nextModelId,
    partId: nextPartId,
  };
};

export const hydrateEvaluationEmployeeDraft = (employees, previousDraft) => {
  if (!employees.length || !previousDraft.employeeCode || previousDraft.employeeId) return previousDraft;
  const selectedEmployee = employees.find((employee) => employee.employeeCode === previousDraft.employeeCode);
  if (!selectedEmployee) return previousDraft;
  return {
    ...previousDraft,
    employeeId: selectedEmployee.id,
    employeeName: previousDraft.employeeName || selectedEmployee.fullName,
  };
};

export const calculateEvaluationTotal = (rows) => rows.reduce((sum, row) => sum + (Number(row.score || 0) * Number(row.weight || 0)), 0);

export const calculateEvaluationMax = (rows) => rows.reduce((sum, row) => sum + (scoreLevels[scoreLevels.length - 1] * Number(row.weight || 0)), 0);

export const getLatestEvaluationExamResult = (results, employeeCode, partId) => {
  if (!employeeCode || !partId) return null;
  return results.find((entry) => entry.candidateCode === employeeCode && entry.partId === partId) || null;
};

export const buildEvaluationPartFilterOptions = (history) => {
  const seen = new Map();
  history.forEach((entry) => {
    const key = `${entry.modelCode}__${entry.partCode}__${entry.partName}`;
    if (!seen.has(key)) seen.set(key, { key, label: `${entry.modelCode}/${entry.partCode} - ${entry.partName}` });
  });
  return Array.from(seen.values());
};

export const buildEvaluationEvaluatorOptions = (history) => {
  const seen = new Set();
  history.forEach((entry) => {
    if (entry.evaluator) seen.add(entry.evaluator);
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "th"));
};

export const filterEvaluationHistory = (history, search, partFilter, evaluatorFilter) => {
  const q = search.trim().toLowerCase();
  return history.filter((entry) => {
    if (partFilter !== "ALL") {
      const partKey = `${entry.modelCode}__${entry.partCode}__${entry.partName}`;
      if (partKey !== partFilter) return false;
    }
    if (evaluatorFilter !== "ALL" && (entry.evaluator || "") !== evaluatorFilter) return false;
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
};

export const buildEvaluationPayload = ({
  form,
  model,
  part,
  totalScore,
  maxScore,
}) => ({
  employeeId: form.employeeId,
  sectionTitle: form.sectionTitle,
  evaluator: form.evaluator,
  modelId: model.id,
  modelCode: model.modelCode,
  modelName: model.modelName,
  partId: part.id,
  partCode: part.partCode,
  partName: part.partName,
  totalScore,
  maxScore,
  rows: form.rows,
});

export const buildEvaluationCsvRows = (rows, total) => ([
  ...rows.map((row) => [
    row.no,
    row.item,
    row.method,
    row.score,
    row.weight,
    Number(row.score || 0) * Number(row.weight || 0),
  ]),
  ["", "TOTAL", "", "", "", total],
]);