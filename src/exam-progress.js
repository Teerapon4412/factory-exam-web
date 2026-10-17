export function summarizeExamProgress(bank, results, employeeCode) {
  const own = results.filter((result) => result.candidateCode === employeeCode);
  return (bank.models || []).flatMap((model) => (model.parts || []).map((part) => {
    const attempts = own.filter((result) => result.partId === part.id && (!result.modelId || result.modelId === model.id))
      .sort((a, b) => (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0));
    return {
      key: `${model.id}:${part.id}`, model, part, attempts: attempts.length,
      latest: attempts[0] || null,
      status: attempts.some((result) => result.status === 'PASS') ? 'PASS' : attempts.length ? 'FAIL' : 'NOT_TAKEN',
    };
  }));
}
