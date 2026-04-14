import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { dirname } from "path";
import { fileURLToPath } from "url";

import { authRouter } from "./auth/routes.js";
import { globalErrorHandler } from "./auth/middleware/error.middleware.js";
import { authenticateUser, checkAuthenticatedUser } from "./auth/middleware/auth.middleware.js";
import { query } from "./db/index.js";
import bookingService from "./booking/service.js";
import { env } from "./config/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = new express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.use("/api/v1/auth", authRouter);

// Get all seats
app.get("/seats", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM seats ORDER BY id");
    res.send(result.rows);
  } catch (err) {
    next(err);
  }
});

// Book a seat — protected: only logged-in users can book
// The :name param is kept for frontend compatibility but the actual user is taken from the JWT
app.put(
  "/:id/:name",
  authenticateUser(),
  checkAuthenticatedUser(),
  async (req, res, next) => {
    try {
      const seatId = req.params.id;
      const { id: userId, username } = req.user;
      const booking = await bookingService.bookSeat(seatId, userId, username);
      res.send(booking);
    } catch (err) {
      next(err);
    }
  },
);

app.use(globalErrorHandler);

// Keep-alive: prevents Render free tier from spinning down
if (env.NODE_ENV !== "development" && process.env.RENDER_EXTERNAL_URL) {
  setInterval(async () => {
    try {
      await fetch(process.env.RENDER_EXTERNAL_URL);
    } catch (e) {
      console.warn("Keep-alive ping failed:", e.message);
    }
  }, 10 * 60 * 1000); // every 10 minutes
}

app.listen(env.PORT, () => console.log("Server starting on port: " + env.PORT));
