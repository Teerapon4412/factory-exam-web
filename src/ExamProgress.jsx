import { useEffect, useMemo, useState } from 'react';
import { summarizeExamProgress } from './exam-progress.js';

const labels = { PASS: 'เคยสอบผ่าน', FAIL: 'สอบแล้ว ยังไม่ผ่าน', NOT_TAKEN: 'ยังไม่เคยสอบ' };

export default function ExamProgress({ bank, session, apiBase, loading }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let ignore = false;
    async function refresh() {
      try {
        const response = await fetch(`${apiBase}/exam-progress`, { headers: { Authorization: `Bearer ${session.token}` } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = await response.json();
        if (!ignore) { setData(next); setError(''); }
      } catch {
        if (!ignore) setError('โหลดสถานะการสอบไม่สำเร็จ กรุณาลองใหม่');
      }
    }
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { ignore = true; clearInterval(timer); };
  }, [apiBase, session.token, refreshKey]);
  const results = useMemo(() => data?.results || [], [data]);
  const employees = useMemo(() => data?.employees || [], [data]);
  const [employeeCode, setEmployeeCode] = useState('');
  const [status, setStatus] = useState('ALL');
  const [modelId, setModelId] = useState('ALL');
  const isAdmin = ['ADMIN', 'LEADER'].includes(session.role);
  const selectedCode = isAdmin ? employeeCode || session.employeeCode : session.employeeCode;
  const people = useMemo(() => {
    const map = new Map([[session.employeeCode, session.displayName || session.employeeCode]]);
    results.forEach((entry) => map.set(entry.candidateCode, entry.candidateName));
    employees.forEach((employee) => map.set(employee.employeeCode, employee.fullName));
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [employees, results, session]);
  const rows = useMemo(() => summarizeExamProgress(bank, results, selectedCode), [bank, results, selectedCode]);
  const modelRows = rows.filter((row) => modelId === 'ALL' || row.model.id === modelId);
  const visible = modelRows.filter((row) => status === 'ALL' || row.status === status);
  const taken = modelRows.filter((row) => row.attempts > 0).length;
  return <section className="detail-stack" aria-label="สถานะการสอบราย Part">
    <div><h2>สถานะการสอบราย Part</h2><p>ตรวจสอบว่าสอบ Part ไหนแล้ว และ Part ไหนยังไม่เคยสอบ</p></div>
    {error && <p role="alert">{error} <button onClick={() => setRefreshKey((key) => key + 1)}>ลองใหม่</button></p>}
    {loading || !data ? <p role="status">{error ? 'ยังไม่มีข้อมูลที่ยืนยันได้' : 'กำลังโหลดข้อมูล กรุณารอสักครู่…'}</p> : <>
      <div className="dashboard-filters">
        {isAdmin && <label>พนักงาน<select value={selectedCode} onChange={(event) => setEmployeeCode(event.target.value)}>{people.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}</select></label>}
        <label>Model<select value={modelId} onChange={(event) => setModelId(event.target.value)}><option value="ALL">ทุก Model</option>{bank.models.map((model) => <option key={model.id} value={model.id}>{model.modelCode} - {model.modelName}</option>)}</select></label>
        <label>สถานะ<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">ทุกสถานะ</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
      <p aria-live="polite">ทั้งหมด {modelRows.length} Part · สอบแล้ว {taken} · เคยผ่าน {modelRows.filter((row) => row.status === 'PASS').length} · ยังไม่ผ่าน {modelRows.filter((row) => row.status === 'FAIL').length} · ยังไม่เคยสอบ {modelRows.length - taken}</p>
      <p className="mini-note">สถานะ “เคยสอบผ่าน” หมายถึงมีผลผ่านอย่างน้อยหนึ่งครั้ง ส่วนคะแนนและวันที่ด้านล่างเป็นผลครั้งล่าสุด ข้อมูลอ้างอิงประวัติที่ระบบยังเก็บไว้</p>
      <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Model</th><th>Part</th><th>สถานะ</th><th>จำนวนครั้ง</th><th>คะแนนล่าสุด</th><th>ผลล่าสุด</th><th>วันที่สอบล่าสุด</th></tr></thead><tbody>
        {visible.length === 0 ? <tr><td colSpan={7}>ไม่พบ Part ตามตัวกรองที่เลือก</td></tr> : visible.map((row) => <tr key={row.key}><td>{row.model.modelCode} - {row.model.modelName}</td><td>{row.part.partCode} - {row.part.partName}</td><td><span className={`status-pill status-${row.status.toLowerCase()}`}>{labels[row.status]}</span></td><td>{row.attempts}</td><td>{row.latest ? `${row.latest.score}/${row.latest.fullScore}` : '—'}</td><td>{row.latest ? row.latest.status === 'PASS' ? 'ผ่าน' : 'ไม่ผ่าน' : '—'}</td><td>{row.latest && Number.isFinite(Date.parse(row.latest.submittedAt)) ? new Date(row.latest.submittedAt).toLocaleString('th-TH') : '—'}</td></tr>)}
      </tbody></table></div>
    </>}
  </section>;
}
