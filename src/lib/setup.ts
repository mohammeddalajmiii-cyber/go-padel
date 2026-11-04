// Setup problems (missing Vercel settings, database can't be reached) explained
// in plain words, so the error page can say exactly what to fix.

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

const WHERE = "Vercel → your project → Settings → Environment Variables";

export const missingDatabaseUrl = () =>
  new SetupError(`DATABASE_URL isn't set. Add the Neon connection string in ${WHERE}, then redeploy.`);

export const missingAdminPassword = () =>
  new SetupError(`ADMIN_PASSWORD isn't set. Add it in ${WHERE}, then redeploy.`);

export const badSessionSecret = () =>
  new SetupError(`SESSION_SECRET is missing or shorter than 16 characters. Add a long random text in ${WHERE}, then redeploy.`);

/** Turns a database connection error into a clear explanation. Returns null for ordinary query errors. */
export function explainDbError(err: unknown): SetupError | null {
  if (err instanceof SetupError) return err;
  const e = err as { code?: string; message?: string };
  const code = e?.code ?? "";
  const msg = String(e?.message ?? "");
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code))
    return new SetupError("Can't find the database server. The host in DATABASE_URL looks wrong: copy the connection string from Neon again.");
  if (["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(code) || /timeout/i.test(msg))
    return new SetupError("The database didn't answer. Check that the Neon project is active and DATABASE_URL is the pooled connection string.");
  if (code === "28P01" || /password authentication/i.test(msg))
    return new SetupError("The database rejected the username or password in DATABASE_URL. Copy the connection string from Neon again (Connect → show password).");
  if (code === "3D000")
    return new SetupError("The database named in DATABASE_URL doesn't exist. Copy the connection string from Neon again.");
  if (/invalid url|invalid connection string|getaddrinfo/i.test(msg))
    return new SetupError("DATABASE_URL isn't a valid connection string. It should start with postgresql:// — copy it from Neon again.");
  return null;
}
