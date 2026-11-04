import { query } from "@/lib/db";
import { explainDbError } from "@/lib/setup";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/setup-check → lists anything missing in the Vercel/Neon setup.
// Says only which setting is missing or wrong, never any values.
export async function GET() {
  const problems: string[] = [];
  try {
    await query("SELECT 1 FROM settings WHERE id = 1");
  } catch (err) {
    const setup = explainDbError(err);
    problems.push(setup ? setup.message : "The database answered with an error. Check the Vercel function logs for details.");
    if (!setup) console.error(err);
  }
  if (!process.env.ADMIN_PASSWORD) problems.push("ADMIN_PASSWORD isn't set, so nobody can sign in to the front desk.");
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16)
    problems.push("SESSION_SECRET is missing or shorter than 16 characters, so front desk sign-in won't work.");
  return json({ ok: problems.length === 0, problems });
}
