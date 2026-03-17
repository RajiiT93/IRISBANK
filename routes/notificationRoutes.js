const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/", requireAuth, async (req,res)=>{

  const userId = req.session.user.id;

  const [rows] = await db.query(
    "SELECT id, message, type, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );

  res.json({notifications: rows});

});

module.exports = router;