module.exports = function(grunt) {
    grunt.initConfig({
        clean: ["build"],
        svgmin: {
            options: {
                plugins: [{
                    convertPathData: {
                        floatPrecision: 2,
                        transformPrecision: 4,
                    }
                }, {
                    cleanupNumericValues: {
                        floatPrecision: 2,
                    }
                }, {
                    collapseGroups: true,
                }, {
                    removeTitle: true,
                }, {
                    removeViewBox: false,
                }, {
                    removeUselessStrokeAndFill: true,
                }, {
                    removeAttrs: {
                        attrs: ['xmlns', 'fill-rule', 'clip-rule']
                    }
                }]
            },
            build: {
                files: [{
                    expand: true,
                    cwd: 'src/Icon',
                    src: '**/*.svg',
                    dest: 'build/lib',
                }]
            },
            multipass: {
                files: [{
                    expand: true,
                    cwd: 'build/lib',
                    src: '**/*.svg',
                    dest: 'build/lib',
                }]
            }
        },
        'string-replace': {
            buildIcons: {
                files: [{
                    expand: true,
                    cwd: 'build/lib',
                    src: '**/*.svg',
                    dest: 'build/lib'
                }],
                options: {
                    replacements: [{
                        pattern: '<svg',
                        replacement: '<svg aria-hidden="true" class="svg-icon icon@@__TARGET_FILENAME__"'
                    }, {
                        pattern: /<\/?g(\s.+?)*>/g,
                        replacement: ''
                    }, {
                        pattern: / fill="#000"/gm,
                        replacement: ''
                    }, {
                        pattern: / fill="none"/gm,
                        replacement: ''
                    }, {
                        pattern: / fill="#222426"/gm,
                        replacement: ' fill="var(--black-800)"'
                    }, {
                        pattern: / fill="#fff"/gm,
                        replacement: ' fill="var(--white)"'
                    }, {
                        pattern: / fill="#6A7E7C"/gm,
                        replacement: ' fill="var(--black-500)"'
                    }, {
                        pattern: / fill="#1A1104"/gm,
                        replacement: ' fill="var(--black-900)"'
                    }]
                }
            },
            replaceSvg: {
                files: [{
                    expand: true,
                    cwd: 'build/lib',
                    src: '**/*',
                    dest: 'build/lib'
                }],
                options: {
                    replacements: [{
                        pattern: '.svg',
                        replacement: ''
                    }]
                }
            },
            manifestJsonIcons: {
                files: {
                    'icons.js': 'icons.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-icon icon/g,
                        replacement: '\n  {\n\    "helper": "'
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: '"\n\  }'
                    }, {
                        pattern: /build\/lib\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            },
            manifestHelperIcons: {
                files: {
                    'helper.js': 'helper.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-icon icon/g,
                        replacement: 'public static SvgImage '
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: ' { get; } = GetImage();'
                    }, {
                        pattern: /build\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            },
        },
        replace: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'build/',
                    src: '**/*',
                    dest: 'build/'
                }]
            }
        },
        concat: {
            options: {
                process: function(src, filename) {
                    return src.replace(/\.svg/g, '') + filename;
                }
            },
            manifestJsonIcons: {
                options: {
                    banner: '[',
                    footer: '\n]',
                    separator: ',',
                },
                src: ['build/lib/*.svg'],
                dest: 'icons.js',
            },
            manifestHelperIcons: {
                src: ['build/lib/*.svg'],
                dest: 'helper.js',
            },
        },
        rename: {
            helperIcons: {
                files: [{
                    src: ['helper.js'],
                    dest: 'build/helper.cs'
                },]
            },
            iconsJson: {
                files: [{
                    src: ['icons.js'],
                    dest: 'build/icons.json'
                },]
            },
        }
    });

    // Load the plugins
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-svgmin');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-replace-regex');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-rename');

    // Default task(s).
    grunt.registerTask('default', [
        'clean', // Delete everything in the build directory to start fresh

        // SVG optimization and meta data
        'svgmin:build', // Apply SVG optimization
        'svgmin:multipass', // Apply SVG optimization again with same options for even more savings
        'string-replace:buildIcons', // Icons: Add classes placeholders and remove unnecessary colors for CSS recoloring eg. aria-hidden="true" class="svg-icon icon@@__TARGET_FILENAME__" width="18" height="18" viewBox="0 0 18 18"
        'replace', // Replaces class placeholder with the filename eg. class="svg-spot spotShield.svg"
        'string-replace:replaceSvg', // Replaces Shield.svg with Shield for final classname outputs eg. class="svg-spot spotShield"

        // Build a Json manifest
        'concat:manifestJsonIcons', // Icons: Take the entire contents of each SVG and shove it into a single file
        'string-replace:manifestJsonIcons', // Icons: Replace as much of the output SVG with text that makes sense in the context of a Json file
        'rename:iconsJson', // Rename the file to icons.json

        // Build a C# helper manifest
        'concat:manifestHelperIcons', // Icons: Take the entire contents of each SVG and shove it into a single file
        'string-replace:manifestHelperIcons', // Icons: Replace as much of the output SVG with text that makes sense in the context of a C# file
        'rename:helperIcons', // Rename the file to helperIcons.cs
    ]);
};