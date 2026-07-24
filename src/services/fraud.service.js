import { loadEngineConfig } from '../config/engineConfig.js';
import { enrichTransferContext } from './context.service.js';
import { evaluateRules } from './ruleEngine.service.js';
import { analyzeWithAi } from './aiOrchestrator.service.js';
import { saveAudit } from '../repositories/audit.repository.js';
import { persistTransferContext } from '../repositories/context.repository.js';
import { buildNormalizedTransfer } from '../utils/normalizeTransfer.js';

export async function evaluateFraud(payload) {
  const config = loadEngineConfig();
  const normalizedTransfer = buildNormalizedTransfer(payload);
  const enrichedContext = await enrichTransferContext(normalizedTransfer);
  const ruleDecision = evaluateRules(enrichedContext, config);

  const aiShouldRun = config.ai.enabled && config.ai.invokeOn.includes(ruleDecision.riskLevel);
  const aiAnalysis = aiShouldRun ? await analyzeWithAi(enrichedContext, ruleDecision, config) : null;
  const finalDecision = applyAiDecision(ruleDecision, aiAnalysis);
  const audit = await saveAudit(enrichedContext, finalDecision, aiAnalysis);

  await persistTransferContext(enrichedContext);

  return {
    transactionId: normalizedTransfer.transaction.id,
    decision: {
      riskLevel: finalDecision.riskLevel,
      riskScore: finalDecision.riskScore,
      recommendedAction: finalDecision.recommendedAction,
      aiInvoked: Boolean(aiAnalysis)
    },
    executionSummary: {
      matchedRules: finalDecision.matchedRules,
      aiAnalysis
    },
    auditId: audit.id
  };
}

function applyAiDecision(ruleDecision, aiAnalysis) {
  if (!aiAnalysis?.riskLevel) {
    return ruleDecision;
  }

  return {
    ...ruleDecision,
    riskLevel: aiAnalysis.riskLevel,
    recommendedAction: aiAnalysis.recommendedAction,
    aiAdjusted: true
  };
}
