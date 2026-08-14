import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const site = readFileSync(
    new URL("../src/index.html", import.meta.url),
    "utf8"
);

assert.match(site, /<title>Stacks Icons V6 manifest<\/title>/);
assert.match(site, /https:\/\/icons\.stackoverflow\.design\//);
assert.match(site, /aria-current="page"[^>]*>V6</);
