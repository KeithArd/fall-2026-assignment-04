import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { encode } from "node:querystring";

const inputPath = process.argv[2];
const outputPath = "docs/architecture/erd.svg";

// guard checks
if (!inputPath) {
  console.log(
    "SYNTAX_ERROR: no input file, usage: node reder_erd.js <file.mmd>",
  );
  process.exit(1);
}

if (!existsSync(inputPath)) {
  console.log("SYNTAX_ERROR: input file not found");
  process.exit(1);
}

const result = spawnSync("npx", ["mmdc", "-i", inputPath, "-o", outputPath], {
  encoding: "utf8",
});

// if exit code is 0, print SUCCESS
if (result.status === 0) {
  console.log("SUCCESS");
  process.exit(0);
}

const errorText = result.error ? result.error.message : result.stderr;
console.log(`SYNTAX_ERROR: ${errorText}`);
process.exit(1);
