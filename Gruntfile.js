'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    app: ['./*.js', './lib/**/*.js'],
    tests: ['./test/**/*.js'],
    specs: ['./spec/**/*.js'],
    eslint: {
      target: ['<%= app %>', '<%= tests %>', '<%= specs %>']
    },
    mochaTest: {
      options: {
        reporter: 'spec',
        clearRequireCache: false,
        timeout: 3000
      },
      test: {
        src: ['<%= tests %>']
      },
      spec: {
        src: ['<%= specs %>']
      }
    },
    env: {
      test: {
        RESPONSE_FAIL_ACTION: 'error'
      }
    },
    watch: {
      tests: {
        files: ['<%= app %>', '!./lib/server.js', '!./lib/handlers/*.js', '<%= tests %>'],
        tasks: ['lint', 'test']
      },
      specs: {
        files: ['./lib/server.js', './lib/handlers/*.js', '<%= specs %>'],
        tasks: ['lint', 'spec']
      }
    },
    retire: {
      node: ['node']
    }
  });

  grunt.registerTask('lint', 'eslint');
  grunt.registerTask('test', ['env:test', 'mochaTest:test']);
  grunt.registerTask('spec', ['env:test', 'mochaTest:spec']);
  grunt.registerTask('ci', ['retire', 'default']);
  grunt.registerTask('default', ['lint', 'test', 'spec']);
};
