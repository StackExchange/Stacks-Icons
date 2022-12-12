import { promisify } from "util";
import { exec } from "child_process";
import { error, success } from "./utils.js";
import packageJson from "../package.json" assert { type: "json" };
import { readFile, writeFile } from "fs/promises";

const execAsync = promisify(exec);

(async () => {
  const version = packageJson.version;
  const path = "csharp/src/StackExchange.StacksIcons.csproj";

  var file = await readFile(path, "utf-8");

  file = file.replace(
    /<Version>([\d.]+?)<\/Version>/,
    `<Version>${version}</Version>`
  );

  await writeFile(path, file, "utf-8");

  await execAsync("git add " + path);

  success(`Wrote version ${version} to csproj and staged the changes`);
})().catch((e) => {
  error(e);
  process.exit(1);
});
