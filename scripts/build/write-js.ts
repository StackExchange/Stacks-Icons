import rollupTypescript from "@rollup/plugin-typescript";
import { promises as fs } from "fs";
import { rollup } from "rollup";
import packageJson from "../../package.json" assert { type: "json" };
import { paths } from "./paths.js";
import { error, OutputType } from "./utils.js";

export function writeJson(iconsObj: Record<string, string>, type: OutputType) {
    // Output the JSON helper
    const jsonFile = paths.build(type.toLowerCase() + "s.json");
    const jsonOutput = JSON.stringify(iconsObj, null, 2);

    return fs.writeFile(jsonFile, jsonOutput, "utf8");
}

export function writeJsModule(
    iconsObj: Record<string, string>,
    type: OutputType
) {
    // Output the js helper
    const modFile = paths.build(type.toLowerCase() + "s.js");

    // output the TypeScript definitions
    const dtsFile = paths.build(type.toLowerCase() + "s.d.ts");

    let jsOutput = "";
    let dtsOutput = "";

    Object.entries(iconsObj).forEach(([name, svg]) => {
        jsOutput += `export const ${type}${name} = "${svg.replace(
            /"/g,
            `\\"`
        )}";\n`;

        dtsOutput += `export const ${type}${name}: string;\n`;
    });

    dtsOutput = `declare module "${
        packageJson.name
    }/${type.toLowerCase()}s" {\n${dtsOutput}\n}`;

    return Promise.all([
        fs.writeFile(modFile, jsOutput, "utf8"),
        fs.writeFile(dtsFile, dtsOutput, "utf8"),
    ]);
}

export async function bundleHelperJsAsync() {
    let bundle;
    const plugin = rollupTypescript({
        include: "**/src/js/*.ts",
    });

    try {
        // create the browser bundle
        bundle = await rollup({
            input: paths.src("js/browser.ts"),
            plugins: [plugin],
        });
        await bundle.write({
            file: paths.build("browser.umd.js"),
            format: "umd",
            name: "StacksIcons",
        });

        // create the require bundle
        bundle = await rollup({
            input: paths.src("js/require.ts"),
            plugins: [plugin],
        });
        await bundle.write({
            file: paths.build("index.umd.cjs"),
            format: "umd",
            name: "StacksIcons",
        });

        // create the es6 bundle
        bundle = await rollup({
            input: paths.src("js/index.ts"),
            plugins: [plugin],
        });
        await bundle.write({
            file: paths.build("index.esm.js"),
            format: "esm",
            name: "StacksIcons",
        });
    } catch (e) {
        // do some error reporting
        error(e);
    }

    if (bundle) {
        // closes the bundle
        await bundle.close();
    }
}
