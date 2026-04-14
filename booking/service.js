import { pool } from "../db/index.js";
import ApiError from "../utils/api-error.js";

class BookingService {
  async bookSeat(seatId, userId, username) {
    const conn = await pool.connect();
    try {
      await conn.query("BEGIN");

      // Lock the row — prevents race conditions on concurrent bookings
      const result = await conn.query(
        "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE",
        [seatId],
      );

      if (result.rowCount === 0) {
        await conn.query("ROLLBACK");
        throw ApiError.conflict("Seat is already booked");
      }

      // Mark seat as booked and store who booked it
      await conn.query(
        "UPDATE seats SET isbooked = 1, name = $2 WHERE id = $1",
        [seatId, username],
      );

      // Record the booking against the logged-in user
      const bookingResult = await conn.query(
        "INSERT INTO bookings (user_id, seat_id) VALUES ($1, $2) RETURNING *",
        [userId, seatId],
      );

      await conn.query("COMMIT");
      return bookingResult.rows[0];
    } catch (error) {
      await conn.query("ROLLBACK");
      if (error instanceof ApiError) throw error;
      throw ApiError.internalServerError(error.message || "Booking failed");
    } finally {
      conn.release();
    }
  }
}

export default new BookingService();
