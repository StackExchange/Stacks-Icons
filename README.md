# Icons

## Including Stacks Icons in your project

Stacks Icons are [delivered via NPM](https://www.npmjs.com/package/@stackoverflow/stacks-icons). It can be installed with `npm i @stackoverflow/stacks-icons`

### Manifest

See <https://icons.stackoverflow.design/> for an up-to-date list of all icons and spots.

### Use in JavaScript or TypeScript

Using the library by `import`ing a subpath (e.g. `/icons`) will allow for tree-shaking unused icons from your bundle.

```js
// es6 / module syntax
import { IconFaceMindBlown } from "@stackoverflow/stacks-icons/icons";
import { SpotWave } from "@stackoverflow/stacks-icons/spots";

// both icons and spots are unescaped html strings
console.log(IconFaceMindBlown); // "<svg>...</svg>"

// require() syntax
const { Icons, Spots } = require("@stackoverflow/stacks-icons");

// `Icons` and `Spots` are objects mapped by <icon name, html string>
console.log(Icons); // { "IconAccessibility": "<svg>...</svg>", ... }
```

### Using the CSS icons

In certain cases where adding the raw svg markup to your html would cause bloat or if you need your markup to be more portable, consider using CSS icons. Note: Not all icons are available as CSS icons.

```html
<!-- include the required css file -->
<link
    rel="stylesheet"
    href="/path/to/@stackoverflow/stacks-icons/dist/icons.css"
/>

<!-- add the "svg-icon-bg" class in addition the desired "iconNAME" class -->
<span class="svg-icon-bg iconBold"></span>

<!-- the icon's color matches the "currentColor", so changing the "color" property will change the icon color -->
<span class="svg-icon-bg iconFire" style="color: red;"></span>

<!-- add the "native" class to get native styles; these do not respect "currentColor" changes -->
<span class="svg-icon-bg iconFaceMindBlown native"></span>
```

For performance / file size reasons, not all icons are available in css. You can add support for more CSS icons my editing the `cssIcons` value in [scripts/definitions.ts](scripts/definitions.ts).

### Use in dotnet

Stacks-Icons also provides a NuGet package that targets `netstandard2.0`.

See the [dotnet/src/README.md](dotnet/src/README.md) file for more details.

### Using the front-end helper for prototyping

> **Note**
> This method is not intended to be used in production

If you include the `browser.umd.js` within your prototype’s `body` element (`<script src="https://unpkg.com/@stackoverflow/stacks-icons/dist/browser.umd.js"></script>`) you can render Stacks Icons in the browser using only the following format:

```html
<svg data-icon="IconFaceMindBlown" class="native"></svg>
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

All icons and spots are pulled directly from Figma via their API. The _only_ way to add or update icons is by directly modifying the [source Figma file](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM) and then publishing a new component release from within Figma.

In order to ensure that any new icons/spots in Figma are pulled into this repo, the definitions will need to be added to `scripts/definitions.ts`:

```ts
const figmaIconDefinitions = {
    // ...
    "Icon/IconName": "",
    // ...
};
```

When adding new entries, please ensure that _all entries are in alphabetical order_ for ease of reference. The initial value is ok to leave empty. Once you run the first build process, it'll throw an error like the following:

> Hash mismatch on 1 files. Expected hash values:
> "Icon/Accessibility": "ksqXzQjdToAghXkIQ75PE/8qRdUho8Wtux1FTo+mgug=",

Take this hash value and use it as the value for the previously added entry. Re-run the build process and verify that your new icon is added correctly and has the correct contents.

When updating an existing icon, just update the hash as explained in the previous section.

## Publishing a new release

In order to publish a new release to npm and NuGet, you just need to tag a new release and push it to origin:

```sh
npm version [major|minor|patch]
# for prerelase candidates instead use:
# npm version prerelease --preid rc
git push --follow-tags
```

From there, our GitHub [packages action](.github/workflows/packages.yml) will build the packages and push them to their respective repositories.

Afterwards, make sure you mark a new [GitHub Release](https://github.com/StackExchange/Stacks-Icons/releases/new) based on what has changed.

This project follows [SemVer](https://semver.org/). Versions including breaking changes to the visual api (e.g. icon drastically changes design or is removed) or code api should be marked `major`. Versions including new features (such as a new or updated icon) should be marked `minor`. Everything else is a `patch` release.
