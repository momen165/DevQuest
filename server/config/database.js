const prisma = require("./prisma");

/**
 * Legacy database shim.
 * Raw SQL access has been removed in favor of Prisma.
 */
module.exports = {
  prisma,
};
