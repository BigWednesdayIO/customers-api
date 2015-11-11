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
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: false
        },
        src: ['<%= tests %>']
      },
      spec: {
        options: {
          reporter: 'spec',
          clearRequireCache: false
        },
        src: ['<%= specs %>']
      }
    },
    env: {
      test: {
        RESPONSE_FAIL_ACTION: 'error',
        AUTH0_DOMAIN: 'bigwednesday-io.eu.auth0.com',
        AUTHO_CLIENT_ID: 'Jw1aCZI3xZrXzouw7HMkB5wEczIzzdSO',
        AUTH0_CLIENT_SECRET: 'w9PNqy0DIJ6-hguQTMtxIcXXofhofYYqbLWWEkqVVRX0_-V9ByTvafY-q8uX-TuC',
        AUTH0_CONNECTION: 'orderable-test-username-password'
      }
    },
    watch: {
      app: {
        files: ['<%= app %>', '<%= tests %>'],
        tasks: ['lint', 'test']
      },
      specs: {
        files: ['<%= specs %>'],
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
