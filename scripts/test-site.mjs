import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const site = readFileSync(
    new URL("../src/index.html", import.meta.url),
    "utf8"
);
const redirects = readFileSync(
    new URL("../netlify.toml", import.meta.url),
    "utf8"
);

assert.doesNotMatch(
    site,
    /\bBeta\b/,
    "The stable V7 site must not be labeled beta"
);
assert.match(site, /aria-current="page"[^>]*>V7</);
assert.match(site, /https:\/\/v6\.icons\.stackoverflow\.design\//);

/**
 * @param {string} source
 * @param {string} destination
 */
function assertRedirect(source, destination) {
    const rule = `[[redirects]]
from = "https://${source}/*"
to = "https://${destination}/:splat"
status = 301
force = true`;

    assert.ok(
        redirects.includes(rule),
        `${source} must permanently redirect to ${destination}`
    );
}

assertRedirect("logos.stackoverflow.design", "icons.stackoverflow.design");
assertRedirect(
    "v2.icons.stackoverflow.design",
    "v6.icons.stackoverflow.design"
);
