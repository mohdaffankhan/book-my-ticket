import { randomBytes, createHmac, createHash } from "node:crypto";
import JWT from "jsonwebtoken";
import { env } from "../../config/env.js";
import { query } from "../../db/index.js";
import ApiError from "../../utils/api-error.js";

const hashPassword = (password, salt) => {
  if (salt.trim().length === 0) {
    salt = randomBytes(32).toString("hex");
  }
  const hashedPassword = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return { salt, hashedPassword };
};

const hashToken = (token) => {
  return createHash("sha256").update(token).digest("hex");
};

const verifyUserToken = (token) => {
  try {
    return JWT.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch {
    return null;
  }
};

const generateAccessToken = ({ id, email, username }) => {
  return JWT.sign({ id, email, username }, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRY,
  });
};

const generateRefreshToken = (id) => {
  return JWT.sign({ id }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRY,
  });
};

const generateAccessAndRefreshToken = async (userId) => {
  const { rows } = await query(
    "SELECT id, email, username FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  const user = rows[0];

  if (!user) {
    throw ApiError.unauthorized("Invalid Request");
  }

  const { id, email, username } = user;
  const accessToken = generateAccessToken({ id, email, username });
  const refreshToken = generateRefreshToken(id);

  try {
    await query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
      refreshToken,
      id,
    ]);
  } catch (error) {
    throw ApiError.internalServerError(error.message);
  }

  return { accessToken, refreshToken };
};

export {
  hashPassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  generateAccessAndRefreshToken,
  verifyUserToken,
};
