import Database from "better-sqlite3";

const DB_PATH = process.env.E2E_SQLITE_PATH || "/tmp/test_groceror_e2e.db";

/**
 * Reads the OTP the backend generated for `phone` straight out of the
 * e2e SQLite DB (see groceror/scripts/run_e2e_server.py) — mirrors what
 * the backend's own get_test_otp() does for pytest, since the real
 * /user/otp endpoint was removed for security.
 */
export function getOtp(phone: string): string {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare(
        "SELECT otp FROM phoneverification WHERE phone = ? ORDER BY updated_at DESC LIMIT 1",
      )
      .get(phone) as { otp: string | null } | undefined;
    if (!row?.otp) {
      throw new Error(`No OTP found for phone ${phone}`);
    }
    return row.otp;
  } finally {
    db.close();
  }
}
