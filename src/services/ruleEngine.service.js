import { getByPath } from '../utils/objectPath.js';

export function evaluateRules(context, config) {
  const matchedRules = config.rules
    .filter((rule) => rule.enabled)
    .sort((left, right) => right.priority - left.priority)
    .filter((rule) => evaluateConditionGroup(rule.conditions, context))
    .map((rule) => ({
      id: rule.id,
      scoreAdded: rule.score || 0,
      actions: rule.actions || []
    }));

  const forcedRisk = getHighestPriorityForcedRisk(matchedRules);
  const riskScore = Math.min(
    100,
    matchedRules.reduce((total, rule) => total + rule.scoreAdded, 0)
  );
  const riskLevel = forcedRisk || riskLevelFromScore(riskScore, config);

  return {
    riskLevel,
    riskScore,
    recommendedAction: config.riskLevels[riskLevel].action,
    matchedRules
  };
}

function evaluateConditionGroup(group, context) {
  if (!group?.rules?.length) {
    return true;
  }

  const results = group.rules.map((condition) => evaluateCondition(condition, context));
  return group.operator === 'OR' ? results.some(Boolean) : results.every(Boolean);
}

function evaluateCondition(condition, context) {
  const actualValue = getByPath(context, condition.field);
  const expectedValue =
    typeof condition.value === 'string' && condition.value.includes('.')
      ? getByPath(context, condition.value)
      : condition.value;

  switch (condition.operator) {
    case '==':
      return actualValue === expectedValue;
    case '!=':
      return actualValue !== expectedValue;
    case '>':
      return Number(actualValue) > Number(expectedValue);
    case '>=':
      return Number(actualValue) >= Number(expectedValue);
    case '<':
      return Number(actualValue) < Number(expectedValue);
    case '<=':
      return Number(actualValue) <= Number(expectedValue);
    default:
      return false;
  }
}

function getHighestPriorityForcedRisk(matchedRules) {
  const riskActions = matchedRules
    .flatMap((rule) => rule.actions.map((action) => ({ ruleId: rule.id, ...action })))
    .filter((action) => action.type === 'SET_RISK');

  return riskActions[0]?.value;
}

function riskLevelFromScore(score, config) {
  const scoreRiskLevel = Object.entries(config.riskLevels).find(([_level, definition]) => {
    if (!definition.score) {
      return false;
    }

    return score >= definition.score.min && score <= definition.score.max;
  });

  return scoreRiskLevel?.[0] || config.engine.defaultRisk;
}
