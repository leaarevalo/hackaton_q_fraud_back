const transfers = [];

export async function countSenderTransfersSince(senderUserId, since) {
  return transfers.filter(
    (transfer) =>
      transfer.sender.userId === senderUserId &&
      new Date(transfer.transaction.timestamp) >= since
  ).length;
}

export async function countReceiverUniqueSendersSince(receiverUserId, since) {
  const uniqueSenders = new Set(
    transfers
      .filter(
        (transfer) =>
          transfer.receiver.userId === receiverUserId &&
          new Date(transfer.transaction.timestamp) >= since
      )
      .map((transfer) => transfer.sender.userId)
  );

  return uniqueSenders.size;
}

export async function hasReciprocalTransferSince(senderUserId, receiverUserId, since) {
  return transfers.some(
    (transfer) =>
      transfer.sender.userId === receiverUserId &&
      transfer.receiver.userId === senderUserId &&
      new Date(transfer.transaction.timestamp) >= since
  );
}

export async function persistTransferContext(transfer) {
  transfers.push(transfer);
}

export function resetContextStore() {
  transfers.length = 0;
}
