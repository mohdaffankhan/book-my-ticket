import { env } from "../config/env.js";
import pg from "pg";

// Use SSL for any external database (Supabase, Railway, etc.)
// Skip SSL for local Docker connections
const isLocal =
  env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1");

// Strip sslmode from the connection string so our ssl object takes full control.
// Newer pg versions treat sslmode=require as verify-full, which overrides
// rejectUnauthorized:false and causes SELF_SIGNED_CERT_IN_CHAIN on Supabase.
const connectionString = env.DATABASE_URL
  .replace(/([?&])sslmode=[^&]*/g, "$1")
  .replace(/[?&]$/, "");

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export { pool, query };
