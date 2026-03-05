const db = require("../config/db");

// dépôt
exports.deposit = async (req, res) => {
  const { accountId, amount } = req.body;

  try {
    await db.query(
      "UPDATE comptes_bancaires SET solde = solde + ? WHERE id = ?",
      [amount, accountId]
    );

    await db.query(
      "INSERT INTO transactions (type, montant, compte_destination_id) VALUES ('DEPOT', ?, ?)",
      [amount, accountId]
    );

    res.json({ message: "Dépôt effectué" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// retrait
exports.withdraw = async (req, res) => {
  const { accountId, amount } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT solde FROM comptes_bancaires WHERE id = ?",
      [accountId]
    );

    if (rows[0].solde < amount) {
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

    res.json({ message: "Retrait effectué" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// virement
exports.transfer = async (req, res) => {
  const { fromAccountId, toIban, amount } = req.body;

  try {
    const [source] = await db.query(
      "SELECT solde FROM comptes_bancaires WHERE id = ?",
      [fromAccountId]
    );

    if (source[0].solde < amount) {
      return res.status(400).json({ error: "Solde insuffisant" });
    }

    const [dest] = await db.query(
      "SELECT id FROM comptes_bancaires WHERE iban = ?",
      [toIban]
    );

    if (dest.length === 0) {
      return res.status(404).json({ error: "Compte destination introuvable" });
    }

    const destId = dest[0].id;

    await db.query(
      "UPDATE comptes_bancaires SET solde = solde - ? WHERE id = ?",
      [amount, fromAccountId]
    );

    await db.query(
      "UPDATE comptes_bancaires SET solde = solde + ? WHERE id = ?",
      [amount, destId]
    );

    await db.query(
      "INSERT INTO transactions (type, montant, compte_source_id, compte_destination_id) VALUES ('VIREMENT', ?, ?, ?)",
      [amount, fromAccountId, destId]
    );

    res.json({ message: "Virement effectué" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// historique
exports.history = async (req, res) => {
  const accountId = req.params.accountId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM transactions WHERE compte_source_id = ? OR compte_destination_id = ? ORDER BY created_at DESC",
      [accountId, accountId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};