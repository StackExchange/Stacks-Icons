# Icons

## Including Stacks Icons in your project

Stacks Icons are [delivered via NPM](https://www.npmjs.com/package/@stackoverflow/stacks-icons). It can be installed with `npm i @stackoverflow/stacks-icons`

### Manifest

See <https://icons.stackoverflow.design/> for an up-to-date list of all icons and spots.

### Use in JavaScript or TypeScript

Using the library by `import`ing a subpath (e.g. `/icons`) will allow for tree-shaking unused icons from your bundle.

```js
// es6 / module syntax
import { IconAnswerDuotone } from "@stackoverflow/stacks-icons/icons";
import { SpotWave } from "@stackoverflow/stacks-icons/spots";

// both icons and spots are unescaped html strings
// icons default to 24px size
console.log(IconAnswerDuotone); // "<svg>...</svg>"

// require() syntax
const { Icons, Spots } = require("@stackoverflow/stacks-icons");

// `Icons` and `Spots` are objects mapped by <icon name, html string>
console.log(Icons); // { "IconAnswerDuotone": "<svg>...</svg>", ... }
```

### Dynamic Icon Sizing with Utility Classes

Icons default to 24px, but you can dynamically resize them using size utility classes. These classes work with both regular SVG icons and CSS background icons.

**Available size classes:** `s20`, `s24`, `s32`, `s64`

To use size utilities, you must include the core CSS file:

```html
<!-- Required: Import the core CSS for size utility classes -->
<link
    rel="stylesheet"
    href="/path/to/@stackoverflow/stacks-icons/dist/icons.core.css"
/>
```

Then apply size classes to your icons:

```html
<!-- Regular SVG icons with size classes -->
<svg class="svg-icon iconAnswerDuotone s20"></svg>
<svg class="svg-icon iconAnswerDuotone s24"></svg>
<svg class="svg-icon iconAnswerDuotone s32"></svg>
<svg class="svg-icon iconAnswerDuotone s64"></svg>

<!-- Works with CSS background icons too (when combined with icons.backgrounds.css) -->
<span class="svg-icon-bg iconAnswerDuotone s20"></span>
<span class="svg-icon-bg iconAnswerDuotone s32"></span>
```

### Use icons as CSS background images

In certain cases where adding the raw SVG markup to your HTML would cause bloat or if you need your markup to be more portable, consider using the CSS background icons bundle. Note: Not all icons are available in this bundle.

To use CSS background icons, include both CSS files:

```html
<!-- Required for size utilities and base icon styles -->
<link
    rel="stylesheet"
    href="/path/to/@stackoverflow/stacks-icons/dist/icons.core.css"
/>
<!-- Required for CSS background icons -->
<link
    rel="stylesheet"
    href="/path/to/@stackoverflow/stacks-icons/dist/icons.backgrounds.css"
/>
```

Then use the icons:

```html
<!-- add the "svg-icon-bg" class in addition to the desired "iconNAME" class (defaults to 24px) -->
<span class="svg-icon-bg iconAnswerDuotone"></span>

<!-- use size utility classes to change the icon size (see "Dynamic Icon Sizing" section) -->
<span class="svg-icon-bg iconAnswerDuotone s20"></span>
<span class="svg-icon-bg iconAnswerDuotone s32"></span>
<span class="svg-icon-bg iconAnswerDuotone s64"></span>

<!-- the icon's color matches "currentColor", so changing the "color" property changes the icon color -->
<span class="svg-icon-bg iconAnswerDuotone" style="color: red;"></span>

<!-- add the "native" class to get native styles; these do not respect "currentColor" changes -->
<span class="svg-icon-bg iconAnswerDuotone native"></span>
```

For performance / file size reasons, not all icons are available as CSS background icons. You can add support for more by editing the `cssIcons` array in [config.yaml](config.yaml).

### Use in dotnet

Stacks-Icons also provides a NuGet package that targets `net6.0;net8.0`.

See the [dotnet/src/README.md](dotnet/src/README.md) file for more details.

### Using the front-end helper for prototyping

> **Note**
> This method is not intended to be used in production

If you include the `browser.umd.js` within your prototype's `body` element (`<script src="https://unpkg.com/@stackoverflow/stacks-icons/dist/browser.umd.js"></script>`) you can render Stacks Icons in the browser using only the following format:

```html
<svg data-icon="IconAnswerDuotone" class="native"></svg>
<svg data-spot="SpotSearch"></svg>
```

This package looks out for elements that look like `svg[data-icon]`. If the icon doesn’t exist in Stacks, it will throw you an error in console. Anything in the `class=""` attribute will be passed to the included SVG e.g., `native`

## Developing locally

First, you'll need a [Figma personal access token](https://www.figma.com/developers/api#access-tokens). Once you have that, place it in a `.env` file in the root of the repo:

```env
FIGMA_ACCESS_TOKEN="your_access_token_here"
```

Install the necessary dependencies:

```sh
npm i
```

Run the build:

```sh
npm run build
```

Preview the icons

```sh
npm run preview
```

### Developing the dotnet library

You'll need to first run the general package build as outlined above, as the dotnet solution pulls the generated csharp files from the build directory.

You can then build the library locally via:

```sh
npm run build:nuget
```

or run the unit tests with:

```sh
npm run test:nuget
```

### Adding or updating icons/spots

All icons and spots are pulled directly from Figma via their API. The _only_ way to add or update icons is by directly modifying the [source Figma file](https://www.figma.com/file/Z5yoO4WH58QDHvmxwMWhr0) and then publishing a new component release from within Figma.

#### Publishing an icon

In order to expose a new icon to this repository, you'll need to convert it into a component then publish it by following these steps:

1. Open the [source Figma file](https://www.figma.com/file/Z5yoO4WH58QDHvmxwMWhr0)
2. Navigate to the newly added icon. Note the absense of the segmented diamond icon next to the icon name.
3. Right click on the icon to open the context menu and select "Create component"
4. Right click on the icon again to reopen the context menu and select "Main Component > Publish selected components"
5. Within the "Publish libray" modal, select the icon(s) you'd like to publish
6. Click "Publish"

#### Adding a published icon to this library

In order to ensure that any new icons/spots in Figma are pulled into this repo, the definitions will need to be added to `config.yaml`:

```yaml
definitions:
    Icon/IconName:
        Duotone: ""
        Fill: ""
        Outline: ""
```

When adding new entries, please ensure that _all entries are in alphabetical order_ for ease of reference. Icons use the 24px size from Figma by default and support variants (`Duotone`, `Fill`, `Outline`) as defined in the Figma component. The initial hash values can be left empty. Once you run the first build process, it'll throw an error like the following:

> ERROR Hash mismatch on 1 files. Expected hash values:
> "Icon/Answer24Duotone": "AM0aL4NcirBVfs9hgLaJ2/zdQ3iwVc8poVQU/CFlu3g=",

Take these hash values and use them as the values for the previously added entries. Re-run the build process and verify that your new icon is added correctly and has the correct contents. The build system will automatically fetch the 24px variant from Figma and generate icons without the size in their names (e.g., `IconAnswerDuotone` instead of `IconAnswer24Duotone`).

When updating an existing icon, just update the corresponding hash value(s) for the variant(s) that changed.

#### Size Variants

Icons are generated at the default 24px size from Figma. Size utility classes (`s20`, `s24`, `s32`, `s64`) are provided in `icons.core.css` to allow users to dynamically resize icons without generating multiple variants. See the "Dynamic Icon Sizing" section above for usage details.

## Publishing a new release

In order to publish a new release to npm and NuGet, you just need to tag a new release and push it to origin:

```sh
npm version [major|minor|patch]
# for beta releases instead use:
# npm version prerelease --preid beta
git push --follow-tags
```

From there, our GitHub [packages action](.github/workflows/packages.yml) will build the packages and push them to their respective repositories.

Afterwards, make sure you mark a new [GitHub Release](https://github.com/StackExchange/Stacks-Icons/releases/new) based on what has changed.

This project follows [SemVer](https://semver.org/). Versions including breaking changes to the visual api (e.g. icon drastically changes design or is removed) or code api should be marked `major`. Versions including new features (such as a new or updated icon) should be marked `minor`. Everything else is a `patch` release.

# License

© Copyright 2025 Stack Exchange, Inc.

Unless otherwise stated, the contents of this folder are licensed under the [Apache License, Version 2.0](./LICENSE.md)

Unless required by applicable law or agreed to in writing, software distributed under the Apache License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

The Stack Overflow name and logo, and associated brand elements, are the protected property of Stack Exchange, Inc. Acceptable use of Stack Overflow trademarks is governed by: https://policies.stackoverflow.co/company/trademark-guidance/. All other use of Stack Overflow trademarks is prohibited without prior written authorization, including without limitation, any use suggesting unauthorized endorsement by or affiliation with Stack Overflow.
