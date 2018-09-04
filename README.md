# Icons

<img src="https://user-images.githubusercontent.com/1369864/45044111-c3871d00-b034-11e8-82b1-332d0f719cb2.png" width="628" height="853" alt="Icons">

This repo provides authoring tools for Stack Overflow’s shared icon library. Here’s our general workflow:

1. Open the [Sketch document](https://github.com/StackExchange/Stacks-Icons/blob/master/src/Icons.sketch) to modify an existing icon, or add a new one. Pay close attention to the name of the newly-added artboard. This will determine your SVG’s filename.
2. Export each artboard to the `src/export` directory.
3. Open this repo’s directory in Terminal, and type `grunt`. This will spit out optimized SVGs in the `build/lib` directory. Some manifest files are included in `build` as well.

### Installing Grunt

In order to use this repo, you must first install [Node & NPM](https://nodejs.org/en/download/). Then, install [Grunt](https://gruntjs.com/getting-started) globally on your machine. Once both are installed, open this repo’s directory in your Terminal. Once you’re in this repo’s folder, type `npm install`. This will download all the dependencies to a directory called `node_modules`. Now you can type `grunt` into the Terminal and it’ll generate all the optimized SVGs and manifests in `build` that you exported to `src/export`. 😎
