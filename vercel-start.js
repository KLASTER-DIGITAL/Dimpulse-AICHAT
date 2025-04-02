#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apiProcess = spawn("tsx", [join(__dirname, "server/api/index.ts")], {
  stdio: "inherit",
});

apiProcess.on("close", (code) => {
  console.log(`API server exited with code ${code}`);
});

