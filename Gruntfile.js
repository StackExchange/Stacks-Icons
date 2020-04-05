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
                    cwd: 'src/export',
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
                    cwd: 'build/lib/svg-icons',
                    src: '*',
                    dest: 'build/lib/svg-icons'
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
                    cwd: 'build/lib/svg-spots',
                    src: '*',
                    dest: 'build/lib/svg-spots'
                }],
                options: {
                    replacements: [{
                        pattern: '<svg',
                        replacement: '<svg aria-hidden="true" class="svg-spot spot@@__TARGET_FILENAME__"'
                    }, {
                        pattern: ' fill="#000"',
                        replacement: ''
                    }, {
                        pattern: ' fill="none"',
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
            manifestIcons: {
                files: {
                    'icons.js': 'icons.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-icon icon/g,
                        replacement: '- helper: '
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: ''
                    }, {
                        pattern: /build\/lib\/svg-icons\/.*\.svg/g,
                        replacement: ''
                    }]
                }
            },
            manifestSpots: {
                files: {
                    'spots.js': 'spots.js',
                },
                options: {
                    replacements: [{
                        pattern: /<svg aria-hidden="true" class="svg-spot spot/g,
                        replacement: '- helper: '
                    }, {
                        pattern: /" width=".*<\/svg>/g,
                        replacement: ''
                    }, {
                        pattern: /build\/lib\/svg-spots\/.*\.svg/g,
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
            },
            finalRemove: {
                files: [{
                    expand: true,
                    cwd: 'build/lib',
                    src: '**/*',
                    dest: 'build/lib'
                }],
                options: {
                    replacements: [{
                        pattern: ' fill="#000"',
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
            manifestIcons: {
                src: ['build/lib/svg-icons/*.svg'],
                dest: 'icons.js',
            },
            manifestSpots: {
                src: ['build/lib/svg-spots/*.svg'],
                dest: 'spots.js',
            },
            manifestHelperIcons: {
                src: ['build/lib/svg-icons/*.svg'],
                dest: 'helperIcons.js',
            },
            manifestHelperSpots: {
                src: ['build/lib/svg-spots/*.svg'],
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
            icons: {
                files: [{
                    src: ['icons.js'],
                    dest: 'build/icons.yml'
                },]
            },
            spots: {
                files: [{
                    src: ['spots.js'],
                    dest: 'build/spots.yml'
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
    grunt.registerTask('default', ['clean', 'svgmin:build', 'svgmin:multipass', 'string-replace:buildIcons', 'string-replace:buildSpots', 'replace', 'string-replace:replaceSvg', 'concat:manifestIcons', 'concat:manifestSpots', 'string-replace:manifestIcons', 'string-replace:manifestSpots', 'concat:manifestHelperIcons', 'concat:manifestHelperSpots', 'string-replace:manifestHelperIcons', 'string-replace:manifestHelperSpots', 'rename:helperIcons', 'rename:helperSpots', 'rename:icons', 'rename:spots', 'finalRemove']);
};