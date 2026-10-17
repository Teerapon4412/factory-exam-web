import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeExamProgress } from '../src/exam-progress.js';
const bank = { models: [{ id: 'm', parts: [{ id: 'p' }, { id: 'q' }] }, { id: 'n', parts: [{ id: 'p' }] }] };
test('includes unattempted parts and isolates employee and model', () => {
  const rows = summarizeExamProgress(bank, [{ candidateCode: 'other', partId: 'q', status: 'PASS' }, { candidateCode: 'a', modelId: 'm', partId: 'p', status: 'FAIL' }], 'a');
  assert.deepEqual(rows.map(r => r.status), ['FAIL', 'NOT_TAKEN', 'NOT_TAKEN']);
});
test('sorts attempts by date and preserves earlier pass independently of latest result', () => {
  const rows = summarizeExamProgress(bank, [
    { candidateCode: 'a', modelId: 'm', partId: 'p', submittedAt: '2026-01-01', status: 'PASS' },
    { candidateCode: 'a', modelId: 'm', partId: 'p', submittedAt: '2026-02-01', status: 'FAIL' },
  ], 'a');
  assert.equal(rows[0].status, 'PASS');
  assert.equal(rows[0].latest.status, 'FAIL');
  assert.equal(rows[0].attempts, 2);
});
