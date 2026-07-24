import {
  countReceiverUniqueSendersSince,
  countSenderTransfersSince,
  hasReciprocalTransferSince
} from '../repositories/context.repository.js';

const ONE_MINUTE_MS = 1 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function enrichTransferContext(transfer) {
  const now = new Date(transfer.transaction.timestamp).getTime();

  const metrics = {
    senderTransfersLast1Minute: await countSenderTransfersSince(
      transfer.tenantId,
      transfer.sender.userId,
      new Date(now - ONE_MINUTE_MS)
    ),
    receiverUniqueSendersLast1Hour: await countReceiverUniqueSendersSince(
      transfer.tenantId,
      transfer.receiver.userId,
      new Date(now - ONE_HOUR_MS)
    )
  };

  const graph = {
    isReciprocalTransfer24h: await hasReciprocalTransferSince(
      transfer.tenantId,
      transfer.sender.userId,
      transfer.receiver.userId,
      new Date(now - TWENTY_FOUR_HOURS_MS)
    )
  };

  return {
    ...transfer,
    metrics,
    graph
  };
}
