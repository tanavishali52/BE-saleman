const express = require("express");
const Shop = require("../models/Shop");
const verifyAccessToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/admin/add-shop:
 *   post:
 *     summary: Admin creates a new shop
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopName
 *               - ownerName
 *               - cnic
 *               - phoneNumber
 *               - address
 *               - city
 *             properties:
 *               shopName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               cnic:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       201:
 *         description: Shop created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post(
  "/admin/add-shop",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { shopName, ownerName, cnic, phoneNumber, address, city } =
        req.body || {};

      if (!shopName || !ownerName || !cnic || !phoneNumber || !address || !city) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existing = await Shop.findOne({ cnic });
      if (existing) {
        return res.status(400).json({ message: "Shop with this CNIC already exists" });
      }

      const shop = await Shop.create({
        shopName,
        ownerName,
        cnic,
        phoneNumber,
        address,
        city,
      });

      res.status(201).json({ message: "Shop created successfully", shop });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/shops:
 *   get:
 *     summary: Get all shops (with optional search)
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ownerName
 *         schema:
 *           type: string
 *         description: Filter shops by owner name (partial, case-insensitive)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter shops by city (partial, case-insensitive)
 *     responses:
 *       200:
 *         description: List of shops
 *       403:
 *         description: Access denied
 */
router.get(
  "/admin/shops",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { ownerName, city } = req.query;

      const filter = {};
      if (ownerName) {
        filter.ownerName = { $regex: ownerName, $options: "i" };
      }
      if (city) {
        filter.city = { $regex: city, $options: "i" };
      }

      const shops = await Shop.find(filter);
      res.json(shops);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/shop/{id}:
 *   put:
 *     summary: Update a shop
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               cnic:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shop updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Shop not found
 */
router.put(
  "/admin/shop/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { shopName, ownerName, cnic, phoneNumber, address, city } =
        req.body || {};

      if (cnic) {
        const existing = await Shop.findOne({ cnic, _id: { $ne: id } });
        if (existing) {
          return res
            .status(400)
            .json({ message: "Another shop with this CNIC already exists" });
        }
      }

      const update = {};
      if (shopName !== undefined) update.shopName = shopName;
      if (ownerName !== undefined) update.ownerName = ownerName;
      if (cnic !== undefined) update.cnic = cnic;
      if (phoneNumber !== undefined) update.phoneNumber = phoneNumber;
      if (address !== undefined) update.address = address;
      if (city !== undefined) update.city = city;

      const shop = await Shop.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });

      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.json({ message: "Shop updated successfully", shop });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/shop/{id}:
 *   delete:
 *     summary: Delete a shop
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
 *     responses:
 *       200:
 *         description: Shop deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Shop not found
 */
router.delete(
  "/admin/shop/:id",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const shop = await Shop.findByIdAndDelete(id);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.json({ message: "Shop deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/shop/{id}/status:
 *   patch:
 *     summary: Activate or disable a shop
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shop ID
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
 *                 description: true to activate, false to disable
 *     responses:
 *       200:
 *         description: Shop status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Shop not found
 */
router.patch(
  "/admin/shop/:id/status",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body || {};

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean value" });
      }

      const shop = await Shop.findByIdAndUpdate(id, { isActive }, { new: true });
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      res.json({
        message: `Shop has been ${isActive ? "activated" : "disabled"}`,
        shop,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;

