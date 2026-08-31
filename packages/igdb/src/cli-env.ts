export function requireDopplerCli(
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  const config = env.DOPPLER_CONFIG?.trim();
  if (!config) {
    throw new Error(
      "IGDB CLI must run under Doppler so it uses the intended database. Use pnpm sync:igdb …",
    );
  }
  return config;
}
