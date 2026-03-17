const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/", requireAuth, async (req,res)=>{

  try{

    const userId = req.session.user.id;

    // 🔥 récupérer UNIQUEMENT les notifs de l'utilisateur
    const [rows] = await db.query(
      `SELECT id, message, type, created_at 
       FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({notifications: rows});

  }catch(err){

    console.error("NOTIF ERROR:", err);

    res.status(500).json({
      error: "Erreur serveur notifications"
    });

  }

});

module.exports = router;