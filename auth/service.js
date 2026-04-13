import { query } from "../db/index.js";
import { generateAccessAndRefreshToken, hashPassword } from "./utils/index.js";
import ApiError from "../utils/api-error.js";
import { env } from "../config/env.js";
import JWT from "jsonwebtoken";
import { userSanitize } from "./utils/sanitize.js";

class AuthenticationService {
  async signUp(username, email, password) {
    const { rows: existing } = await query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    if (existing.length > 0) {
      throw ApiError.conflict("User with this email already exists");
    }

    const { salt, hashedPassword } = hashPassword(password, "");

    const { rows } = await query(
      `INSERT INTO users (username, email, password, salt)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [username, email, hashedPassword, salt],
    );

    return rows[0];
  }

  async signIn(email, password) {
    const { rows } = await query(
      "SELECT * FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    const existingUser = rows[0];

    if (!existingUser) {
      throw ApiError.notFound(`No account found with email ${email}`);
    }

    const { hashedPassword } = hashPassword(password, existingUser.salt);

    if (hashedPassword !== existingUser.password) {
      throw ApiError.unauthorized("Incorrect credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existingUser.id);
    return { accessToken, refreshToken };
  }

  async getUser(id) {
    const { rows } = await query(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [id],
    );

    const user = rows[0];

    if (!user) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    return userSanitize(user);
  }

  async signOut(id) {
    await query("UPDATE users SET refresh_token = NULL WHERE id = $1", [id]);
  }

  async refreshTokens(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized("No refresh token provided");
    }

    let decoded;
    try {
      decoded = JWT.verify(incomingRefreshToken, env.REFRESH_TOKEN_SECRET);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token");
    }

    const { id } = decoded;
    const { rows } = await query(
      "SELECT * FROM users WHERE id = $1 AND refresh_token = $2 LIMIT 1",
      [id, incomingRefreshToken],
    );

    if (rows.length === 0) {
      // Refresh token reuse detection — invalidate all sessions
      await query("UPDATE users SET refresh_token = NULL WHERE id = $1", [id]);
      throw ApiError.unauthorized("Refresh token revoked. Please log in again.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(id);
    return { accessToken, refreshToken };
  }
}

export default new AuthenticationService();
