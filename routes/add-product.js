const express = require("express");
const Item = require("../models/Item");
const Category = require("../models/Category");
const verifyAccessToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/admin/add-product:
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
  "/admin/add-product",
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
 * /api/admin/product/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Item]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *   delete:
 *     summary: Delete a product
 *     tags: [Item]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */

router.put(
  "/admin/product/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, categoryType, price, quantity } = req.body;

      if (categoryType) {
        const category = await Category.findById(categoryType);
        if (!category) {
          return res.status(400).json({ message: "Invalid category ID" });
        }
      }

      const updatedItem = await Item.findByIdAndUpdate(
        id,
        { name, categoryType, price, quantity },
        { new: true, runValidators: true }
      );

      if (!updatedItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({
        message: "Item updated successfully",
        item: updatedItem,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete(
  "/admin/product/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const deletedItem = await Item.findByIdAndDelete(id);

      if (!deletedItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/product:
 *   get:
 *     summary: Get products (with optional search)
 *     description: Returns products with populated category name. You can filter by product name or category.
 *     tags: [Item]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter products by name (partial match, case-insensitive)
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter products by category ID
 *       - in: query
 *         name: categoryName
 *         schema:
 *           type: string
 *         description: Filter products by category name (partial match, case-insensitive)
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
  "/product",
  verifyAccessToken,
  checkRole(["admin", "salesman"]),
  async (req, res) => {
    try {
      const { name, categoryId, categoryName } = req.query;

      const filter = {};

      if (name) {
        filter.name = { $regex: name, $options: "i" };
      }

      if (categoryId) {
        filter.categoryType = categoryId;
      } else if (categoryName) {
        const categories = await Category.find(
          { name: { $regex: categoryName, $options: "i" } },
          "_id"
        );

        const categoryIds = categories.map((c) => c._id);

        if (categoryIds.length === 0) {
          return res.json([]);
        }

        filter.categoryType = { $in: categoryIds };
      }

      const items = await Item.find(filter).populate("categoryType", "name");
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
module.exports = router;