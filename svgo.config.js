/** @type {import("svgo").OptimizeOptions} */
export default {
  multipass: true,
  floatPrecision: 2,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
          mergePaths: {
            force: true,
            noSpaceAfterFlags: true,
          },
        },
      },
    },
    "removeXMLNS",
    {
      name: "removeAttrs",
      params: {
        attrs: "(fill-rule|clip-rule)",
      },
    },
  ],
};
