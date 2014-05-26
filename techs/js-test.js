/**
 * js-test
 * =======
 */
var vow = require('vow');
var vowFs = require('enb/lib/fs/async-fs');

module.exports = require('enb/lib/build-flow').create()
    .name('js-test')
    .target('target', '?.test.js')
    .useFileList('test.js')
    .defineOption('fileMask', /.*/, '_fileMask')
    .builder(function (testFiles) {
        var node = this.node;
        var destPath = node.resolvePath(this._target);
        var fileMask = this._fileMask;
        testFiles = testFiles.filter(
                typeof fileMask === 'function' ? fileMask : function (file) {
                return fileMask.test(file.fullname);
            });
        return vow.all(testFiles.map(function (file) {
            return vowFs.read(file.fullname, 'utf8').then(function (content) {
                return {
                    filename: node.relativePath(file.fullname),
                    content: content
                };
            });
        })).then(function (results) {
            var file = new File(destPath, true);
            results.forEach(function (result) {
                file.writeFileContent(result.filename, result.content);
            });
            return file.render();
        });
    })
    .createTech();