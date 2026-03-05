const express = require("express");
const { body } = require("express-validator");
const transactionController = require("../controllers/transactionController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// dépôt
router.post(
  "/deposit",
  requireAuth,
  [
    body("accountId").isInt(),
    body("amount").isFloat({ min: 1 })
  ],
  transactionController.deposit
);

// retrait
router.post(
  "/withdraw",
  requireAuth,
  [
    body("accountId").isInt(),
    body("amount").isFloat({ min: 1, max: 1000 })
  ],
  transactionController.withdraw
);

// virement
router.post(
  "/transfer",
  requireAuth,
  [
    body("fromAccountId").isInt(),
    body("toIban").notEmpty(),
    body("amount").isFloat({ min: 1 })
  ],
  transactionController.transfer
);

// historique
router.get(
  "/history/:accountId",
  requireAuth,
  transactionController.history
);

module.exports = router;