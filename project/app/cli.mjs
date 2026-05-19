import { spawnSync } from "node:child_process";
import path from "node:path";
import { rootDir } from "./config.mjs";

const [command = "run", ...args] = process.argv.slice(2);

function getPythonCmd() {
  const isWin = process.platform === "win32";
  if (isWin) {
    if (spawnSync("py", ["-3", "--version"]).status === 0) return { cmd: "py", args: ["-3"] };
  }
  if (spawnSync("python3", ["--version"]).status === 0) return { cmd: "python3", args: [] };
  if (spawnSync("python", ["--version"]).status === 0) return { cmd: "python", args: [] };
  return { cmd: "python", args: [] };
}

if (command === "clean" || command === "run") {
  const py = getPythonCmd();
  const pyArgs = [...py.args, path.join(rootDir, "app", "python", "smart_retail_pipeline.py"), command, ...args];
  const result = spawnSync(py.cmd, pyArgs, { stdio: "inherit", cwd: rootDir });
  if (result.error) {
    console.error(`Failed to start python pipeline: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status || 0);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    out[key] = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
  }
  return out;
}
