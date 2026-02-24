const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const verifyAccessToken = require("../middleware/authMiddleware");

const router = express.Router();

const generateAccessToken = (user) => {
    return jwt.sign(
      { id: user._id,
        role:user.role
       },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
  };
  
  const generateRefreshToken = (user) => {
    return jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
  };


/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Signup a new admin (default role is admin)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - address
 *               - password
 *             properties:
 *               name:
 *                 type: ali
 *               phone:
 *                 type: 2345673
 *               address:
 *                 type: okara
 *               email:
 *                 type: tanavish@gmail.com
 *               password:
 *                 type: 12345
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post("/signup", async (req, res) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Invalid JSON body. Use Content-Type: application/json" });
      }
      const { name, phone, address, email, password } = req.body;
      if (!name || !phone || !address || !password) {
        return res.status(400).json({ message: "All fields except email are required" });
      }
  
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "User already exists" });
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = await User.create({
        name, phone, address, email, password: hashedPassword, role: "admin",
      });
  
      res.status(201).json({ message: "Admin user created successfully", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  });

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user (admin or salesman)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns accessToken and refreshToken
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/login", async (req, res) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Invalid JSON body. Use Content-Type: application/json" });
      }
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
  
      const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
      const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
  
      user.refreshToken = refreshToken;
      await user.save();
  
      res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  });

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (User must be logged in)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Old password incorrect or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  "/change-password",
  verifyAccessToken,
  async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          message: "Old password and new password are required",
        });
      }

      // Find user from token (req.user.id set in middleware)
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Compare old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;

      // Optional: invalidate refresh token
      user.refreshToken = null;

      await user.save();

      res.status(200).json({
        message: "Password changed successfully",
      });

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);



/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Generate new access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       403:
 *         description: Invalid or expired refresh token
 */

// ================= REFRESH TOKEN =================
  router.post("/refresh-token", async (req, res) => {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ message: "Invalid JSON body. Use Content-Type: application/json" });
    }
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }
  
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }
  
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
      if (err) {
        return res.status(403).json({ message: "Invalid or expired refresh token" });
      }
  
      const newAccessToken = generateAccessToken(user);
  
      res.json({ accessToken: newAccessToken });
    });
  });
  /**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
// ================= LOGOUT =================
  router.post("/logout", async (req, res) => {
    const refreshToken = req.body && req.body.refreshToken;
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.sendStatus(204);
    }
  
    user.refreshToken = null;
    await user.save();
  
    res.json({ message: "Logged out successfully" });
  });
/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Access denied
 */
// ================= PROFILE =================
  router.get("/profile", verifyAccessToken, async (req, res) => {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    res.json(user);
  });

module.exports = router;