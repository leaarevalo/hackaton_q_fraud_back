import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEngineConfig } from '../src/config/engineConfig.js';
import { evaluateRules } from '../src/services/ruleEngine.service.js';

test('regular transfer is GREEN', () => {
  const decision = evaluateRules(baseContext(), loadEngineConfig());

  assert.equal(decision.riskLevel, 'GREEN');
  assert.equal(decision.recommendedAction, 'APPROVE');
});

test('shared device with many accounts forces RED', () => {
  const context = baseContext({
    device: {
      associatedAccountsCount: 5,
      isNewForUser: true
    }
  });

  const decision = evaluateRules(context, loadEngineConfig());

  assert.equal(decision.riskLevel, 'RED');
  assert.equal(decision.recommendedAction, 'REJECT');
});

test('burst transfers score YELLOW and invokes AI path', () => {
  const context = baseContext({
    metrics: {
      senderTransfersLast1Minute: 3,
      receiverUniqueSendersLast1Hour: 0
    }
  });

  const decision = evaluateRules(context, loadEngineConfig());

  assert.equal(decision.riskLevel, 'YELLOW');
  assert.equal(decision.riskScore, 40);
});

function baseContext(overrides = {}) {
  return {
    tenantId: 'qurable_loyalty',
    scope: 'POINTS_TRANSFER',
    transaction: {
      id: 'tx_test',
      type: 'POINTS_TRANSFER',
      timestamp: '2026-07-24T13:10:00Z',
      points: 500
    },
    sender: {
      userId: 'usr_sender',
      accountAgeMinutes: 1000,
      ip: '200.45.12.5'
    },
    receiver: {
      userId: 'usr_receiver',
      ip: '200.45.99.10'
    },
    device: {
      fingerprint: 'fp_test',
      associatedAccountsCount: 1,
      isNewForUser: false
    },
    metrics: {
      senderTransfersLast1Minute: 0,
      receiverUniqueSendersLast1Hour: 0
    },
    graph: {
      isReciprocalTransfer24h: false
    },
    ...overrides,
    transaction: {
      type: 'POINTS_TRANSFER',
      points: 500,
      ...(overrides.transaction || {})
    },
    sender: {
      userId: 'usr_sender',
      accountAgeMinutes: 1000,
      ip: '200.45.12.5',
      ...(overrides.sender || {})
    },
    receiver: {
      userId: 'usr_receiver',
      ip: '200.45.99.10',
      ...(overrides.receiver || {})
    },
    device: {
      fingerprint: 'fp_test',
      associatedAccountsCount: 1,
      isNewForUser: false,
      ...(overrides.device || {})
    },
    metrics: {
      senderTransfersLast1Minute: 0,
      receiverUniqueSendersLast1Hour: 0,
      ...(overrides.metrics || {})
    },
    graph: {
      isReciprocalTransfer24h: false,
      ...(overrides.graph || {})
    }
  };
}
