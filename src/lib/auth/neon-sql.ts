/** Tagged-template SQL helper shape used by Auth directory helpers. */
export type NeonSql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>;
