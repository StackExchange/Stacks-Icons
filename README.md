# Icons

## Including Stacks Icons in your project

Stacks Icons V6 is the maintenance line for Stacks Classic V2 consumers. Install it with `npm i @stackoverflow/stacks-icons@^6`.

### Manifest

See <https://v6.icons.stackoverflow.design/> for the maintained V6 icons and spots. Current V7 documentation is available at <https://icons.stackoverflow.design/>.

### Maintenance policy

- `v6` is the integration and release branch for V6 fixes.
- V6 npm releases use the `v6` dist-tag and must never replace V7 on `latest`.
- V6 release candidates use the `rc` dist-tag.
- `StackExchange.StacksIcons` is published to NuGet.org.
- The renamed `StackExchange.StacksIcons.Legacy` compatibility package is published only to the internal Cloudsmith feed.
- V7 `main` does not build or publish the Legacy package.

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

Stacks Icons V6 also provides NuGet packages targeting `net6.0` and `net8.0`.

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

#### Publishing an icon

In order to expose a new icon to this repository, you'll need to convert it into a component then publish it by following these steps:

1. Open the [source Figma file](https://www.figma.com/file/NxAqQAi9i5XsrZSm1WYj6tsM)
2. Navigate to the newly added icon. Note the absense of the segmented diamond icon next to the icon name.
3. Right click on the icon to open the context menu and select "Create component"
4. Right click on the icon again to reopen the context menu and select "Main Component > Publish selected components"
5. Within the "Publish libray" modal, select the icon(s) you'd like to publish
6. Click "Publish"

#### Adding a published icon to this library

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

Prepare V6 releases on the `v6` branch. The package version must remain on major version 6 and match the Git tag exactly.

```sh
npm version [minor|patch]
# for prerelease candidates instead use:
# npm version prerelease --preid rc
git push --follow-tags
```

The GitHub [packages action](.github/workflows/packages.yml) validates the tag and V6 release policy before publishing. Stable V6 packages use the npm `v6` dist-tag; release candidates use `rc`. The normal NuGet package is published to NuGet.org, while the renamed Legacy package is published only to Cloudsmith.

For a partial-release recovery, run the workflow from the immutable release tag and select `skipNpmPublish`. Never ignore an arbitrary npm failure or recreate an existing package version.

Afterwards, make sure you mark a new [GitHub Release](https://github.com/StackExchange/Stacks-Icons/releases/new) based on what has changed.

This project follows [SemVer](https://semver.org/). Versions including breaking changes to the visual api (e.g. icon drastically changes design or is removed) or code api should be marked `major`. Versions including new features (such as a new or updated icon) should be marked `minor`. Everything else is a `patch` release.
