import { spawn } from "node:child_process";

const processes = [
  spawn("node", ["scripts/local-jobs-api.mjs"], { stdio: "inherit" }),
  spawn("vite", [], { stdio: "inherit", shell: true }),
];

function shutdown(signal) {
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
  process.exit(143);
});

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown("SIGTERM");
      process.exit(code);
    }
  });
}
