# Icons

## Introduction

This repo provides authoring tools for building Stack Overflow’s [shared icon library](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM/Icons?node-id=0%3A1). Here’s our general workflow:

1. Get a [Figma personal access token](https://www.figma.com/developers/api#access-tokens).
2. Open this repo’s directory in Terminal, and type ` FIGMA_ACCESS_TOKEN=<TOKEN> npm start`.

This will download any components from the Figma file as SVGs and build optimized SVGs ([using SVGO](./src/svgo-congig.ts)) in the `build/lib` directory. Some manifest files are included in `build` as well.

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

- the name of the icon as a string (e.g. `"Bold"`)
- an object with the following properties:
  - `name` - the name of the icon (e.g. `"Bold"`)
  - `css` - arbitrary css to add to the icon class (e.g. `"width: 14px; height: 14px;"` )

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

### Developing locally

First, you'll need a [Figma personal access token](https://www.figma.com/developers/api#access-tokens). Once you have that, place it in a `.env` file in the root of the repo:

```env
FIGMA_ACCESS_TOKEN="your_access_token_here"
```

Run the build locally via:

```sh
npm run build
```

In order to run the dotnet package's tests locally, you'll need to have first run the general build script above, as the dotnet solution pulls the generated csharp files from the build directory.

### Adding/updating icons/spots from Figma

In order to ensure that any new icons/spots in Figma are pulled into this repo, the definitions will need to be added to `src/definitions.ts`:

```ts
const figmaIconDefinitions = {
  // ...
  "Icon/IconName": "",
  // ...
};
```

When adding new entries, please ensure that all entries are in alphabetical order for ease of reference. The initial value is ok to leave empty. Once you run the first build process, it'll throw an error like the following:

> Hash mismatch on 1 files. Expected hash values:
> "Icon/Accessibility": "ksqXzQjdToAghXkIQ75PE/8qRdUho8Wtux1FTo+mgug=",

Take this hash value and use it as the value for the previously added entry. Re-run the build process and verify that your new icon is added correctly and has the correct contents.

When updating an existing icon, just update the hash as explained in the previous section.

## Manifest

See <https://icons.stackoverflow.design/> for an up-to-date list of all icons and spots.

## Use in dotnet

Stacks-Icons also provides a NuGet package that targets `netstandard2.0`.

```sh
dotnet add package StackExchange.StacksIcons
```

This package provides an SVG helper for use in Razor and other contexts:

```cshtml
@using StackExchange.StacksIcons

<div>
  // icons and spots return an `HtmlString` for safe use in Razor
  @Svg.Accessibility
  @Svg.Spot.Wave

  // the `With` method can take css classes and title text to add to the svg
  @Svg.AlertCircle.With(cssClass: "fc-danger", title: "foo")
</div>
```

Enum definitions and lookup dictionaries for all icons/spots are also provided:

```cs
using StackExchange.StacksIcons;

StacksIcon iconName = StacksIcon.Accessibility;
HtmlString icon = Svg.Lookup[iconName]; // icon is now set to the value in Svg.Accessibility

StacksSpot spotName = StacksSpot.Wave;
HtmlString spot = Svg.Spot.Lookup[spotName]; // spot is now set to the value in Svg.Spot.Wave
```
