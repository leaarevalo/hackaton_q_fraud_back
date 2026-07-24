import { createClient } from 'redis';

const transfers = [];
let redisClient;
let redisConnectionPromise;
let redisUnavailable = false;

const CACHE_PROVIDER = process.env.CACHE_PROVIDER || 'memory';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const TRANSFER_TTL_SECONDS = 24 * 60 * 60;

export async function countSenderTransfersSince(tenantId, senderUserId, since) {
  if (shouldUseRedis()) {
    const recentTransfers = await withRedisFallback(
      () => getRedisTransfersSince(tenantId, since),
      () => getMemoryTransfersSince(tenantId, since)
    );
    return recentTransfers.filter((transfer) => transfer.sender.userId === senderUserId).length;
  }

  return getMemoryTransfersSince(tenantId, since).filter(
    (transfer) => transfer.sender.userId === senderUserId
  ).length;
}

export async function countReceiverUniqueSendersSince(tenantId, receiverUserId, since) {
  if (shouldUseRedis()) {
    const recentTransfers = await withRedisFallback(
      () => getRedisTransfersSince(tenantId, since),
      () => getMemoryTransfersSince(tenantId, since)
    );
    const uniqueSenders = new Set(
      recentTransfers
        .filter((transfer) => transfer.receiver.userId === receiverUserId)
        .map((transfer) => transfer.sender.userId)
    );

    return uniqueSenders.size;
  }

  const uniqueSenders = new Set(
    getMemoryTransfersSince(tenantId, since)
      .filter((transfer) => transfer.receiver.userId === receiverUserId)
      .map((transfer) => transfer.sender.userId)
  );

  return uniqueSenders.size;
}

export async function hasReciprocalTransferSince(tenantId, senderUserId, receiverUserId, since) {
  if (shouldUseRedis()) {
    const recentTransfers = await withRedisFallback(
      () => getRedisTransfersSince(tenantId, since),
      () => getMemoryTransfersSince(tenantId, since)
    );
    return recentTransfers.some(
      (transfer) =>
        transfer.sender.userId === receiverUserId && transfer.receiver.userId === senderUserId
    );
  }

  return getMemoryTransfersSince(tenantId, since).some(
    (transfer) =>
      transfer.sender.userId === receiverUserId &&
      transfer.receiver.userId === senderUserId
  );
}

export async function persistTransferContext(transfer) {
  if (shouldUseRedis()) {
    await withRedisFallback(
      () => persistRedisTransfer(transfer),
      () => {
        transfers.push(transfer);
      }
    );
    return;
  }

  transfers.push(transfer);
}

export async function resetContextStore() {
  transfers.length = 0;

  if (redisClient?.isReady) {
    const keys = await redisClient.keys('qleap:fraud:*:transfers');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
}

function shouldUseRedis() {
  return CACHE_PROVIDER === 'redis' && !redisUnavailable;
}

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 500,
        reconnectStrategy: false
      }
    });
    redisClient.on('error', (error) => {
      console.error(`Redis connection error: ${error.message}`);
    });
  }

  if (!redisClient.isReady) {
    redisConnectionPromise ||= redisClient.connect();
    await redisConnectionPromise;
  }

  return redisClient;
}

async function withRedisFallback(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    redisUnavailable = true;
    redisConnectionPromise = undefined;
    console.warn(`Redis unavailable, falling back to memory cache: ${error.message}`);
    return fallback();
  }
}

function getMemoryTransfersSince(tenantId, since) {
  return transfers.filter(
    (transfer) =>
      transfer.tenantId === tenantId && new Date(transfer.transaction.timestamp) >= since
  );
}

async function getRedisTransfersSince(tenantId, since) {
  const client = await getRedisClient();
  const rawTransfers = await client.zRangeByScore(transfersKey(tenantId), since.getTime(), '+inf');

  return rawTransfers.map((rawTransfer) => JSON.parse(rawTransfer));
}

async function persistRedisTransfer(transfer) {
  const client = await getRedisClient();
  const score = new Date(transfer.transaction.timestamp).getTime();
  const value = JSON.stringify(transfer);

  await client
    .multi()
    .zAdd(transfersKey(transfer.tenantId), [{ score, value }])
    .expire(transfersKey(transfer.tenantId), TRANSFER_TTL_SECONDS)
    .exec();
}

function transfersKey(tenantId) {
  return `qleap:fraud:${tenantId}:transfers`;
}
