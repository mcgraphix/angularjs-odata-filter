// gulp
var gulp = require('gulp');

// plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var karma = require('gulp-karma');

// tasks
gulp.task('lint', function() {
    gulp.src(['./src/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});
gulp.task('clean', function() {
    gulp.src('./dist/*')
        .pipe(clean({force: true}));
});

gulp.task('minify-js', function() {
    gulp.src(['./src/**/*.js', '!./src/**/*.spec.js'])
        .pipe(uglify({
            // inSourceMap:
            // outSourceMap: "app.js.map"
        }))
        .pipe(gulp.dest('./dist/'))
});



gulp.task('test', function() {
    // Be sure to return the stream
    // NOTE: Using the fake './foobar' so as to run the files
    // listed in karma.conf.js INSTEAD of what was passed to
    // gulp.src !
    return gulp.src('./na')
        .pipe(karma({
            configFile: 'karma.conf.js',
            action: 'run'
        }))
        .on('error', function(err) {
            // Make sure failed tests cause gulp to exit non-zero
            console.log(err);
            this.emit('end'); //instead of erroring the stream, end it
        });
});

gulp.task('autotest', function() {
    return gulp.watch(['src/**/*.js'], ['test']);
});


// default task
gulp.task('default',
    ['build']
);

gulp.task('build', function() {
    runSequence(
        ['clean'],
        ['lint', 'test', 'minify-js']
    );
});