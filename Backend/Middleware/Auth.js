const jwt = require("jsonwebtoken");

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const token = req.cookies.token || req.headers["authorization"];

    if (!token) return res.status(401).json({ error: "No authorization token" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
        return res.status(403).json({ error: "No permission" });
      }

      next();
    } catch (err) {
      return res.status(403).json({ error: "Incorrect token" });
    }
  };
}

module.exports = auth;
