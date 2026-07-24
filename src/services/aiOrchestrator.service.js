import OpenAI from 'openai';

const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function analyzeWithAi(context, ruleDecision, config) {
  if (process.env.AI_ENABLED === 'false') {
    return null;
  }

  const criticalRuleMatched = ruleDecision.matchedRules.some((rule) =>
    config.ai.neverOverride.includes(rule.id)
  );

  if (criticalRuleMatched) {
    console.info('[ai] critical rule matched, preserving rule decision', {
      transactionId: context.transaction.id,
      riskLevel: ruleDecision.riskLevel,
      matchedRules: ruleDecision.matchedRules.map((rule) => rule.id)
    });

    return {
      model: 'local-mock',
      riskLevel: ruleDecision.riskLevel,
      recommendedAction: ruleDecision.recommendedAction,
      confidence: 0.99,
      reasoning: 'Regla critica detectada. La IA no puede anular esta decision.',
      suggestedRule: null
    };
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await analyzeWithGroq(context, ruleDecision, config);
    } catch (error) {
      console.warn('[ai] provider unavailable, using local fallback', {
        transactionId: context.transaction.id,
        provider: 'groq',
        error: error.message
      });
    }
  }

  if (!process.env.GROQ_API_KEY) {
    console.info('[ai] GROQ_API_KEY missing, using local fallback', {
      transactionId: context.transaction.id
    });
  }

  return analyzeWithLocalFallback(context, ruleDecision);
}

async function analyzeWithGroq(context, ruleDecision, config) {
  const model = process.env.AI_MODEL || config.ai.model;
  const startedAt = Date.now();
  const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.AI_BASE_URL || DEFAULT_GROQ_BASE_URL
  });

  console.info('[ai] calling provider', {
    transactionId: context.transaction.id,
    provider: 'groq',
    model,
    baseURL: process.env.AI_BASE_URL || DEFAULT_GROQ_BASE_URL
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: Number(process.env.AI_TEMPERATURE || config.ai.temperature || 0.1),
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(config)
      },
      {
        role: 'user',
        content: JSON.stringify(buildAiPayload(context, ruleDecision), null, 2)
      }
    ],
    response_format: { type: 'json_object' }
  });

  const rawContent = completion.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawContent);
  const riskLevel = normalizeRiskLevel(parsed.riskLevel, ruleDecision.riskLevel);
  const confidence = clampConfidence(parsed.confidenceScore ?? parsed.confidence);

  console.info('[ai] provider response received', {
    transactionId: context.transaction.id,
    provider: 'groq',
    model: completion.model,
    riskLevel,
    confidence,
    durationMs: Date.now() - startedAt
  });

  return {
    model: completion.model,
    riskLevel,
    recommendedAction: actionForRiskLevel(riskLevel),
    confidence,
    reasoning: parsed.reasoning || 'La IA no entrego una justificacion explicita.',
    suggestedRule: parsed.suggestedRule || parsed.suggestedRuleRecommendation || null
  };
}

function analyzeWithLocalFallback(context, ruleDecision) {
  if (context.metrics.senderTransfersLast1Minute >= 3) {
    console.info('[ai] local fallback decision', {
      transactionId: context.transaction.id,
      riskLevel: 'RED',
      reason: 'burst_detected'
    });

    return {
      model: 'local-mock',
      riskLevel: 'RED',
      recommendedAction: 'REJECT',
      confidence: 0.88,
      reasoning: 'Detección de ráfaga de transferencias consecutivas. Bloqueo preventivo de fraude.',
      suggestedRule: 'Bloquear cuentas con ráfagas frecuentes de transferencias en corto tiempo.'
    };
  }

  console.info('[ai] local fallback decision', {
    transactionId: context.transaction.id,
    riskLevel: ruleDecision.riskLevel,
    reason: 'preserve_rule_decision'
  });

  return {
    model: 'local-mock',
    riskLevel: ruleDecision.riskLevel,
    recommendedAction: ruleDecision.recommendedAction,
    confidence: 0.72,
    reasoning: 'Analisis simulado para el MVP. Mantiene la decision del motor de reglas.',
    suggestedRule: 'Conectar un proveedor real de IA cuando exista historial suficiente.'
  };
}

function buildSystemPrompt(config) {
  return [
    ...config.ai.systemInstructions,
    'Responde exclusivamente JSON valido.',
    'Formato requerido: {"riskLevel":"GREEN|YELLOW|RED|BLUE","confidenceScore":0.0,"reasoning":"texto breve","suggestedRule":"texto o null"}.',
    `Reglas que nunca puedes anular: ${config.ai.neverOverride.join(', ')}.`
  ].join('\n');
}

function buildAiPayload(context, ruleDecision) {
  return {
    transaction: context.transaction,
    sender: context.sender,
    receiver: context.receiver,
    device: context.device,
    location: context.location,
    metrics: context.metrics,
    graph: context.graph,
    ruleDecision
  };
}

function normalizeRiskLevel(riskLevel, fallbackRiskLevel) {
  const allowedRiskLevels = ['GREEN', 'YELLOW', 'RED', 'BLUE'];
  return allowedRiskLevels.includes(riskLevel) ? riskLevel : fallbackRiskLevel;
}

function actionForRiskLevel(riskLevel) {
  const actions = {
    GREEN: 'APPROVE',
    YELLOW: 'APPROVE_WITH_WARNING',
    RED: 'REJECT',
    BLUE: 'MANUAL_REVIEW'
  };

  return actions[riskLevel] || actions.YELLOW;
}

function clampConfidence(confidence) {
  const numericConfidence = Number(confidence);

  if (Number.isNaN(numericConfidence)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, numericConfidence));
}
