const express = require("express");
const session = require("express-session");
require("dotenv").config();

const db = require("./config/db");

// routes
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const app = express();

// fichiers HTML publics
app.use(express.static("public"));

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// session utilisateur
app.use(
  session({
    secret: process.env.SESSION_SECRET || "irisbanksecret",
    resave: false,
    saveUninitialized: false,
  })
);

// route test serveur
app.get("/", (req, res) => {
  res.send("IRISBANK API running");
});

// test connexion base
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ message: "Database connected", rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// routes API
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

// route DEV pour reset password
app.post("/dev/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const bcrypt = require("bcrypt");
    const hash = await bcrypt.hash(newPassword, 10);

    const [result] = await db.query(
      "UPDATE users SET password_hash = ? WHERE email = ?",
      [hash, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User introuvable" });
    }

    res.json({ message: "Password reset OK (dev)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// lancement serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});