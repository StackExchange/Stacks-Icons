export function browserHelper(
  stacksIcons: Record<string, string>,
  stackSpots: Record<string, string>
) {
  // Get all the SVG elements
  var items = document.querySelectorAll<HTMLElement>(
    "svg[data-icon], svg[data-spot]"
  );

  // Loop over them
  items.forEach(function (icon) {
    // Find an icon name in the format 'iconSomething'
    var iconName = icon.dataset["icon"] || icon.dataset["spot"] || "";

    var source = stacksIcons;

    if (icon.dataset["spot"]) {
      source = stackSpots;
    }

    // Get the SVG string from our object
    let svgStr = source[iconName];

    // Do we recognize this icon?
    if (!svgStr) {
      console.warn(
        iconName +
          " is not a Stacks icon or spot - did you spell something wrong? \n https://stackoverflow.design/product/resources/icons/#icon-set"
      );

      return;
    }

    // Replace classes
    if (icon.getAttribute("class"))
      svgStr = svgStr.replace(
        /class="/,
        'class="' + icon.getAttribute("class") + " "
      );

    // Create dom fragment
    var svgEl = document.createRange().createContextualFragment(svgStr);

    // Replace the existing SVG
    icon.parentNode?.replaceChild(svgEl, icon);
  });
}
