export function getGaMeasurementId(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | undefined {
  const id = env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}
