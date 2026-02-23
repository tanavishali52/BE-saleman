const express = require("express");
const User = require("../models/user");
const verifyAccessToken = require("../middleware/authMiddleware"); // checks JWT
const checkRole = require("../middleware/roleMiddleware"); // checks role
const bcrypt = require("bcryptjs");

const router = express.Router();

/**
 * @swagger
 * /api/admin/create-salesman:
 *   post:
 *     summary: Admin creates a new salesman
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Salesman created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied (only admin can create salesman)
 *       500:
 *         description: Server error
 */
router.post("/create-salesman", verifyAccessToken, checkRole(["admin"]), async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ message: "Invalid JSON body. Use Content-Type: application/json" });
    }
    const { name, phone, address, email, password } = req.body;
    if (!name || !phone || !address || !password) {
      return res.status(400).json({ message: "All fields except email are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name, phone, address, email, password: hashedPassword, role: "salesman",
    });

    res.status(201).json({ message: "Salesman created successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;