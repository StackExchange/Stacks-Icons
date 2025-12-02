import path from "path";
import { fileURLToPath } from "url";

class Paths {
    private paths: {
        build: string;
        preview: string;
        src: string;
        raw: string;
    };

    constructor() {
        // ensure we get the right root directory, no matter the cwd this is run from
        const codeRoot = path.resolve(
            path.dirname(fileURLToPath(import.meta.url)),
            "../.."
        );

        this.paths = {
            build: path.resolve(
                process.cwd(),
                process.env["ASSET_OUTPUT_DIR"] || "dist"
            ),
            preview: path.resolve(process.cwd(), "preview"),
            src: path.resolve(codeRoot, "src"),
        };
    }

    build(...paths: string[]) {
        return path.resolve(this.paths.build, ...paths);
    }

    preview(...paths: string[]) {
        return path.resolve(this.paths.preview, ...paths);
    }

    src(...paths: string[]) {
        return path.resolve(this.paths.src, ...paths);
    }
}

export const paths = new Paths();
