import jwt from "jsonwebtoken";

export const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required"
      })
    }

    const token = authHeader.split(" ")[1];

    const decode = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY
    );

    req.user = decode;
    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
}

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if(!req.user) {
      return res.status(401).json({
        success: false, 
        message: "Authorization required"
      })
    }

    if(!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this record",
      })
    }

    next();
  }
}
