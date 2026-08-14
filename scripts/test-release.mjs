import assert from "node:assert/strict";
import { getNpmTag } from "./release-policy.mjs";

assert.equal(
    getNpmTag({ refType: "tag", refName: "v6.9.1", version: "6.9.1" }),
    "v6"
);
assert.equal(
    getNpmTag({
        refType: "tag",
        refName: "v6.10.0-rc.0",
        version: "6.10.0-rc.0",
    }),
    "rc"
);

for (const release of [
    { refType: "branch", refName: "v6", version: "6.9.1" },
    { refType: "tag", refName: "v6.9.0", version: "6.9.1" },
    { refType: "tag", refName: "v7.0.0", version: "7.0.0" },
    { refType: "tag", refName: "v6.10.0-beta.1", version: "6.10.0-beta.1" },
]) {
    assert.throws(() => getNpmTag(release));
}
