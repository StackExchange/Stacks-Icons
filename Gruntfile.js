module.exports = function(grunt) {
  // Project configuration.  
  grunt.initConfig({
    clean: ["build"],
    svgmin: {
      options: {
        plugins: [{
          // Unfortunately, adding attributes doesn't play well with removing
          // them. For reasons™, we can't rely on our Svg.cs helper to add
          // them for us. We'll use a find and replace after SVGmin on each
          // of these built SVGs.
          //
          // addAttributesToSVGElement: {
          //   attributes: ['class="icon"', 'role="icon"']
          // },
          removeAttrs: {
            attrs: ['xmlns', 'fill-rule']
          },
          collapseGroups: true,
        }]
      },
      build: {
        files: [{
          expand: true,
          cwd: 'src',
          src: '*.svg',
          dest: 'build',
        }]
      }
    },
    'string-replace': {
      build: {
        files: [{
          expand: true,
          cwd: 'build/',
          src: '**/*',
          dest: 'build/'
        }],
        options: {
          replacements: [{
            pattern: '<svg',
            replacement: '<svg role="icon" class="icon"'
          }]
        }
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-svgmin');
  grunt.loadNpmTasks('grunt-string-replace');

  // Default task(s).
  grunt.registerTask('default', ['clean', 'svgmin', 'string-replace']);
};