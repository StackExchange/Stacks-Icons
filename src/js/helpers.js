export function browserHelper(stacksIcons, stackSpots) {
  // Get all the SVG elements
  var items = document.querySelectorAll("svg[data-icon], svg[data-spot]");

  // Loop over them
  items.forEach(function (icon) {
    // Find an icon name in the format 'iconSomething'
    var iconName = icon.dataset.icon || icon.dataset.spot;

    var source = stacksIcons;

    if (icon.dataset.spot) {
      source = stackSpots;
    }

    // Do we recognise this icon?
    if (source[iconName]) {
      // Get the SVG string from our object
      var svgStr = source[iconName];

      // Replace classes
      if (icon.getAttribute("class"))
        svgStr = svgStr.replace(
          /class="/,
          'class="' + icon.getAttribute("class") + " "
        );

      // Create dom fragment
      var svgEl = document.createRange().createContextualFragment(svgStr);

      // Replace the existing SVG
      icon.parentNode.replaceChild(svgEl, icon);
    } else {
      console.log(
        iconName + " is not a Stacks icon or spot - did you spell something wrong?"
      );
      console.log(
        "https://stackoverflow.design/product/resources/icons/#icon-set"
      );
    }
  });
}
