module.exports = function(grunt) {

  // Project configuration.  
  grunt.initConfig({
    clean: ["build"],
  	svgmin: {
      options: {
  			plugins: [
  				{
            removeXMLNS: true,
            collapseGroups: true
  				}
  			]
  		},
  		build: {
        files: [{
          expand: true,
          cwd: 'src',
          src: '*.svg',
          dest: 'build',
        }]
  		}
  	}
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-svgmin');

  // Default task(s).
  grunt.registerTask('default', ['clean','svgmin']);
};