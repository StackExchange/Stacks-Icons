import path from "path";
import { fileURLToPath } from "url";

export class Paths {
  private paths: {
    build: string;
    preview: string;
    root: string;
    src: string;
  };

  constructor() {
    // ensure we get the right root directory, no matter the cwd this is run from
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );
    this.paths = {
      build: path.resolve(root, "build"),
      preview: path.resolve(root, "preview"),
      root,
      src: path.resolve(root, "src"),
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
