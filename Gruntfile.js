module.exports = function(grunt) {
"use strict";
	
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		banner: '/*! <%= pkg.name %> - ver. <%= pkg.version %> - ' + '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
			'<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
			'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.production.author %>\n' +
			'* License: MIT */\n',
		savepath: {
			dest: 'dest',
			concat: 'concat',
		},
		clean: {
			build: ["<%= savepath.dest %>/*.*", "<%= savepath.concat %>/*.*"],
		},
		concat: {
			options: {
				banner: '/*! <%= pkg.name %> modules - ' + '<%= grunt.template.today("yyyy-mm-dd") %>\n'+
							' * (c) 2014 Wicker Wings\n'+
							' * License: MIT\n'+
							' ****/\n',
				stripBanners: true,
				separator: ';'
			},
			dist: {
				src: ['modules/*.js'],
				dest: '<%= savepath.concat %>/wm.js'
			}
		},
		uglify: {
			wicker: {
				options: {
					banner: '<%= banner %>'
				},
				files: {
					'<%= savepath.dest %>/wicker.min.js': ['wicker.js']
				}
			},
			mods: {
				options: {
					banner: '<%= concat.options.banner %>'
				},
				files: {
					'<%= savepath.dest %>/wm.min.js': ['<%= concat.dist.dest %>']
				}
			}
		},
		jshint: {
			files: ['Gruntfile.js', 'wicker.js', 'modules/**/*.js'],
			options: {
				strict : false,
				unused : true,	// 未使用変数を検出
				//undef : true,	// グローバル変数へのアクセスを禁止
				browser : true,	// ブラウザ用変数
				globals: {
					console: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-clean');

	grunt.registerTask('default', ['jshint', 'clean', 'concat', 'uglify:wicker', 'uglify:mods']);
	grunt.registerTask('wicker', ['jshint', 'uglify:wicker']);
	grunt.registerTask('mods', ['jshint', 'concat', 'uglify:mods']);
};
