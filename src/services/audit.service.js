import { findAuditsByUser } from '../repositories/audit.repository.js';

export async function getAuditsByUser(userId, filters = {}) {
  const audits = await findAuditsByUser(userId, {
    tenantId: filters.tenantId,
    role: normalizeRole(filters.role),
    limit: filters.limit
  });

  return {
    userId,
    filters: {
      tenantId: filters.tenantId || null,
      role: normalizeRole(filters.role),
      limit: Math.min(Number(filters.limit || 50), 200)
    },
    count: audits.length,
    audits: audits.map(toAuditResponse)
  };
}

function normalizeRole(role) {
  return ['sender', 'receiver'].includes(role) ? role : 'any';
}

function toAuditResponse(audit) {
  return {
    id: audit.id,
    createdAt: audit.createdAt,
    tenantId: audit.tenantId,
    transactionId: audit.transactionId,
    transaction: audit.transaction,
    sender: audit.sender,
    receiver: audit.receiver,
    decision: {
      riskLevel: audit.decision.riskLevel,
      riskScore: audit.decision.riskScore,
      recommendedAction: audit.decision.recommendedAction,
      aiAdjusted: Boolean(audit.decision.aiAdjusted)
    },
    matchedRules: audit.decision.matchedRules,
    aiAnalysis: audit.aiAnalysis
  };
}
