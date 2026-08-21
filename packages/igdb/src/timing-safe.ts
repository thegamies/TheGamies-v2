/** Constant-time string equality for secret compares (UTF-8 bytes). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const len = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;

  for (let i = 0; i < len; i++) {
    const x = i < left.length ? left[i]! : 0;
    const y = i < right.length ? right[i]! : 0;
    mismatch |= x ^ y;
  }

  return mismatch === 0;
}

/** Constant-time check that `value` starts with `prefix` (UTF-8 bytes). */
export function timingSafeStartsWith(value: string, prefix: string): boolean {
  if (prefix.length > value.length) {
    timingSafeEqualString(prefix, prefix);
    return false;
  }
  return timingSafeEqualString(value.slice(0, prefix.length), prefix);
}
