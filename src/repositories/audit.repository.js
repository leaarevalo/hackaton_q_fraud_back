const audits = [];

export async function saveAudit(context, decision, aiAnalysis) {
  const audit = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    transactionId: context.transaction.id,
    decision,
    aiAnalysis
  };

  audits.push(audit);
  return audit;
}

export function listAudits() {
  return [...audits];
}
