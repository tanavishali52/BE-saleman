/**
 * Check that req.user.role is one of the allowed roles.
 * @param {string[]} allowedRoles - e.g. ["admin"] or ["admin", "salesman"]
 */
const checkRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = checkRole;