export function browserHelper(stacksIcons) {
  // Get all the SVG elements
  var icons = document.querySelectorAll("svg[data-icon]");

  // Loop over them
  icons.forEach(function (icon) {
    // Find an icon name in the format 'iconSomething'
    var iconName = icon.getAttribute("data-icon");

    // Do we recognise this icon?
    if (stacksIcons[iconName]) {
      // Get the SVG string from our object
      var svgStr = stacksIcons[iconName];

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
        iconName + " is not a Stacks icon - did you spell something wrong?"
      );
      console.log(
        "https://stackoverflow.design/product/resources/icons/#icon-set"
      );
    }
  });
}
