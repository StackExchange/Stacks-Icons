# Icons

<img width="1095" alt="Icons" src="https://user-images.githubusercontent.com/1369864/57243245-41079080-6ffb-11e9-860e-f2b5a555088c.png">

### Introduction

This repo provides authoring tools for building Stack Overflow’s shared icon library. Here’s our general workflow:

1. Open the [Figma document](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM/Icons?node-id=0%3A1) to modify an existing icon, or add a new one. Pay close attention to the name of the newly-added artboard. This will determine your SVG’s filename.
2. Export each artboard / component to the `src` directory. Since the artboards are prefixed with `Icon`, the final output directory will be `src/Icon`.
3. Open this repo’s directory in Terminal, and type `npm start`. This will churn through the exported SVGs and build optimized SVGs in the `build/lib` directory. Some manifest files are included in `build` as well.

### Installing dependencies

In order to use this repo, you must first install [Node & NPM](https://nodejs.org/en/download/). Then, open this repo’s directory in your Terminal. Once you’re in this repo’s folder, type `npm install`. This will download all the dependencies.

### Including Stacks Icons in your project

Stacks Icons are [delivered via NPM](https://www.npmjs.com/package/@stackoverflow/stacks-icons). It can be installed with `npm i @stackoverflow/stacks-icons`