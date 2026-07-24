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
  logAiInvocationDecision(normalizedTransfer, ruleDecision, aiShouldRun);
  const aiAnalysis = aiShouldRun ? await analyzeWithAi(enrichedContext, ruleDecision, config) : null;
  const finalDecision = applyAiDecision(ruleDecision, aiAnalysis);
  const audit = await saveAudit(enrichedContext, finalDecision, aiAnalysis);

  await persistTransferContext(enrichedContext);

  // Formatted logger output matching the presentation console demo output
  const actionItems = {
    GREEN: "Ninguna accion requerida.",
    YELLOW: "Monitorear proximidad de IP y huella en siguientes operaciones.",
    RED: "Bloquear cuenta y suspender transferencia temporalmente.",
    BLUE: "Enviar a cola de revision manual de analista."
  };

  console.log(`\n\x1b[35m[AI Orchestrator Output]\x1b[0m\n` + JSON.stringify({
    decision: finalDecision.recommendedAction,
    confidence: aiAnalysis ? aiAnalysis.confidence : 1.0,
    reasoning: aiAnalysis ? aiAnalysis.reasoning : "Reglas de negocio aplicadas. No se requirio intervencion de la IA.",
    action_item: actionItems[finalDecision.riskLevel] || "Ninguna accion requerida."
  }, null, 2) + `\n`);

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

function logAiInvocationDecision(transfer, ruleDecision, aiShouldRun) {
  const matchedRuleIds = ruleDecision.matchedRules.map((rule) => rule.id);

  if (!aiShouldRun) {
    console.info('[ai] skipped', {
      transactionId: transfer.transaction.id,
      riskLevel: ruleDecision.riskLevel,
      riskScore: ruleDecision.riskScore,
      matchedRules: matchedRuleIds
    });
    return;
  }

  console.info('[ai] invocation requested', {
    transactionId: transfer.transaction.id,
    riskLevel: ruleDecision.riskLevel,
    riskScore: ruleDecision.riskScore,
    matchedRules: matchedRuleIds
  });
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
