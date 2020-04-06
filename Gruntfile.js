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
                    cwd: 'src/',
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
                    cwd: 'build/lib/Icon',
                    src: '**/*.svg',
                    dest: 'build/lib/Icon'
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
            buildSpots: {
                files: [{
                    expand: true,
                    cwd: 'build/lib/Spot',
                    src: '**/*.svg',
                    dest: 'build/lib/Spot'
                }],
                options: {
                    replacements: [{
                        pattern: '<svg',
                        replacement: '<svg aria-hidden="true" class="svg-spot spot@@__TARGET_FILENAME__"'
                    }, {
                        pattern: / fill="#000"/gm,
                        replacement: ''
                    }, {
                        pattern: / fill="none"/gm,
                        replacement: ''
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
                        pattern: /build\/lib\/Icon\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            },
            manifestJsonSpots: {
                files: {
                    'spots.js': 'spots.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-spot spot/g,
                        replacement: '\n  {\n\    "helper": "'
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: '"\n\  }'
                    }, {
                        pattern: /build\/lib\/Spot\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            },
            manifestHelperIcons: {
                files: {
                    'helperIcons.js': 'helperIcons.js',
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
            manifestHelperSpots: {
                files: {
                    'helperSpots.js': 'helperSpots.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-spot spot/g,
                        replacement: 'public static SvgImage '
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: ' { get; } = GetImage();'
                    }, {
                        pattern: /build\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            }
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
                src: ['build/lib/Icon/*.svg'],
                dest: 'icons.js',
            },
            manifestJsonSpots: {
                options: {
                    banner: '[',
                    footer: '\n]',
                    separator: ',',
                },
                src: ['build/lib/Spot/*.svg'],
                dest: 'spots.js',
            },
            manifestHelperIcons: {
                src: ['build/lib/Icon/*.svg'],
                dest: 'helperIcons.js',
            },
            manifestHelperSpots: {
                src: ['build/lib/Spot/*.svg'],
                dest: 'helperSpots.js',
            },
        },
        rename: {
            helperIcons: {
                files: [{
                    src: ['helperIcons.js'],
                    dest: 'build/helperIcons.cs'
                },]
            },
            helperSpots: {
                files: [{
                    src: ['helperSpots.js'],
                    dest: 'build/helperSpots.cs'
                },]
            },
            iconsJson: {
                files: [{
                    src: ['icons.js'],
                    dest: 'build/icons.json'
                },]
            },
            spotsJson: {
                files: [{
                    src: ['spots.js'],
                    dest: 'build/spots.json'
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
        'string-replace:buildSpots', // Spots: Add classes placeholders and remove unnecessary colors for CSS recoloring eg. aria-hidden="true" class="svg-spot spot@@__TARGET_FILENAME__" width="48" height="48" viewBox="0 0 48 48"
        'replace', // Replaces class placeholder with the filename eg. class="svg-spot spotShield.svg"
        'string-replace:replaceSvg', // Replaces Shield.svg with Shield for final classname outputs eg. class="svg-spot spotShield"

        // Build a Json manifest
        'concat:manifestJsonIcons', // Icons: Take the entire contents of each SVG and shove it into a single file
        'concat:manifestJsonSpots', // Spots: Take the entire contents of each SVG and shove it into a single file
        'string-replace:manifestJsonIcons', // Icons: Replace as much of the output SVG with text that makes sense in the context of a Json file
        'string-replace:manifestJsonSpots', // Spots: Replace as much of the output SVG with text that makes sense in the context of a Json file
        'rename:iconsJson', // Rename the file to icons.json
        'rename:spotsJson', // Rename the file to spots.json

        // Build a C# helper manifest
        'concat:manifestHelperIcons', // Icons: Take the entire contents of each SVG and shove it into a single file
        'concat:manifestHelperSpots', // Spots: Take the entire contents of each SVG and shove it into a single file
        'string-replace:manifestHelperIcons', // Icons: Replace as much of the output SVG with text that makes sense in the context of a C# file
        'string-replace:manifestHelperSpots', // Spots: Replace as much of the output SVG with text that makes sense in the context of a C# file
        'rename:helperIcons', // Rename the file to helperIcons.cs
        'rename:helperSpots' // Rename the file to helperSpots.cs
    ]);
};