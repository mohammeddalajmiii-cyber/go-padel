// Setup problems (missing Vercel settings, database can't be reached) explained
// in plain words, so the error page can say exactly what to fix.

export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupError";
  }
}

const WHERE = "Vercel → your project → Settings → Environment Variables";

/**
 * The database connection string. Vercel's Neon integration may name it
 * DATABASE_URL, POSTGRES_URL, or add a custom prefix (e.g. STORAGE_DATABASE_URL),
 * so all of these are accepted. Unpooled versions are used only as a last resort.
 */
export function databaseUrl(): string | undefined {
  const env = process.env;
  const direct = env.DATABASE_URL || env.POSTGRES_URL;
  if (direct) return direct;
  const keys = Object.keys(env).sort();
  const pooled = keys.find((k) => /_(DATABASE|POSTGRES)_URL$/.test(k) && env[k]);
  if (pooled) return env[pooled];
  const any = keys.find((k) => /(DATABASE|POSTGRES)_URL/.test(k) && env[k]);
  return any ? env[any] : undefined;
}

/** Which kind of Vercel deployment this is (production / preview / development). */
export const deploymentKind = () => process.env.VERCEL_ENV ?? "local";

export const missingDatabaseUrl = () =>
  new SetupError(
    `DATABASE_URL isn't set for this ${deploymentKind()} deployment. In ${WHERE}, check it exists and that "Production" is ticked for it, then redeploy.`,
  );

export const missingAdminPassword = () =>
  new SetupError(`ADMIN_PASSWORD isn't set for this ${deploymentKind()} deployment. Add it in ${WHERE} with "Production" ticked, then redeploy.`);

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
