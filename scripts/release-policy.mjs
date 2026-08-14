import assert from "node:assert/strict";

/**
 * @param {{ refType: string | undefined, refName: string | undefined, version: string }} release
 */
export function getNpmTag({ refType, refName, version }) {
    assert.equal(refType, "tag", "V6 releases must run from a Git tag");
    assert.equal(
        refName,
        `v${version}`,
        "The Git tag must match the package version"
    );

    const match = version.match(/^6\.\d+\.\d+(?:-(rc)\.\d+)?$/);
    assert.ok(
        match,
        "V6 releases must use a stable 6.x version or an rc prerelease"
    );

    return match[1] === "rc" ? "rc" : "v6";
}
