const { extendDefaultPlugins } = require('svgo')

module.exports = {
  multipass: true,
  plugins: extendDefaultPlugins([
    {
      name: 'convertPathData',
      params: {
        floatPrecision: 2,
        transformPrecision: 4,
        noSpaceAfterFlags: true
      }
    },
    {
      name: 'cleanupNumericValues',
      params: {
        floatPrecision: 2
      }
    },
    {
      name: 'removeAttrs',
      params: {
        attrs: '(fill-rule|clip-rule)'
      }
    },
    {
      name: 'removeViewBox',
      active: false
    },
    {
      name: 'removeXMLNS',
      active: true
    },
    {
      name: 'mergePaths',
      params: {
        force: true,
        noSpaceAfterFlags: true
      }
    }
  ])
}