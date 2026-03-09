const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const db = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// middlewares
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "irisbanksecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true
    }
  })
);

// rate limit login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Trop de tentatives de connexion" }
});

// CSRF protection
const csrfProtection = csrf({
  cookie: true
});

// route pour récupérer le token CSRF
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ROUTES AUTH
app.use("/api/auth/login", loginLimiter); // limiter login
app.use("/api/auth", authRoutes); // auth sans csrf obligatoire

// ROUTES PROTÉGÉES
app.use("/api/accounts", csrfProtection, accountRoutes);
app.use("/api/transactions", csrfProtection, transactionRoutes);
app.use("/api/admin", csrfProtection, adminRoutes);

// gestion erreur CSRF
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      error: "Token CSRF invalide ou manquant"
    });
  }

  console.error(err);
  res.status(500).json({
    error: "Erreur serveur"
  });
});

// lancement serveur
app.listen(3000, () => {
  console.log("🚀 IRISBANK server running on port 3000");
});