#!/usr/bin/env node
/**
 * Run the IGDB CLI with Doppler unless this process is already inside
 * `doppler run` (so `doppler run --config dev_personal -- pnpm sync:igdb …`
 * is not overwritten by doppler.yaml's `dev`).
 */
import { spawn } from "node:child_process";

const passthrough = process.argv.slice(2);
const pnpmArgs = [
  "--filter",
  "@thegamies/igdb",
  "exec",
  "tsx",
  "src/cli.ts",
  ...passthrough,
];

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

if (process.env.DOPPLER_CONFIG) {
  run("pnpm", pnpmArgs);
} else {
  run("doppler", ["run", "--", "pnpm", ...pnpmArgs]);
}
