const express = require("express");
const { body, param } = require("express-validator");
const transactionController = require("../controllers/transactionController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// dépôt
router.post(
  "/deposit",
  requireAuth,
  [
    body("accountId").isInt().withMessage("accountId invalide"),
    body("amount").isFloat({ min: 1 }).withMessage("amount min 1"),
  ],
  transactionController.deposit
);

// retrait
router.post(
  "/withdraw",
  requireAuth,
  [
    body("accountId").isInt().withMessage("accountId invalide"),
    body("amount")
      .isFloat({ min: 1, max: 1000 })
      .withMessage("amount min 1, max 1000"),
  ],
  transactionController.withdraw
);

// virement
router.post(
  "/transfer",
  requireAuth,
  [
    body("fromAccountId").isInt().withMessage("fromAccountId invalide"),
    body("toIban").trim().notEmpty().withMessage("toIban requis"),
    body("amount").isFloat({ min: 1 }).withMessage("amount min 1"),
  ],
  transactionController.transfer
);

// historique (source OU destination)
router.get(
  "/history/:accountId",
  requireAuth,
  [param("accountId").isInt().withMessage("accountId invalide")],
  transactionController.history
);

module.exports = router;