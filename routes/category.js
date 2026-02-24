const express = require("express");
const Category = require("../models/Category");
const verifyAccessToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/admin/category:
 *   post:
 *     summary: Admin creates a new category
 *     tags: [Category]
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Category already exists or validation error
 *       403:
 *         description: Access denied
 */
router.post(
  "/admin/category",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Category name is required" });
      }

      const existing = await Category.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "Category already exists" });
      }

      const category = await Category.create({ name });

      res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/category:
 *   get:
 *     summary: Get all categories
 *     tags: [Category]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       403:
 *         description: Unauthorized
 */
router.get(
  "/category",
  verifyAccessToken,
  checkRole(["admin", "salesman"]),
  async (req, res) => {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });

      res.status(200).json({
        count: categories.length,
        categories,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;