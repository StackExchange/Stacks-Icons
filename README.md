# Icons

## Including Stacks Icons in your project

Stacks Icons are [delivered via NPM](https://www.npmjs.com/package/@stackoverflow/stacks-icons). It can be installed with `npm i @stackoverflow/stacks-icons`

### Manifest

See <https://icons.stackoverflow.design/> for an up-to-date list of all icons and spots.

### Use in JavaScript or TypeScript

Using the library by `import`ing a subpath (e.g. `/icons`) will allow for tree-shaking unused icons from your bundle.

```js
// es6 / module syntax
import { IconAnswer } from "@stackoverflow/stacks-icons/icons";
import { SpotWave } from "@stackoverflow/stacks-icons/spots";

// both icons and spots are unescaped html strings
console.log(IconAnswer); // "<svg>...</svg>"

// require() syntax
const { Icons, Spots } = require("@stackoverflow/stacks-icons");

// `Icons` and `Spots` are objects mapped by <icon name, html string>
console.log(Icons); // { "IconAnswer": "<svg>...</svg>", ... }
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
<span class="svg-icon-bg iconAnswer"></span>

<!-- the icon's color matches the "currentColor", so changing the "color" property will change the icon color -->
<span class="svg-icon-bg iconAnswer" style="color: red;"></span>

<!-- add the "native" class to get native styles; these do not respect "currentColor" changes -->
<span class="svg-icon-bg iconAnswer native"></span>
```

For performance / file size reasons, not all icons are available in css. You can add support for more CSS icons my editing the `cssIcons` value in [config.yaml](config.yaml).

### Using CSS animations

SVGs can include custom CSS animations. Named layers in Figma will be passed to the final file, converted from IDs to classes, and prefixed with the icon name to reduce collisions in production.

To add a new animation for an icon:

1. Create a CSS file in `src/animations/[IconName].css`
2. At build time, the SVG and CSS will be compiled into one minified file
3. Use the Figma layer names (which become classes) to target elements for animation

```css
/* Example: src/animations/IconSpin.css */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning-layer {
  animation: spin 1s linear infinite;
}
```

### Use in dotnet

Stacks-Icons also provides a NuGet package that targets `net6.0;net8.0`.

See the [dotnet/src/README.md](dotnet/src/README.md) file for more details.

### Using the front-end helper for prototyping

> **Note**
> This method is not intended to be used in production

If you include the `browser.umd.js` within your prototype’s `body` element (`<script src="https://unpkg.com/@stackoverflow/stacks-icons/dist/browser.umd.js"></script>`) you can render Stacks Icons in the browser using only the following format:

```html
<svg data-icon="IconAnswer" class="native"></svg>
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

### Sorting the config.yaml

To maintain readability you can format and sort the config yaml by using the command.

```sh
brew install yq # if you haven't already installed it
npm run format:config
```

### Customizing color mappings

The build process now supports mapping specific colors to CSS variables via the `fills` section in `config.yaml`. This allows for better theming and customization of icons:

```yaml
fills:
  "#FF0000": "var(--theme-primary-color)"
  "#00FF00": "var(--theme-secondary-color)"
```

Colors defined in the `fills` mapping will be automatically replaced during the build process using SVGO's plugin architecture, providing more reliable optimization than string replacement.

#### Publishing an icon

In order to expose a new icon to this repository, you'll need to convert it into a component then publish it by following these steps:

1. Open the [source Figma file](https://www.figma.com/file/Z5yoO4WH58QDHvmxwMWhr0)
2. Navigate to the newly added icon. Note the absense of the segmented diamond icon next to the icon name.
3. Right click on the icon to open the context menu and select "Create component"
4. Right click on the icon again to reopen the context menu and select "Main Component > Publish selected components"
5. Within the "Publish libray" modal, select the icon(s) you'd like to publish
6. Click "Publish"

#### Adding a published icon to this library

In order to ensure that any new icons/spots in Figma are pulled into this repo, the definitions will need to be added to `config.yaml`. The structure uses Figma component properties as keys with their corresponding hash values:

```yaml
definitions:
    Icon/IconName:
        Size=Default, Stack=False, Style=Default: ""
        Size=Default, Stack=False, Style=Fill: ""
        Size=Default, Stack=True, Style=Default: ""
        Size=Default, Stack=True, Style=Fill: ""
```

Icons can have various property combinations depending on their Figma component definition. Common properties include:

- `Size=Default` (standard property for most icons)
- `Stack=True|False` (whether the icon has a stacked variant)
- `Style=Default|Fill` (visual style variant)
- `Direction=Up|Down|Left|Right|UpLeft|UpRight|DownLeft|DownRight` (for directional icons like Arrow, Chevron, Vote, Trend)
- `Box=True|False` (for boxed variants, e.g., some Arrow icons)
- `Type=Default|Comment|Document|Dashboard|Review` (for icons with type variants like Compose, Mod)
- `Off=True|False` (for toggle states, e.g., Flag, Notification)
- `Open=True|False` (for open/closed states, e.g., Mail)
- `Service=CCPA|Facebook|GitHub|Google|Instagram|LinkedIn|Threads|X|YouTube` (for service-specific icons)

**Important:** When adding new entries, ensure that:

1. The property order matches Figma's component definition (usually Size, then Boolean properties, then Style)
2. All entries are in alphabetical order for ease of reference
3. The initial hash values can be left empty (`""`)

#### Syncing config with Figma

To make adding new icons easier, you can use the sync script to programmatically update the `config.yaml` hashes:

```sh
npm run sync:figma
```

This script will automatically fetch the latest components from Figma and update the hash values in `config.yaml`. Hashes will only update if the icon is already defined.

#### Manually updating hashes

Once you run the first build process, it'll throw an error like the following:

> ERROR Hash mismatch on 1 files. Expected hash values:
> "Icon/Answer": { "Size=Default, Stack=False, Style=Default": "UhYGuawhIoWxhzQLOu2XCwpBCK8a7p381CWsz/NYaDQ=" }

Take these hash values and use them as the values for the previously added entries. Re-run the build process and verify that your new icon is added correctly and has the correct contents.

When updating an existing icon, just update the corresponding hash value(s) for the property combination(s) that changed.

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
