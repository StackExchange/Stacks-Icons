# Icons

<img width="659" alt="Icons" src="https://user-images.githubusercontent.com/1369864/57243772-84aeca00-6ffc-11e9-96d8-208315e070e8.png">


## Introduction

This repo provides authoring tools for building Stack Overflow’s shared icon library. Here’s our general workflow:

1. Open the [Figma document](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM/Icons?node-id=0%3A1) to modify an existing icon, or add a new one. Pay close attention to the name of the newly-added artboard. This will determine your SVG’s filename.
2. Export each artboard / component to the `src` directory. Since the artboards are prefixed with `Icon`, the final output directory will be `src/Icon`.
3. Open this repo’s directory in Terminal, and type `npm start`. This will churn through the exported SVGs and build optimized SVGs in the `build/lib` directory. Some manifest files are included in `build` as well.

## Installing dependencies

In order to use this repo, you must first install [Node & NPM](https://nodejs.org/en/download/). Then, open this repo’s directory in your Terminal. Once you’re in this repo’s folder, type `npm install`. This will download all the dependencies.

## Including Stacks Icons in your project

Stacks Icons are [delivered via NPM](https://www.npmjs.com/package/@stackoverflow/stacks-icons). It can be installed with `npm i @stackoverflow/stacks-icons`

## Using the CSS icons

In certain cases where adding the raw svg markup to your html would cause bloat or if you need your markup to be more portable, consider using CSS icons. Note: Not all icons are available as CSS icons.

```html
<!-- include the required css file -->
<link rel="stylesheet" href="/path/to/cssIcons.css" />

<!-- add the "svg-icon-bg" class in addition the desired "iconNAME" class -->
<span class="svg-icon-bg iconBold"></span>

<!-- the icon's color matches the "currentColor", so changing the "color" property will change the icon color -->
<span class="svg-icon-bg iconFire" style="color: red;"></span>

<!-- add the "native" class to get native styles; these do not respect "currentColor" changes -->
<span class="svg-icon-bg iconFaceMindBlown native"></span>
```

You can add support for more CSS icons my editing the `src/cssIcons.json` file. Supported formats:
* the name of the icon as a string (e.g. `"Bold"`)
* an object with the following properties:
  * `name` - the name of the icon (e.g. `"Bold"`)
  * `css` - arbitrary css to add to the icon class (e.g. `"width: 14px; height: 14px;"` )

## Using the front-end helper for prototyping

**Note: This is not intended to be used in production.**

If you include the `index.js` within your prototype’s `body` element (`<script src="https://unpkg.com/@stackoverflow/stacks-icons"></script>`) you can render Stacks Icons in the browser using only the following format:

```html
<svg data-icon="FaceMindBlown" class="native"></svg>
<svg data-spot="Search"></svg>
```

This package looks out for elements that look like `svg[data-icon]`. If the icon doesn’t exist in Stacks, it will throw you an error in console. Anything in the `class=""` attribute will be passed to the included SVG e.g., `native`

### Regex for replacing with `@Svg` helper

This might be useful if you want to convert a large prototype to use the Razor helper.

Find

```
<svg data-icon="(.+?)" class="(.+?)"></svg>
```

Replace

```
@Svg.$1.With("$2")
```

## Use as a JavaScript module

```
import Icons from "stacks-icons";

console.log(Icons.FaceMindBlown);

// Returns <svg>...</svg>
```