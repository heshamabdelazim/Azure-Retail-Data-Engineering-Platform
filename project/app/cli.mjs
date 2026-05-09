import { cleanOutputs, runPipeline } from "./pipeline.mjs";

const [command = "run", ...args] = process.argv.slice(2);
if (command === "clean") {
  cleanOutputs();
  console.log("Generated outputs were cleaned.");
} else if (command === "run") {
  const options = parseArgs(args);
  await runPipeline(options, (line) => console.log(line));
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
