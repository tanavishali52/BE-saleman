const express = require("express");
const Item = require("../models/Item");
const Category = require("../models/Category");
const verifyAccessToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/admin/item:
 *   post:
 *     summary: Admin creates a new item
 *     tags: [Item]
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
 *               - categoryType
 *               - price
 *               - quantity
 *             properties:
 *               name:
 *                 type: string
 *               categoryType:
 *                 type: string
 *                 description: Category ID
 *               price:
 *                 type: number
 *               quantity:
 *                 type: number
 *     responses:
 *       201:
 *         description: Item created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post(
  "/admin/item",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { name, categoryType, price, quantity } = req.body;

      if (!name || !categoryType || !price || !quantity) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check category exists
      const category = await Category.findById(categoryType);
      if (!category) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const item = await Item.create({
        name,
        categoryType,
        price,
        quantity,
      });

      res.status(201).json({
        message: "Item created successfully",
        item,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/item:
 *   get:
 *     summary: Get all items
 *     description: Returns all items with populated category name. Accessible by admin and salesman.
 *     tags: [Item]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                     example: 200
 *                   quantity:
 *                     type: number
 *                     example: 50
 *                   categoryType:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: Fruits
 *       403:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

router.get(
  "/item",
  verifyAccessToken,
  checkRole(["admin", "salesman"]),
  async (req, res) => {
    const items = await Item.find().populate("categoryType", "name");
    res.json(items);
  }
);
module.exports = router;