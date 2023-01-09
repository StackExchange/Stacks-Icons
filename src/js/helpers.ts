export function browserHelper(
    stacksIcons: Record<string, string>,
    stackSpots: Record<string, string>
) {
    // Get all the SVG elements
    const items = document.querySelectorAll<HTMLElement>(
        "svg[data-icon], svg[data-spot]"
    );

    // Loop over them
    items.forEach(function (icon) {
        // Find an icon name in the format 'iconSomething'
        const iconName = icon.dataset["icon"] || icon.dataset["spot"] || "";

        let source = stacksIcons;

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
        const existingClass = icon.getAttribute("class");
        if (existingClass) {
            svgStr = svgStr.replace(/class="/, 'class="' + existingClass + " ");
        }

        // Create dom fragment
        // eslint-disable-next-line no-unsanitized/method
        const svgEl = document.createRange().createContextualFragment(svgStr);

        // Replace the existing SVG
        icon.parentNode?.replaceChild(svgEl, icon);
    });
}
