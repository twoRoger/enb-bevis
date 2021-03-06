/**
 * sources
 * =======
 *
 * Собирает информацию о директориях с исходным кодом проекта, предоставляет `?.sources`.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию — `?.sources`.
 * * *Boolean* **auto** — Автоматический сбор директорий с исходниками на основе `package.json`.
 *   По умолчанию включено.
 * * *String[]* **sources** — Исходные директории.
 * * *String[]* **dependencies** — Пакеты, от которых зависит проект.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTech(require('enb-bevis/techs/sources'));
 * ```
 */

var fs = require('fs');
var SourceRoot = require('../lib/sources/source-root');
var Sources = require('../lib/sources/sources');
var inherit = require('inherit');
var path = require('path');

module.exports = inherit(require('enb/lib/tech/base-tech'), {
    getName: function () {
        return 'sources';
    },

    init: function () {
        this.__base.apply(this, arguments);
        this._sources = this.getOption('sources');
        this._dependencies = this.getOption('dependencies');
        this._auto = this.getOption('auto', true);
        this._profile = this.getOption('profile', 'default');
        this._target = this.node.unmaskTargetName(this.getOption('target', '?.sources'));
    },

    getTargets: function () {
        return [this._target];
    },

    build: function () {
        var profileName = this._profile;
        var sourceList = [];
        var projectRoot = this.node.getRootDir();
        var packagesDirectory = projectRoot + '/node_modules';

        function readPackageSources (packageDir) {
            var sources = [];
            var packageJsonFilename = packageDir + '/package.json';
            if (fs.existsSync(packageJsonFilename)) {
                var jsonData;
                try {
                    jsonData = JSON.parse(fs.readFileSync(packageJsonFilename));
                } catch (e) {
                    e.message = 'Error parsing "' + packageJsonFilename + '": ' + e.message;
                    throw e;
                }
                if (jsonData.enb) {
                    var enb = jsonData.enb;
                    var enbSources = enb.sources || [];
                    var enbDependencies = enb.dependencies || [];
                    if (enb.profiles && enb.profiles[profileName]) {
                        var profile = enb.profiles[profileName];
                        if (profile.sources) {
                            enbSources = enbSources.concat(profile.sources);
                        }
                        if (profile.dependencies) {
                            enbDependencies = enbDependencies.concat(profile.dependencies);
                        }
                    }
                    enbDependencies.forEach(function (packageName) {
                        sources = sources.concat(readPackageSources(packagesDirectory + '/' + packageName));
                    });
                    sources = sources.concat(enbSources.map(function (sourceName) {
                        return packageDir + '/' + sourceName;
                    }));
                }
            }
            return sources;
        }

        if (this._auto) {
            sourceList = sourceList.concat(readPackageSources(projectRoot));
        }

        if (this._dependencies) {
            this._dependencies.forEach(function (packageName) {
                sourceList = sourceList.concat(readPackageSources(packagesDirectory + '/' + packageName));
            });
        }

        if (this._sources) {
            sourceList = sourceList.concat(this._sources.map(function (sourcePath) {
                return path.resolve(projectRoot, sourcePath);
            }));
        }

        var sourceIndex = {};
        var sourcePaths = [];
        sourceList.forEach(function (sourcePath) {
            if (!sourceIndex[sourcePath]) {
                sourceIndex[sourcePath] = true;
                sourcePaths.push(sourcePath);
            }
        });

        var sourceRoots = sourcePaths.map(function (sourcePath) {
            if (!this.node.buildState[sourcePath]) {
                this.node.buildState[sourcePath] = SourceRoot.loadFromPath(sourcePath);
            }
            return this.node.buildState[sourcePath];
        }, this);

        this.node.resolveTarget(this._target, new Sources(sourceRoots));
    },

    clean: function () {}
});
