import { badRequest } from '../utils/httpErrors.js';

const requiredPaths = [
  'tenantId',
  'scope',
  'transaction.id',
  'transaction.points',
  'sender.userId',
  'sender.ip',
  'receiver.userId',
  'receiver.ip',
  'device.fingerprint'
];

export function validateFraudPayload(req, _res, next) {
  const missing = requiredPaths.filter((path) => getByPath(req.body, path) === undefined);

  if (missing.length > 0) {
    return next(badRequest(`Missing required fields: ${missing.join(', ')}`));
  }

  if (req.body.scope !== 'POINTS_TRANSFER') {
    return next(badRequest('Only POINTS_TRANSFER scope is supported in this MVP'));
  }

  if (Number(req.body.transaction.points) <= 0) {
    return next(badRequest('transaction.points must be greater than 0'));
  }

  next();
}

function getByPath(source, path) {
  return path.split('.').reduce((current, key) => current?.[key], source);
}
