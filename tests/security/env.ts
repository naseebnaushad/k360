/** Settings for the security integration tests, read from .env.local and the shell. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see .env.example).`);
  return value;
}

export const testEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  publishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  rootDomain: required("NEXT_PUBLIC_ROOT_DOMAIN"),
  /** Where the app is running. Point at a preview or production URL to test a deployment. */
  appUrl: process.env.SECURITY_TEST_APP_URL ?? "http://localhost:3000",
  /** Set when appUrl serves a production build, enabling production-only checks. */
  production: process.env.SECURITY_TEST_PRODUCTION === "1",
  /** A live city that has places, used for positive checks. */
  citySlug: process.env.SECURITY_TEST_CITY ?? "kochi",
};
