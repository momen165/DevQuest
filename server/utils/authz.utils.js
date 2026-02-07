const toIntId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getRequesterUserId = (req) =>
  toIntId(req?.user?.user_id ?? req?.user?.userId);

const isAdminUser = (req) => Boolean(req?.user?.admin);

const canAccessUser = (req, targetUserId) => {
  const requesterUserId = getRequesterUserId(req);
  const normalizedTargetId = toIntId(targetUserId);

  if (normalizedTargetId === null) {
    return false;
  }

  return isAdminUser(req) || requesterUserId === normalizedTargetId;
};

module.exports = {
  toIntId,
  getRequesterUserId,
  isAdminUser,
  canAccessUser,
};
