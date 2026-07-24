export function buildNormalizedTransfer(payload) {
  const timestamp = payload.transaction.timestamp || new Date().toISOString();

  return {
    tenantId: payload.tenantId,
    scope: payload.scope,
    transaction: {
      id: payload.transaction.id,
      timestamp,
      type: payload.scope,
      points: Number(payload.transaction.points),
      currency: payload.transaction.currency || 'LOYALTY_PTS'
    },
    sender: {
      ...payload.sender,
      accountAgeMinutes: resolveAccountAgeMinutes(payload.sender, timestamp)
    },
    receiver: payload.receiver,
    device: {
      ...payload.device,
      fingerprintHash: payload.device.fingerprintHash || payload.device.fingerprint,
      associatedAccountsCount: Number(payload.device.associatedAccountsCount || 1),
      isNewForUser: Boolean(payload.device.isNewForUser)
    },
    location: payload.location || {},
    metadata: payload.metadata || {}
  };
}

function resolveAccountAgeMinutes(sender, transactionTimestamp) {
  if (sender.accountAgeMinutes !== undefined) {
    return Number(sender.accountAgeMinutes);
  }

  if (!sender.accountCreatedAt) {
    return Number.MAX_SAFE_INTEGER;
  }

  const createdAt = new Date(sender.accountCreatedAt).getTime();
  const evaluatedAt = new Date(transactionTimestamp).getTime();

  return Math.floor((evaluatedAt - createdAt) / 60000);
}
