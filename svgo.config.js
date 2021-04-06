module.exports = {
    multipass: true,
    plugins: [
        {
            name: "convertPathData",
            params: {
                floatPrecision: 2,
                transformPrecision: 4
            }
        },
        {
            name: "cleanupNumericValues",
            params: {
                floatPrecision: 2
            }
        },
        {
            name: "removeAttrs",
            params: {
                attrs: "(fill-rule|clip-rule)"
            }
        },
        {
            name: "removeViewBox",
            active: false
        },
        {
            name: "removeXMLNS",
            active: true
        },
        {
            name: "mergePaths",
            params: {
                force: true
            }
        },
        {
            name: "collapseGroups",
            active: true
        },
        {
            name: "removeUselessStrokeAndFill",
            active: true
        }
    ]
}