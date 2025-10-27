# Stacks-Icons

```sh
dotnet add package StackExchange.StacksIcons
```

This package provides an SVG helper for use in Razor and other contexts:

```cshtml
@using StackExchange.StacksIcons

<div>
  // icons and spots return an `HtmlString` for safe use in Razor
  @Svg.Answer
  @Svg.Spot.Wave

  // the `With` method can take css classes and title text to add to the svg
  @Svg.Answer.With(cssClass: "fc-danger", title: "foo")
</div>
```

Enum definitions and lookup dictionaries for all icons/spots are also provided:

```cs
using StackExchange.StacksIcons;

StacksIcon iconName = StacksIcon.Answer;
HtmlString icon = Svg.Lookup[iconName]; // icon is now set to the value in Svg.Answer

StacksSpot spotName = StacksSpot.Wave;
HtmlString spot = Svg.Spot.Lookup[spotName]; // spot is now set to the value in Svg.Spot.Wave
```
