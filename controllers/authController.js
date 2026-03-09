const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const db = require("../config/db");

// REGISTER
exports.register = async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg
      });
    }

    const {
      nom,
      prenom,
      email,
      telephone,
      adresse,
      date_naissance,
      password
    } = req.body;

    const [users] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (users.length > 0) {
      return res.status(400).json({
        error: "Email déjà utilisé"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users
      (nom, prenom, email, telephone, adresse, date_naissance, password_hash, role, is_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CLIENT', 0)`,
      [nom, prenom, email, telephone, adresse, date_naissance, hash]
    );

    res.json({
      message: "Inscription réussie"
    });

  } catch (err) {

    console.error("REGISTER ERROR :", err);

    res.status(500).json({
      error: "Erreur serveur"
    });

  }
};


// LOGIN
exports.login = async (req, res) => {

  try {

    const { email, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: "Utilisateur introuvable"
      });
    }

    const user = users[0];

    // correction ici : password_hash
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({
        error: "Mot de passe incorrect"
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      is_admin: user.is_admin
    };

    res.json({
      message: "Connexion réussie",
      user: req.session.user,
      is_admin: user.is_admin
    });

  } catch (err) {

    console.error("LOGIN ERROR :", err);

    res.status(500).json({
      error: "Erreur serveur"
    });

  }

};


// ME
exports.me = (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({
      error: "Non connecté"
    });
  }

  res.json({
    user: req.session.user
  });

};


// LOGOUT
exports.logout = (req, res) => {

  req.session.destroy(() => {

    res.clearCookie("connect.sid");

    res.json({
      message: "Déconnecté"
    });

  });

};