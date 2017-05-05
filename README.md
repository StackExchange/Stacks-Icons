# Icons
This repo provides authoring tools for Stack Overflow’s shared icon library. Here’s our general workflow:

1. Open the [Sketch document](https://gh.stackoverflow.com/Design/Icons/blob/master/icons.sketch) to modify an existing icon, or add a new one. Pay close attention to the name of the newly-added artboard. This will determine your SVG’s filename.
2. Export each artboard to the `src` directory.
3. Open this repo’s directory in Terminal, and type `grunt`. This will spit out optimized SVGs in the `build` directory.
4. Commit those optimized SVGs from `build` to [Core/StackOverflow](https://gh.stackoverflow.com/Core/StackOverflow) and [Design/Stacks](https://gh.stackoverflow.com/Design/stacks-ui)

### Grunt

In order to use this repo, you must [install grunt](https://gruntjs.com/getting-started) globally on your machine. Once that’s installed, open this repo’s directory in your Terminal. Then, you’ll wanna install Grunt locally in this directory. Type `npm install grunt --save-dev`. This will download all the dependencies to `node_modules`. Now, if you've made changes to the `src` directory, you can type `grunt` into the Terminal and it’ll generate all the optimized SVGs. 😎
