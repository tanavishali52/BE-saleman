const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Shop = require("../models/Shop");
const Item = require("../models/Item");
const verifyAccessToken = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roleMiddleware");

const router = express.Router();

/** Payment type id mapping: 1=half, 2=full, 3=cashOnDelivery. Amount is sent per order in POST /api/order. */
const PAYMENT_TYPES = [
  { id: 1, type: "half" },
  { id: 2, type: "full" },
  { id: 3, type: "cashOnDelivery" },
];

/**
 * @swagger
 * /api/payment-types:
 *   get:
 *     summary: Get payment types with id (for order payment)
 *     description: Returns payment types. Use id or type when creating an order; send paymentAmount (e.g. 20000) in POST /api/order.
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment types (id and type)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                     example: 1
 *                   type:
 *                     type: string
 *                     example: half
 *       403:
 *         description: Access denied
 */
router.get("/payment-types", verifyAccessToken, checkRole(["admin", "salesman"]), (req, res) => {
  res.json(PAYMENT_TYPES);
});

/**
 * @swagger
 * /api/order:
 *   post:
 *     summary: Salesman places an order for a shop
 *     description: |
 *       Flow: 1) Get shops (GET /api/admin/shops), 2) Get products (GET /api/product),
 *       then send shopId, items (productId + quantity), and paymentType. Line total = quantity × product price.
 *       Payment types: half (id 1), full (id 2), cashOnDelivery (id 3). Each has an amount in numbers (e.g. 20000).
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - items
 *               - paymentType
 *               - paymentAmount
 *             properties:
 *               shopId:
 *                 type: string
 *                 description: Shop ID (from GET /api/admin/shops)
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID (from GET /api/product)
 *                     quantity:
 *                       type: number
 *                       minimum: 1
 *               paymentType:
 *                 type: string
 *                 enum: [half, full, cashOnDelivery]
 *                 description: half (id 1), full (id 2), cashOnDelivery (id 3)
 *               paymentAmount:
 *                 type: number
 *                 minimum: 0
 *                 example: 20000
 *                 description: Payment amount in numbers
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Order created successfully
 *                 order:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     shop:
 *                       type: string
 *                     salesman:
 *                       type: string
 *                     orderLines:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                           productName:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           unitPrice:
 *                             type: number
 *                           lineTotal:
 *                             type: number
 *                     totalAmount:
 *                       type: number
 *                     paymentType:
 *                       type: string
 *                       enum: [half, full, cashOnDelivery]
 *                     paymentTypeId:
 *                       type: number
 *                       description: 1=half, 2=full, 3=cashOnDelivery
 *                     paymentAmount:
 *                       type: number
 *                       example: 20000
 *       400:
 *         description: Validation error (missing shopId/items/paymentType/paymentAmount, invalid paymentType/shop/product, empty items)
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.post(
  "/order",
  verifyAccessToken,
  checkRole(["admin", "salesman"]),
  async (req, res) => {
    try {
      const { shopId, items, paymentType, paymentAmount } = req.body;

      const validPaymentTypes = ["half", "full", "cashOnDelivery"];
      const paymentTypeToId = { half: 1, full: 2, cashOnDelivery: 3 };

      if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "shopId, paymentType, paymentAmount, and at least one item (productId, quantity) are required",
        });
      }
      if (!paymentType || !validPaymentTypes.includes(paymentType)) {
        return res.status(400).json({
          message: "paymentType must be one of: half, full, cashOnDelivery",
        });
      }
      const amount = Number(paymentAmount);
      if (amount == null || isNaN(amount) || amount < 0) {
        return res.status(400).json({
          message: "paymentAmount must be a number >= 0",
        });
      }

      const paymentTypeId = paymentTypeToId[paymentType];

      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(400).json({ message: "Shop not found" });
      }
      if (shop.isActive === false) {
        return res.status(400).json({ message: "Shop is not active" });
      }

      const orderLines = [];
      let totalAmount = 0;

      for (const line of items) {
        const { productId, quantity } = line;
        if (!productId || quantity == null || quantity < 1) {
          return res.status(400).json({
            message: "Each item must have productId and quantity (min 1)",
          });
        }

        const product = await Item.findById(productId);
        if (!product) {
          return res.status(400).json({
            message: `Product not found: ${productId}`,
          });
        }

        if (product.quantity < quantity) {
          return res.status(400).json({
            message: `Insufficient stock for product ${product.name}`,
          });
        }

        const unitPrice = product.price;
        const lineTotal = quantity * unitPrice;

        orderLines.push({
          product: product._id,
          productName: product.name,
          quantity,
          unitPrice,
          lineTotal,
        });
        totalAmount += lineTotal;

        product.quantity -= quantity;
        await product.save();
      }

      const order = await Order.create({
        shop: shopId,
        salesman: req.user.id,
        orderLines,
        totalAmount,
        paymentType,
        paymentTypeId,
        paymentAmount: amount,
      });

      const populated = await Order.findById(order._id)
        .populate("shop", "shopName ownerName address city")
        .populate("salesman", "name email");

      res.status(201).json({
        message: "Order created successfully",
        order: populated,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/shop-orders-summary:
 *   get:
 *     summary: Admin – get all shops with order amount and payment status
 *     description: Returns every shop with aggregated order count, total order amount, and payment breakdown (half, full, cashOnDelivery).
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shops with order and payment summary
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   shop:
 *                     type: object
 *                     description: Shop document (shopName, ownerName, address, city, isActive, etc.)
 *                   orderCount:
 *                     type: number
 *                     description: Number of orders for this shop
 *                   totalOrderAmount:
 *                     type: number
 *                     description: Sum of all order totalAmount
 *                   paymentSummary:
 *                     type: object
 *                     properties:
 *                       half:
 *                         type: number
 *                         description: Total payment amount with type half
 *                       full:
 *                         type: number
 *                         description: Total payment amount with type full
 *                       cashOnDelivery:
 *                         type: number
 *                         description: Total payment amount with type cashOnDelivery
 *       403:
 *         description: Access denied (admin only)
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Admin – get all orders (for order IDs to use in PATCH payment)
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all orders
 *       403:
 *         description: Access denied (admin only)
 */
