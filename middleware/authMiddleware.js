exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Non connecté" });
  }
  next();
};

exports.requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Non connecté" });
  }
  if (req.session.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès admin requis" });
  }
  next();
};