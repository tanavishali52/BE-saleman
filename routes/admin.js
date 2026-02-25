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
 *               - idCardNumber
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               idCardNumber:
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
    const { name, phone, address, email, password, idCardNumber } = req.body;
    if (!name || !phone || !address || !password || !idCardNumber) {
      return res.status(400).json({ message: "All fields except email are required and ID card number is mandatory" });
    }

    const existingByIdCard = await User.findOne({ idCardNumber });
    if (existingByIdCard) {
      return res.status(400).json({ message: "A user with this ID card number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      phone,
      address,
      email,
      idCardNumber,
      password: hashedPassword,
      role: "salesman",
    });

    res.status(201).json({ message: "Salesman created successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/admin/salesmen:
 *   get:
 *     summary: Get all salesmen
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of salesman users
 *       403:
 *         description: Access denied
 */
router.get(
  "/salesmen",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const users = await User.find({ role: "salesman" }).select(
        "-password -refreshToken"
      );
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/salesman/{id}:
 *   put:
 *     summary: Update salesman information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Salesman user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               idCardNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Salesman updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Salesman not found
 */
router.put(
  "/salesman/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, address, email, idCardNumber } = req.body || {};

      const update = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (address !== undefined) update.address = address;
      if (email !== undefined) update.email = email;
      if (idCardNumber !== undefined) update.idCardNumber = idCardNumber;

      const user = await User.findOneAndUpdate(
        { _id: id, role: "salesman" },
        update,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ message: "Salesman not found" });
      }

      res.json({ message: "Salesman updated successfully", user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/salesman/{id}:
 *   delete:
 *     summary: Delete a salesman
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Salesman user ID
 *     responses:
 *       200:
 *         description: Salesman deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Salesman not found
 */
router.delete(
  "/salesman/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findOneAndDelete({ _id: id, role: "salesman" });

      if (!user) {
        return res.status(404).json({ message: "Salesman not found" });
      }

      res.json({ message: "Salesman deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/salesman/{id}/status:
 *   patch:
 *     summary: Block or activate a salesman
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Salesman user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 description: true to activate, false to block
 *     responses:
 *       200:
 *         description: Salesman status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Salesman not found
 */
router.patch(
  "/salesman/:id/status",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body || {};

      if (typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ message: "isActive must be a boolean value" });
      }

      const user = await User.findOneAndUpdate(
        { _id: id, role: "salesman" },
        { isActive },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "Salesman not found" });
      }

      res.json({
        message: `Salesman has been ${isActive ? "activated" : "blocked"}`,
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;