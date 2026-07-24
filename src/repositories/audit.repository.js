import { MongoClient } from 'mongodb';

const audits = [];
let mongoClient;
let mongoConnectionPromise;
let mongoUnavailable = false;

const AUDIT_PROVIDER = process.env.AUDIT_PROVIDER || 'memory';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'qleap_fraud';
const MONGODB_AUDIT_COLLECTION = process.env.MONGODB_AUDIT_COLLECTION || 'transaction_audits';

export async function saveAudit(context, decision, aiAnalysis) {
  const audit = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    tenantId: context.tenantId,
    transactionId: context.transaction.id,
    transaction: {
      id: context.transaction.id,
      timestamp: context.transaction.timestamp,
      type: context.transaction.type,
      points: context.transaction.points,
      currency: context.transaction.currency
    },
    sender: {
      userId: context.sender.userId,
      ip: context.sender.ip,
      accountAgeMinutes: context.sender.accountAgeMinutes
    },
    receiver: {
      userId: context.receiver.userId,
      ip: context.receiver.ip
    },
    device: {
      fingerprintHash: context.device.fingerprintHash,
      associatedAccountsCount: context.device.associatedAccountsCount,
      isNewForUser: context.device.isNewForUser,
      platform: context.device.platform
    },
    metrics: context.metrics,
    graph: context.graph,
    decision,
    aiAnalysis
  };

  if (shouldUseMongo()) {
    await withMongoFallback(
      async () => {
        const collection = await getAuditCollection();
        await collection.insertOne(audit);
      },
      () => {
        audits.push(audit);
      }
    );
  } else {
    audits.push(audit);
  }

  return audit;
}

export async function findAuditsByUser(userId, options = {}) {
  const query = buildAuditUserQuery(userId, options);
  const limit = Math.min(Number(options.limit || 50), 200);

  if (shouldUseMongo()) {
    return withMongoFallback(
      async () => {
        const collection = await getAuditCollection();
        return collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray();
      },
      () => findMemoryAuditsByUser(userId, options).slice(0, limit)
    );
  }

  return findMemoryAuditsByUser(userId, options).slice(0, limit);
}

export async function listAudits() {
  if (shouldUseMongo()) {
    return withMongoFallback(
      async () => {
        const collection = await getAuditCollection();
        return collection.find({}).sort({ createdAt: -1 }).limit(200).toArray();
      },
      () => [...audits].reverse()
    );
  }

  return [...audits].reverse();
}

function shouldUseMongo() {
  return AUDIT_PROVIDER === 'mongodb' && !mongoUnavailable;
}

async function getAuditCollection() {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 500
    });
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoClient.connect();
  }

  const client = await mongoConnectionPromise;
  return client.db(MONGODB_DB_NAME).collection(MONGODB_AUDIT_COLLECTION);
}

async function withMongoFallback(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    mongoUnavailable = true;
    mongoConnectionPromise = undefined;
    console.warn('[audit] MongoDB unavailable, using memory fallback', {
      error: error.message
    });
    return fallback();
  }
}

function buildAuditUserQuery(userId, options) {
  const tenantQuery = options.tenantId ? { tenantId: options.tenantId } : {};

  if (options.role === 'sender') {
    return { ...tenantQuery, 'sender.userId': userId };
  }

  if (options.role === 'receiver') {
    return { ...tenantQuery, 'receiver.userId': userId };
  }

  return {
    ...tenantQuery,
    $or: [{ 'sender.userId': userId }, { 'receiver.userId': userId }]
  };
}

function findMemoryAuditsByUser(userId, options) {
  return [...audits]
    .filter((audit) => {
      if (options.tenantId && audit.tenantId !== options.tenantId) {
        return false;
      }

      if (options.role === 'sender') {
        return audit.sender.userId === userId;
      }

      if (options.role === 'receiver') {
        return audit.receiver.userId === userId;
      }

      return audit.sender.userId === userId || audit.receiver.userId === userId;
    })
    .reverse();
}
