import ApiError from "../../utils/api-error.js";
import { verifyUserToken } from "../utils/index.js";

// Parses Bearer token and attaches payload to req.user (does not reject if missing)
export function authenticateUser() {
  return function (req, _, next) {
    const header = req.headers["authorization"];
    if (!header) return next();
    if (!header.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("Invalid token format"));
    }
    const token = header.split(" ")[1];
    if (!token) {
      return next(ApiError.unauthorized("Invalid token format"));
    }
    const payload = verifyUserToken(token);
    if (payload) req.user = payload;
    next();
  };
}

// Rejects request if req.user is not set (use after authenticateUser)
export function checkAuthenticatedUser() {
  return function (req, _, next) {
    if (!req.user) {
      return next(ApiError.unauthorized("You must be logged in to access this resource"));
    }
    return next();
  };
}

// Convenience: parses token AND rejects if not authenticated (use as single middleware)
export function restrictToAuthenticatedUser() {
  return function (req, res, next) {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      return next(ApiError.unauthorized("You must be logged in to access this resource"));
    }
    const token = header.split(" ")[1];
    if (!token) {
      return next(ApiError.unauthorized("Invalid token format"));
    }
    const payload = verifyUserToken(token);
    if (!payload) {
      return next(ApiError.unauthorized("Invalid or expired token"));
    }
    req.user = payload;
    next();
  };
}

export function validate(DtoClass, target = "body") {
  return async function (req, _, next) {
    try {
      req[target] = await DtoClass.validate(req[target]);
      next();
    } catch (error) {
      next(error);
    }
  };
}
