import path from "path";

export class Paths {
  private paths: {
    root: string;
    src: string;
    build: string;
  };

  constructor() {
    // ensure we get the right root directory, no matter the cwd this is run from
    const root = path.resolve(__dirname, "..");
    this.paths = {
      root,
      src: path.resolve(root, "src"),
      build: path.resolve(root, "build"),
    };
  }

  root(...paths: string[]) {
    return path.resolve(this.paths.root, ...paths);
  }

  src(...paths: string[]) {
    return path.resolve(this.paths.src, ...paths);
  }

  build(...paths: string[]) {
    return path.resolve(this.paths.build, ...paths);
  }
}
