'use strict';

const path = require('path');
const fs = require('fs');

/**
 * Hook til integration af inkrementel kompilering i iOS-byggeprocessen
 */
exports.id = 'ti.ios.incremental';
exports.cliVersion = '>=3.2';
exports.init = function(logger, config, cli) {
    // Kontroller om inkrementel kompilering er aktiveret
    const isIncrementalEnabled = cli.argv.incremental !== false; // Standard: true
    const isForceFullBuild = !!cli.argv.forceFullBuild; // Standard: false
    
    if (!isIncrementalEnabled) {
        logger.debug('Inkrementel kompilering er deaktiveret.');
        return;
    }
    
    logger.debug('Initialiserer inkrementel kompilering hook...');
    
    // Tilføj CLI-flag til Titanium build-kommandoen
    cli.on('build.config', function(data) {
        data.flags.push({
            name: 'incremental',
            desc: 'aktiverer/deaktiverer inkrementel kompilering (standard: true)',
            default: true
        });
        
        data.flags.push({
            name: 'force-full-build',
            desc: 'tvinger fuld kompilering, selv når inkrementel kompilering er aktiveret (standard: false)',
            default: false
        });
        
        // Tilføj flag for at deaktivere source maps ved inkrementel kompilering
        data.flags.push({
            name: 'incremental-skip-sourcemaps',
            desc: 'deaktiverer source maps for inkrementelle builds (standard: false)',
            default: false
        });
    });
    
    // Hook ind i byggeprocessen inden kompilering
    cli.on('build.pre.compile', {
        priority: 1000,
        post: function(build, finished) {
            if (build.platformName !== 'ios') {
                finished();
                return;
            }
            
            logger.info('Forbereder inkrementel iOS-kompilering...');
            
            try {
                // Hent inkrementelBuilder modul
                const incrementalModule = require('../../../cli/lib/incremental');
                
                // Tjek om det er et Alloy-projekt
                const isAlloyProject = fs.existsSync(path.join(cli.argv['project-dir'], 'app'));
                
                // Kontroller om source maps skal deaktiveres for inkrementel kompilering
                const skipSourceMapsForIncrementalBuild = !!cli.argv['incremental-skip-sourcemaps'];
                
                // Ved starten af build.pre.compile hook
                logger.info('Source maps indstilling fra kommandolinje: ' + (cli.argv['source-maps'] === false ? 'false' : 'ikke angivet eller true'));
                if (cli.tiapp && Object.prototype.hasOwnProperty.call(cli.tiapp, 'source-maps')) {
                    logger.info('Source maps indstilling fra tiapp.xml: ' + cli.tiapp['source-maps'] + ' (type: ' + typeof cli.tiapp['source-maps'] + ')');
                }
                
                // Og i vores sourceMapsEnabled beregning
                let sourceMapsEnabled = cli.argv['source-maps'] !== false;
                if (cli.tiapp && cli.tiapp['source-maps'] === false) {
                    sourceMapsEnabled = false;
                    logger.info('Source maps deaktiveret fra tiapp.xml');
                }
                
                // Mere aggressiv deaktivering
                if (skipSourceMapsForIncrementalBuild || !sourceMapsEnabled) {
                    logger.warn('Source maps DEAKTIVERET - skriver over alle indstillinger');
                    cli.argv['source-maps'] = false;
                    build.sourceMaps = false;
                    if (build.compileJSS && build.compileJSS.options) {
                        build.compileJSS.options.sourceMaps = false;
                    }
                }
                
                // Opret inkrementel builder med konfiguration
                const incrementalConfig = {
                    projectDir: cli.argv['project-dir'],
                    buildDir: path.join(cli.argv['project-dir'], 'build', 'iphone'),
                    incremental: isIncrementalEnabled,
                    forceFullBuild: isForceFullBuild,
                    sourceMaps: sourceMapsEnabled, // Brug den potentielt ændrede værdi
                    alloy: isAlloyProject // Flag der indikerer om det er et Alloy-projekt
                };
                
                const incrementalBuilder = incrementalModule.createiOSIncrementalBuilder(logger, incrementalConfig);
                
                // Gem builder i build-objektet til senere brug
                build.iosIncrementalBuilder = incrementalBuilder;
                
                // Opret mappe-struktur til inkrementel kompilering hvis den ikke eksisterer
                const incrementalDir = path.join(incrementalConfig.buildDir, '.incremental');
                if (!fs.existsSync(incrementalDir)) {
                    fs.mkdirSync(incrementalDir, { recursive: true });
                }
            } catch (err) {
                logger.error('Fejl ved initialisering af inkrementel kompilering:');
                logger.error(err);
            }
            
            finished();
        }
    });
    
    // Hook ind i iOS xcodebuild-processen
    cli.on('build.ios.xcodebuild', {
        priority: 1000,
        pre: function(data, finished) {
            if (!isIncrementalEnabled) {
                finished();
                return;
            }
            
            const builder = data.ctx.iosIncrementalBuilder;
            if (!builder) {
                logger.warn('Inkrementel builder ikke fundet, bruger normal kompilering.');
                finished();
                return;
            }
            
            try {
                logger.info('Konfigurerer inkrementel xcodebuild...');
                
                // Hent alle kildefiler fra Xcode-projektet
                const sourceFiles = builder.getAllSourceFilesInXcodeProject(data.ctx.xcodeProject);
                
                // Spor kildefiler og deres afhængigheder
                builder.trackSourceFiles(sourceFiles);
                
                // Analyser ændringer og bestem hvilke filer der skal kompileres
                const buildResult = builder.build();
                
                if (buildResult.nothingToCompile) {
                    logger.info('Ingen ændrede filer at kompilere.');
                    // Her kunne vi optimere ved at springe over xcodebuild helt,
                    // men det kræver mere logik i Titanium CLI
                }
                
                if (buildResult.incremental && buildResult.xcodeBuildArgs) {
                    // Tilføj inkrementelle argumenter til xcodebuild
                    logger.info('Tilføjer inkrementelle flags til xcodebuild...');
                    data.args = data.args.concat(buildResult.xcodeBuildArgs);
                }
            } catch (err) {
                logger.error('Fejl ved konfiguration af inkrementel kompilering:');
                logger.error(err);
            }
            
            finished();
        },
        post: function(data, finished) {
            if (!isIncrementalEnabled) {
                finished();
                return;
            }
            
            const builder = data.ctx.iosIncrementalBuilder;
            if (builder) {
                // Opdater tilstand efter kompilering
                builder.updateState();
            }
            
            finished();
        }
    });
    
    // Hook ind i JS-processering for at registrere kildefil til sourcemap-relationer
    cli.on('build.ios.compileJsFile', {
        priority: 1000,
        pre: function(data, finished) {
            if (!isIncrementalEnabled || !data || !data.from || !data.ctx || !data.ctx.iosIncrementalBuilder) {
                finished();
                return;
            }
            
            // Spor filerne før de kompileres/transformeres
            const builder = data.ctx.iosIncrementalBuilder;
            
            // Kildestien
            const jsFile = data.from;
            
            // Spor file hashes før kompilering, så vi kan tjekke ændringer mellem builds
            builder.sourceMapTracker.trackSourceFile(jsFile);
            
            // Fortsæt med almindelig processering
            finished();
        },
        post: function(data, finished) {
            if (!isIncrementalEnabled || !data || !data.from || !data.ctx || !data.ctx.iosIncrementalBuilder) {
                finished();
                return;
            }
            
            const builder = data.ctx.iosIncrementalBuilder;
            const jsFile = data.from;
            
            // Forsøg at registrere source map filen for denne JS-fil
            try {
                // Forsøg at finde alle tre almindelige konventioner for source maps:
                
                // 1. Titanium-specifik i build/map
                const relPath = path.relative(builder.projectDir, jsFile);
                const mapRelPath = path.join('build', 'map', relPath + '.map');
                const mapFullPath = path.join(builder.projectDir, mapRelPath);
                
                if (fs.existsSync(mapFullPath)) {
                    builder.mapJsFileToSourceMap(jsFile, mapFullPath);
                    logger.trace(`Registreret source map: ${mapFullPath} for ${jsFile}`);
                    return finished();
                }
                
                // 2. Sidestillet .js.map
                const sourceMapPath = jsFile + '.map';
                if (fs.existsSync(sourceMapPath)) {
                    builder.mapJsFileToSourceMap(jsFile, sourceMapPath);
                    logger.trace(`Registreret source map: ${sourceMapPath} for ${jsFile}`);
                    return finished();
                }
                
                // 3. I samme mappe med .map extension
                const alternativeMapPath = path.join(
                    path.dirname(jsFile),
                    path.basename(jsFile) + '.map'
                );
                
                if (fs.existsSync(alternativeMapPath)) {
                    builder.mapJsFileToSourceMap(jsFile, alternativeMapPath);
                    logger.trace(`Registreret source map: ${alternativeMapPath} for ${jsFile}`);
                    return finished();
                }
                
                logger.trace(`Ingen source map fundet for ${jsFile}`);
            } catch (err) {
                logger.debug('Kunne ikke registrere sourcemap for ' + jsFile + ': ' + err.message);
            }
            
            finished();
        }
    });
    
    // Hook ind i ProcessJsTask for at patch dens opførsel
    const originalProcessJsTask = require('appc-tasks').ProcessJsTask;
    if (originalProcessJsTask && originalProcessJsTask.prototype) {
        // Gem reference til den originale processJsFile-metode
        const originalProcessJsFile = originalProcessJsTask.prototype.processJsFile;
        
        // Patch processJsFile-metoden for at tilføje inkrementel source map-håndtering
        originalProcessJsTask.prototype.processJsFile = function(filePathAndName) {
            // Først tjek om vi skal springe over source map-generering for denne fil
            const builder = this.builder;
            if (builder && builder.iosIncrementalBuilder && this.defaultAnalyzeOptions && this.defaultAnalyzeOptions.sourceMap) {
                const incrementalBuilder = builder.iosIncrementalBuilder;
                const shouldGenerateSourceMap = incrementalBuilder.shouldGenerateSourceMap(filePathAndName);
                
                // Hvis source maps er aktiveret, men denne fil ikke kræver en source map opdatering,
                // deaktiver midlertidigt source maps for denne fil
                if (!shouldGenerateSourceMap) {
                    // Gem den originale værdi
                    const originalSourceMap = this.defaultAnalyzeOptions.sourceMap;
                    const originalSourceMapIncludeSource = this.defaultAnalyzeOptions.sourceMapIncludeSource;
                    
                    // Deaktiver source maps
                    this.defaultAnalyzeOptions.sourceMap = false;
                    this.defaultAnalyzeOptions.sourceMapIncludeSource = false;
                    
                    // Fortsæt med bearbejdning
                    const result = originalProcessJsFile.call(this, filePathAndName);
                    
                    // Gendan den originale værdi
                    this.defaultAnalyzeOptions.sourceMap = originalSourceMap;
                    this.defaultAnalyzeOptions.sourceMapIncludeSource = originalSourceMapIncludeSource;
                    
                    // Logmessage for debug
                    logger.trace(`Sprang over source map generering for ${filePathAndName}`);
                    
                    return result;
                } else {
                    // Hvis vi skal generere denne source map, tilføj en log
                    logger.debug(`Genererer source map for ${filePathAndName}`);
                }
            }
            
            // Patch også writeFileContents metoden for at fange præcist hvornår en source map skrives
            const origWriteFileContents = this.writeFileContents;
            
            if (origWriteFileContents && typeof origWriteFileContents === 'function' && builder && builder.iosIncrementalBuilder) {
                this.writeFileContents = function(destination, contents, sourceMap) {
                    // Når en source map skrives, registrer den med kildefilen
                    if (sourceMap && destination.endsWith('.js') && builder.iosIncrementalBuilder) {
                        const sourceMapFile = destination + '.map'; // Destination er .js filen
                        // Registrer relationen mellem .js filen og dens .map fil
                        builder.iosIncrementalBuilder.mapJsFileToSourceMap(filePathAndName, sourceMapFile);
                        logger.trace(`Skriver source map: ${sourceMapFile} for ${filePathAndName}`);
                    }
                    
                    // Kald den oprindelige metode
                    return origWriteFileContents.call(this, destination, contents, sourceMap);
                };
            }
            
            // Hvis vi ikke har en builder eller source maps er deaktiveret, eller hvis filen
            // kræver en source map opdatering, fortsæt med normal bearbejdning
            return originalProcessJsFile.call(this, filePathAndName);
        };

        // Mere drastisk løsning - patch babel-plugin direkte
        try {
            // Find Babel-plugin modulet
            const babelPluginPath = path.join(require.resolve('appc-tasks'), '..', '..', 'node_modules', 'babel-plugin-source-map-support');
            if (fs.existsSync(babelPluginPath)) {
                logger.debug(`Fandt babel-plugin-source-map-support: ${babelPluginPath}`);
                
                // Forsøg at patch modulet direkte
                const babelPluginModule = require(babelPluginPath);
                if (babelPluginModule && typeof babelPluginModule === 'function') {
                    // Behold original plugin
                    const originalBabelPlugin = babelPluginModule;
                    
                    // Erstat med vores egen version
                    module.exports = function(babel) {
                        // Få plugin objektet fra original plugin
                        const pluginObj = originalBabelPlugin(babel);
                        
                        // Behold reference til original visitor
                        const originalVisitor = pluginObj.visitor;
                        
                        // Erstat visitor med vores egen
                        pluginObj.visitor = {
                            Program: {
                                enter: function(path, state) {
                                    // Tjek om vi har inkrementel builder og kan springe over
                                    if (global.titaniumIncrementalBuilder) {
                                        const incrementalBuilder = global.titaniumIncrementalBuilder;
                                        const filePath = state.file.opts.filename;
                                        
                                        if (!incrementalBuilder.shouldGenerateSourceMap(filePath)) {
                                            logger.trace(`Skipping source map for ${filePath} at Babel plugin level`);
                                            // Skip bearbejdning ved at returnere tidligt
                                            return;
                                        }
                                    }
                                    
                                    // Kald original visitor
                                    if (originalVisitor.Program && originalVisitor.Program.enter) {
                                        return originalVisitor.Program.enter.call(this, path, state);
                                    }
                                }
                            }
                        };
                        
                        // Returner det ændrede plugin objekt
                        return pluginObj;
                    };
                    
                    logger.info('Patched babel-plugin-source-map-support for incremental builds.');
                }
            }
        } catch (err) {
            logger.warn(`Kunne ikke patche babel-plugin: ${err.message}`);
        }
    }
    
    // Gør inkrementel builder globalt tilgængelig
    cli.on('build.pre.compile', {
        priority: 1500, // Kør før vores hovedlogik i build.pre.compile
        pre: function(data, finished) {
            if (data.platformName === 'ios' && data.iosIncrementalBuilder) {
                // Gør builder tilgængelig globalt så babel plugin kan tilgå den
                global.titaniumIncrementalBuilder = data.iosIncrementalBuilder;
                logger.debug('Made iOS incremental builder globally available for plugins');
            }
            finished();
        }
    });
    
    // Yderligere hook for at opsnappe sourcemap-generering
    // Dette håndterer det tilfælde, hvor sourcemaps genereres direkte til build/map-mappen
    cli.on('build.ios.writeSourceMap', {
        pre: function(data, finished) {
            if (!isIncrementalEnabled || !data || !data.jsFile || !data.sourceMapFile || !data.ctx || !data.ctx.iosIncrementalBuilder) {
                finished();
                return;
            }
            
            try {
                // Registrer relationen mellem .js filen og dens .map fil
                const builder = data.ctx.iosIncrementalBuilder;
                const jsFile = data.jsFile;
                const sourceMapFile = data.sourceMapFile;
                
                builder.mapJsFileToSourceMap(jsFile, sourceMapFile);
                logger.trace(`Registrerer source map relation: ${sourceMapFile} for ${jsFile}`);
            } catch (err) {
                logger.debug('Fejl ved registrering af source map relation: ' + err.message);
            }
            
            finished();
        }
    });
    
    // Hook ind i Alloy-kompileringsprocessen
    // Dette er nødvendigt for at spore Alloy-view, controller og style-filer
    const alloyHooks = [
        // Almindelige filer
        'compile:app.js',
        'compile:error',
        'compile:teardown',
        // XML/Controller filer
        'compile:compilealloy',
        // Widget relaterede events
        'compile:widget',
        'compile:widget:controller',
        'compile:widget:view'
    ];
    
    alloyHooks.forEach(hookName => {
        cli.on(hookName, function(data) {
            try {
                // Tjek om vi har en inkrementel builder
                const ctx = data && data.ctx;
                if (!ctx || !ctx.iosIncrementalBuilder) {
                    return;
                }
                
                const builder = ctx.iosIncrementalBuilder;
                const sources = [];
                
                // Tilføj XML-view hvis det findes
                if (data.view) {
                    sources.push(data.view);
                }
                
                // Tilføj controller hvis den findes
                if (data.controller) {
                    sources.push(data.controller);
                }
                
                // Tilføj style hvis det findes
                if (data.style) {
                    sources.push(data.style);
                }
                
                // Tilføj output-fil hvis den findes
                if (data.output && sources.length > 0) {
                    builder.mapAlloyOutputToSources(data.output, sources);
                    
                    // Tjek om denne fil skal regenereres
                    const shouldRegenerate = builder.shouldRegenerateAlloyOutput(data.output);
                    
                    // Skip logmessager for filer der ikke ændret
                    if (!shouldRegenerate) {
                        // Her kunne vi potentielt stoppe Alloy fra at processere denne fil,
                        // men det kræver dyb integration med Alloy-compileren
                        if (data.logLevel) {
                            data.logLevel = 'trace'; // Sænk logniveauet for denne fil
                        }
                    }
                }
            } catch (err) {
                logger.debug('Fejl ved Alloy tracking: ' + err.message);
            }
        });
    });

    // Hook ind i iOS-optimering
    cli.on('build.ios.optimize', {
        priority: 1000,
        pre: function(data, finished) {
            if (!isIncrementalEnabled) {
                finished();
                return;
            }
            
            const builder = data.ctx.iosIncrementalBuilder;
            if (!builder) {
                logger.warn('Inkrementel builder ikke fundet, bruger normal optimering.');
                finished();
                return;
            }
            
            try {
                logger.info('Indsamler JavaScript-filer til optimering...');
                
                const jsFiles = data.ctx.jsFiles || []; // Forsøg at få kildefiler fra konteksten
                
                // Spor JavaScript-filer for optimering
                jsFiles.forEach(file => {
                    builder.trackJsFileForOptimization(file);
                });
                
                // Få filer der skal optimeres baseret på ændringer
                const filesToOptimize = builder.getJsFilesToOptimize();
                
                if (filesToOptimize.length > 0) {
                    logger.info(`Optimerer ${filesToOptimize.length} JavaScript-filer inkrementelt.`);
                    
                    // Erstat data.ctx.jsFiles med kun de filer der skal optimeres
                    // Dette forudsætter at optimerings-processen bruger denne liste
                    if (data.ctx.jsFiles && Array.isArray(data.ctx.jsFiles)) {
                        data.ctx.jsFiles = filesToOptimize;
                    }
                } else {
                    logger.info('Ingen JavaScript-filer skal optimeres inkrementelt.');
                }
            } catch (err) {
                logger.error('Fejl ved konfiguration af inkrementel optimering:');
                logger.error(err);
            }
            
            finished();
        },
        post: function(data, finished) {
            if (!isIncrementalEnabled) {
                finished();
                return;
            }
            
            const builder = data.ctx.iosIncrementalBuilder;
            if (builder) {
                // Opdater tilstand efter optimering
                builder.updateState();
            }
            
            finished();
        }
    });

    // Hook ind i optimizeFiles-metoden via build.ios.xcodebuild
    cli.on('build.ios.xcodebuild', {
        priority: 900, // Kør før vores hovedlogik i xcodebuild pre-hook
        pre: function(data, finished) {
            if (!isIncrementalEnabled) {
                finished();
                return;
            }
            
            const builder = data.ctx;
            if (!builder) {
                logger.warn('Builder ikke fundet i kontekst, springer over optimizeFiles patching.');
                finished();
                return;
            }
            
            try {
                // Tjek om builder har optimizeFiles-metoden
                if (builder.optimizeFiles && typeof builder.optimizeFiles === 'function') {
                    // Behold en reference til den originale optimizeFiles metode
                    if (!builder._originalOptimizeFiles) {
                        builder._originalOptimizeFiles = builder.optimizeFiles;
                        
                        // Erstat metoden med vores egen implementation der håndterer inkrementel optimering
                        builder.optimizeFiles = function(next) {
                            // Hvis inkrementel kompilering er deaktiveret, brug oprindelig funktion
                            if (!isIncrementalEnabled || !this.iosIncrementalBuilder) {
                                return this._originalOptimizeFiles(next);
                            }
                            
                            // Udfør optimeringseventen først
                            const ctx = this;
                            cli.emit('build.ios.optimize', {
                                ctx: this,
                                optimizeDir: this.xcodeAppDir
                            }, function(err) {
                                if (err) {
                                    logger.error(err);
                                }
                                
                                // Fortsæt med den originale optimering
                                ctx._originalOptimizeFiles(next);
                            });
                        };
                        
                        logger.debug('Patched optimizeFiles method for incremental optimization');
                    }
                } else {
                    logger.warn('Could not patch optimizeFiles method: method not found on builder');
                }
            } catch (err) {
                logger.warn('Could not patch optimizeFiles method: ' + err.message);
            }
            
            finished();
        }
    });
}; 