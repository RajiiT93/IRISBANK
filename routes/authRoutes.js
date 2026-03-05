const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");

const router = express.Router();

// Register
router.post(
  "/register",
  [
    body("nom").trim().notEmpty().withMessage("Nom requis"),
    body("prenom").trim().notEmpty().withMessage("Prénom requis"),
    body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
    body("telephone").trim().isLength({ min: 10, max: 20 }).withMessage("Téléphone invalide"),
    body("adresse").trim().notEmpty().withMessage("Adresse requise"),
    body("date_naissance").isISO8601().withMessage("Date de naissance invalide (YYYY-MM-DD)"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Mot de passe min 8 caractères")
      .matches(/[A-Z]/)
      .withMessage("Mot de passe: 1 majuscule requise")
      .matches(/[0-9]/)
      .withMessage("Mot de passe: 1 chiffre requis"),
  ],
  authController.register
);

// Login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
    body("password").notEmpty().withMessage("Mot de passe requis"),
  ],
  authController.login
);

// Me (session)
router.get("/me", authController.me);

// Logout
router.post("/logout", authController.logout);

module.exports = router;