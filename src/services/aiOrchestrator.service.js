export async function analyzeWithAi(context, ruleDecision, config) {
  if (process.env.AI_ENABLED === 'false') {
    return null;
  }

  const criticalRuleMatched = ruleDecision.matchedRules.some((rule) =>
    config.ai.neverOverride.includes(rule.id)
  );

  if (criticalRuleMatched) {
    return {
      model: 'local-mock',
      riskLevel: ruleDecision.riskLevel,
      recommendedAction: ruleDecision.recommendedAction,
      confidence: 0.99,
      reasoning: 'Regla critica detectada. La IA no puede anular esta decision.',
      suggestedRule: null
    };
  }

  if (context.metrics.senderTransfersLast5Minutes > 3 && context.transaction.points > 10000) {
    return {
      model: 'local-mock',
      riskLevel: 'RED',
      recommendedAction: 'REJECT',
      confidence: 0.86,
      reasoning: 'Rafaga de transferencias con monto alto. Se eleva el riesgo para bloquear la operacion.',
      suggestedRule: 'Agregar umbral combinado de frecuencia y monto acumulado por ventana de 5 minutos.'
    };
  }

  return {
    model: 'local-mock',
    riskLevel: ruleDecision.riskLevel,
    recommendedAction: ruleDecision.recommendedAction,
    confidence: 0.72,
    reasoning: 'Analisis simulado para el MVP. Mantiene la decision del motor de reglas.',
    suggestedRule: 'Conectar un proveedor real de IA cuando exista historial suficiente.'
  };
}
