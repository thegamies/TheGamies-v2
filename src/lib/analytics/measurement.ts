/** Site GA4 measurement id. Public (appears in page source). Not a secret. */
export const GA_MEASUREMENT_ID = "G-MFFRTT6HFF";

const ID_PATTERN = /^G-[A-Z0-9]+$/i;

/**
 * GA4 measurement id. `NEXT_PUBLIC_GA_MEASUREMENT_ID=off` disables.
 * Unset or blank uses the site property. A set value must be `G-…`.
 *
 * Default (no `env`) reads `process.env.NEXT_PUBLIC_*` as a static path so Next
 * can inline it at build. Passing `process.env` as an object does not.
 */
export function getGaMeasurementId(
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const raw = env
    ? env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    : process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (raw === undefined || raw.trim() === "") return GA_MEASUREMENT_ID;
  const id = raw.trim();
  if (id === "off" || id === "0") return undefined;
  if (!ID_PATTERN.test(id)) return undefined;
  return id;
}