router.get(
  "/admin/orders",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const orders = await Order.find()
        .sort({ createdAt: -1 })
        .populate("shop", "shopName ownerName address city")
        .populate("salesman", "name email")
        .lean();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/admin/order/{orderId}/payment:
 *   patch:
 *     summary: Admin – update amount paid for an order (when shop pays later)
 *     description: When a shop user pays an amount in the future, update the order's amountPaid. Send the total amount paid so far (not the additional amount).
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountPaid
 *             properties:
 *               amountPaid:
 *                 type: number
 *                 minimum: 0
 *                 description: Total amount paid so far for this order (will replace current amountPaid)
 *     responses:
 *       200:
 *         description: Order payment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Payment amount updated successfully
 *                 order:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     amountPaid:
 *                       type: number
 *       400:
 *         description: amountPaid must be >= 0 and <= totalAmount (optional validation)
 *       404:
 *         description: Order not found
 *       403:
 *         description: Access denied (admin only)
 *       500:
 *         description: Server error
 */
router.patch(
  "/admin/order/:orderId/payment",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const { amountPaid } = req.body;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          message: "Invalid order ID. Use an Order _id from POST /api/order or GET /api/admin/orders.",
        });
      }

      const amount = amountPaid != null ? Number(amountPaid) : NaN;
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          message: "amountPaid must be a number >= 0",
        });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          message: "Order not found. Use an Order _id from POST /api/order or GET /api/admin/orders.",
        });
      }

      if (amount > order.totalAmount) {
        return res.status(400).json({
          message: "amountPaid cannot exceed order totalAmount",
        });
      }

      order.amountPaid = amount;
      await order.save();

      const updated = await Order.findById(orderId)
        .populate("shop", "shopName ownerName address city")
        .populate("salesman", "name email");

      res.json({
        message: "Payment amount updated successfully",
        order: updated,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get(
  "/admin/shop-orders-summary",
  verifyAccessToken,
  checkRole(["admin"]),
  async (req, res) => {
    try {
      const shops = await Shop.find().lean();
      const shopIds = shops.map((s) => s._id);

      const summaries = await Order.aggregate([
        { $match: { shop: { $in: shopIds } } },
        {
          $group: {
            _id: "$shop",
            orderCount: { $sum: 1 },
            totalOrderAmount: { $sum: "$totalAmount" },
            half: { $sum: { $cond: [{ $eq: ["$paymentType", "half"] }, "$paymentAmount", 0] } },
            full: { $sum: { $cond: [{ $eq: ["$paymentType", "full"] }, "$paymentAmount", 0] } },
            cashOnDelivery: {
              $sum: { $cond: [{ $eq: ["$paymentType", "cashOnDelivery"] }, "$paymentAmount", 0] },
            },
          },
        },
      ]);

      const summaryByShop = new Map(
        summaries.map((s) => [
          s._id.toString(),
          {
            orderCount: s.orderCount,
            totalOrderAmount: s.totalOrderAmount,
            paymentSummary: {
              half: s.half,
              full: s.full,
              cashOnDelivery: s.cashOnDelivery,
            },
          },
        ])
      );

      const result = shops.map((shop) => {
        const id = shop._id.toString();
        const summary = summaryByShop.get(id) || {
          orderCount: 0,
          totalOrderAmount: 0,
          paymentSummary: { half: 0, full: 0, cashOnDelivery: 0 },
        };
        return {
          shop,
          orderCount: summary.orderCount,
          totalOrderAmount: summary.totalOrderAmount,
          paymentSummary: summary.paymentSummary,
        };
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
