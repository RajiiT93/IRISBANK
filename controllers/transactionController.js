const db = require("../config/db");

// dépôt
exports.deposit = async (req, res) => {
  const { accountId, amount } = req.body;
  const userId = req.session.user.id;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    const [account] = await db.query(
      "SELECT iban, statut FROM comptes_bancaires WHERE id = ? AND user_id = ?",
      [accountId, userId]
    );

    if (account.length === 0) {
      return res.status(403).json({ error: "Compte non autorisé" });
    }

    if (account[0].statut === "BLOQUE") {
      return res.status(400).json({ error: "Compte bloqué" });
    }

    await db.query(
      "UPDATE comptes_bancaires SET solde = solde + ? WHERE id = ?",
      [amount, accountId]
    );

    await db.query(
      "INSERT INTO transactions (type, montant, compte_destination_id) VALUES ('DEPOT', ?, ?)",
      [amount, accountId]
    );

    await db.query(
      "INSERT INTO notifications (message, type, user_id) VALUES (?, ?, ?)",
      [
        `💰 Dépôt de ${Number(amount).toFixed(2)}€ sur votre compte ****${account[0].iban.slice(-4)}`,
        "DEPOSIT",
        userId
      ]
    );

    res.json({ message: "Dépôt effectué" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// retrait
exports.withdraw = async (req, res) => {
  const { accountId, amount } = req.body;
  const userId = req.session.user.id;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  try {
    const [rows] = await db.query(
      "SELECT solde, statut, iban FROM comptes_bancaires WHERE id = ? AND user_id = ?",
      [accountId, userId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: "Compte non autorisé" });
    }

    if (rows[0].statut === "BLOQUE") {
      return res.status(400).json({ error: "Compte bloqué" });
    }

    if (Number(rows[0].solde) < Number(amount)) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    await db.query(
      "UPDATE comptes_bancaires SET solde = solde - ? WHERE id = ?",
      [amount, accountId]
    );

    await db.query(
      "INSERT INTO transactions (type, montant, compte_source_id) VALUES ('RETRAIT', ?, ?)",
      [amount, accountId]
    );

    await db.query(
      "INSERT INTO notifications (message, type, user_id) VALUES (?, ?, ?)",
      [
        `💸 Retrait de ${Number(amount).toFixed(2)}€ depuis votre compte ****${rows[0].iban.slice(-4)}`,
        "WITHDRAW",
        userId
      ]
    );

    res.json({ message: "Retrait effectué" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// virement
exports.transfer = async (req, res) => {
  const { fromAccountId, toIban, amount } = req.body;
  const userId = req.session.user.id;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: "Montant invalide" });
  }

  let connection;

  try {
    const [userRows] = await db.query(
      "SELECT nom, prenom FROM users WHERE id = ?",
      [userId]
    );

    const user = userRows[0];

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [source] = await connection.query(
      "SELECT id, solde, statut, iban FROM comptes_bancaires WHERE id = ? AND user_id = ? FOR UPDATE",
      [fromAccountId, userId]
    );

    if (source.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: "Compte source non autorisé" });
    }

    if (source[0].statut === "BLOQUE") {
      await connection.rollback();
      return res.status(400).json({ error: "Compte bloqué" });
    }

    if (Number(source[0].solde) < Number(amount)) {
      await connection.rollback();
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const [dest] = await connection.query(
      "SELECT id, iban, statut, user_id FROM comptes_bancaires WHERE iban = ? FOR UPDATE",
      [toIban]
    );

    if (dest.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Compte destination introuvable" });
    }

    const destId = dest[0].id;
    const destUserId = dest[0].user_id;

    if (!destUserId) {
      console.error("ERREUR user_id destination NULL");
    }

    if (destId === Number(fromAccountId)) {
      await connection.rollback();
      return res.status(400).json({ error: "Impossible de se virer à soi-même" });
    }

    if (dest[0].statut === "BLOQUE") {
      await connection.rollback();
      return res.status(400).json({ error: "Compte destination bloqué" });
    }

    // transfert
    await connection.query(
      "UPDATE comptes_bancaires SET solde = solde - ? WHERE id = ?",
      [amount, fromAccountId]
    );

    await connection.query(
      "UPDATE comptes_bancaires SET solde = solde + ? WHERE id = ?",
      [amount, destId]
    );

    await connection.query(
      "INSERT INTO transactions (type, montant, compte_source_id, compte_destination_id) VALUES ('VIREMENT', ?, ?, ?)",
      [amount, fromAccountId, destId]
    );

    // notif expéditeur
    await connection.query(
      "INSERT INTO notifications (message, type, user_id) VALUES (?, ?, ?)",
      [
        `📤 Virement de ${Number(amount).toFixed(2)}€ envoyé`,
        "TRANSFER",
        userId
      ]
    );

    // notif destinataire 🔥
    if (destUserId) {
      await connection.query(
        "INSERT INTO notifications (message, type, user_id) VALUES (?, ?, ?)",
        [
          `💰 Vous avez reçu ${Number(amount).toFixed(2)}€ de ${user.prenom} ${user.nom}`,
          "TRANSFER_RECEIVED",
          destUserId
        ]
      );
    }

    await connection.commit();

    res.json({ message: "Virement effectué" });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) connection.release();
  }
};


// historique
exports.history = async (req, res) => {
  const accountId = Number(req.params.accountId);
  const userId = req.session.user.id;

  try {
    const [account] = await db.query(
      "SELECT id FROM comptes_bancaires WHERE id = ? AND user_id = ?",
      [accountId, userId]
    );

    if (account.length === 0) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const [rows] = await db.query(
      `SELECT * FROM transactions
       WHERE compte_source_id = ? OR compte_destination_id = ?
       ORDER BY created_at DESC`,
      [accountId, accountId]
    );

    res.json({ transactions: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};