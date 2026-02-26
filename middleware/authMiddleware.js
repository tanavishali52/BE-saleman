const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isActive === false) {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Please contact the administrator." });
    }

    req.user = { id: user._id, role: user.role };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyAccessToken;