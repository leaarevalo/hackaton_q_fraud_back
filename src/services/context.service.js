import {
  countReceiverUniqueSendersSince,
  countSenderTransfersSince,
  hasReciprocalTransferSince
} from '../repositories/context.repository.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function enrichTransferContext(transfer) {
  const now = new Date(transfer.transaction.timestamp).getTime();

  const metrics = {
    senderTransfersLast5Minutes: await countSenderTransfersSince(
      transfer.sender.userId,
      new Date(now - FIVE_MINUTES_MS)
    ),
    receiverUniqueSendersLast1Hour: await countReceiverUniqueSendersSince(
      transfer.receiver.userId,
      new Date(now - ONE_HOUR_MS)
    )
  };

  const graph = {
    isReciprocalTransfer24h: await hasReciprocalTransferSince(
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
