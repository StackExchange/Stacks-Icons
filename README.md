# Icons

<img src="https://user-images.githubusercontent.com/1369864/45044111-c3871d00-b034-11e8-82b1-332d0f719cb2.png" width="628" height="853" alt="Icons">

### Introduction

This repo provides authoring tools for Stack Overflow’s shared icon library. Here’s our general workflow:

1. Open the [Figma document](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM/Icons?node-id=0%3A1) to modify an existing icon, or add a new one. Pay close attention to the name of the newly-added artboard. This will determine your SVG’s filename.
2. Export each artboard / component to the `src` directory. Since the artboards are prefixed with `Icon`, the final output directory will be `src/Icon`.
3. Open this repo’s directory in Terminal, and type `npm start`. This will churn through the exported SVGs and spit out optimized SVGs in the `build/lib` directory. Some manifest files are included in `build` as well.

### Installing Dependencies

In order to use this repo, you must first install [Node & NPM](https://nodejs.org/en/download/). Then, open this repo’s directory in your Terminal. Once you’re in this repo’s folder, type `npm install`. This will download all the dependencies.
