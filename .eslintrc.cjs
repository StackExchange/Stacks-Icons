module.exports = {
    root: true,
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
    },
    extends: ["@stackoverflow"],
    ignorePatterns: [
        "node_modules",
        ".eslintrc.cjs",
        "dist/**/*",
        "dotnet/**/*",
    ],
    rules: {
        "no-process-env": 0,
        "no-process-exit": 0,
        "no-console": 0,
        "sort-keys": 2,
    },
};
