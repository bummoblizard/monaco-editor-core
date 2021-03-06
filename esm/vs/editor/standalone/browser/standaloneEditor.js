/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import './standalone-tokens.css';
import { URI } from '../../../base/common/uri';
import { ICodeEditorService } from '../../browser/services/codeEditorService';
import { OpenerService } from '../../browser/services/openerService';
import { DiffNavigator } from '../../browser/widget/diffNavigator';
import { EditorOptions, ConfigurationChangedEvent } from '../../common/config/editorOptions';
import { BareFontInfo, FontInfo } from '../../common/config/fontInfo';
import { EditorType } from '../../common/editorCommon';
import { FindMatch, TextModelResolvedOptions } from '../../common/model';
import * as modes from '../../common/modes';
import { NULL_STATE, nullTokenize } from '../../common/modes/nullMode';
import { IEditorWorkerService } from '../../common/services/editorWorkerService';
import { IModeService } from '../../common/services/modeService';
import { ITextModelService } from '../../common/services/resolverService';
import { createWebWorker as actualCreateWebWorker } from '../../common/services/webWorker';
import * as standaloneEnums from '../../common/standalone/standaloneEnums';
import { Colorizer } from './colorizer';
import { SimpleEditorModelResolverService } from './simpleServices';
import { StandaloneDiffEditor, StandaloneEditor, createTextModel } from './standaloneCodeEditor';
import { DynamicStandaloneServices, StaticServices } from './standaloneServices';
import { IStandaloneThemeService } from '../common/standaloneThemeService';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands';
import { IConfigurationService } from '../../../platform/configuration/common/configuration';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey';
import { IContextViewService, IContextMenuService } from '../../../platform/contextview/browser/contextView';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding';
import { INotificationService } from '../../../platform/notification/common/notification';
import { IOpenerService } from '../../../platform/opener/common/opener';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility';
import { clearAllFontInfos } from '../../browser/config/configuration';
import { IEditorProgressService } from '../../../platform/progress/common/progress';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService';
import { splitLines } from '../../../base/common/strings';
import { IModelService } from '../../common/services/modelService';
import { DiffComputer } from '../../common/diff/diffComputer';
function withAllStandaloneServices(domElement, override, callback) {
    let services = new DynamicStandaloneServices(domElement, override);
    let simpleEditorModelResolverService = null;
    if (!services.has(ITextModelService)) {
        simpleEditorModelResolverService = new SimpleEditorModelResolverService(StaticServices.modelService.get());
        services.set(ITextModelService, simpleEditorModelResolverService);
    }
    if (!services.has(IOpenerService)) {
        services.set(IOpenerService, new OpenerService(services.get(ICodeEditorService), services.get(ICommandService)));
    }
    let result = callback(services);
    if (simpleEditorModelResolverService) {
        simpleEditorModelResolverService.setEditor(result);
    }
    return result;
}
/**
 * Compute dirty diff between two models
 * From: https://github.com/microsoft/vscode/blob/c15cb13a383dc9ff2dc0828152e374a6b9ecc2b3/src/vs/editor/common/services/editorSimpleWorker.ts
 */
export function computeDirtyDiff(originalUrl, modifiedUrl, ignoreTrimWhitespace) {
    return __awaiter(this, void 0, void 0, function* () {
        let original = getModel(URI.parse(originalUrl));
        let modified = getModel(URI.parse(modifiedUrl));
        if (!original || !modified) {
            return null;
        }
        let originalLines = original.getLinesContent();
        let modifiedLines = modified.getLinesContent();
        let diffComputer = new DiffComputer(originalLines, modifiedLines, {
            shouldComputeCharChanges: false,
            shouldPostProcessCharChanges: false,
            shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
            shouldMakePrettyDiff: true,
            maxComputationTime: 1000
        });
        return diffComputer.computeDiff().changes;
    });
}
/**
 * Create a new editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function create(domElement, options, override) {
    return withAllStandaloneServices(domElement, override || {}, (services) => {
        return new StandaloneEditor(domElement, options, services, services.get(IInstantiationService), services.get(ICodeEditorService), services.get(ICommandService), services.get(IContextKeyService), services.get(IKeybindingService), services.get(IContextViewService), services.get(IStandaloneThemeService), services.get(INotificationService), services.get(IConfigurationService), services.get(IAccessibilityService), services.get(IModelService), services.get(IModeService));
    });
}
/**
 * Emitted when an editor is created.
 * Creating a diff editor might cause this listener to be invoked with the two editors.
 * @event
 */
export function onDidCreateEditor(listener) {
    return StaticServices.codeEditorService.get().onCodeEditorAdd((editor) => {
        listener(editor);
    });
}
/**
 * Create a new diff editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function createDiffEditor(domElement, options, override) {
    return withAllStandaloneServices(domElement, override || {}, (services) => {
        return new StandaloneDiffEditor(domElement, options, services, services.get(IInstantiationService), services.get(IContextKeyService), services.get(IKeybindingService), services.get(IContextViewService), services.get(IEditorWorkerService), services.get(ICodeEditorService), services.get(IStandaloneThemeService), services.get(INotificationService), services.get(IConfigurationService), services.get(IContextMenuService), services.get(IEditorProgressService), services.get(IClipboardService));
    });
}
export function createDiffNavigator(diffEditor, opts) {
    return new DiffNavigator(diffEditor, opts);
}
/**
 * Create a new editor model.
 * You can specify the language that should be set for this model or let the language be inferred from the `uri`.
 */
export function createModel(value, language, uri) {
    return createTextModel(StaticServices.modelService.get(), StaticServices.modeService.get(), value, language, uri);
}
/**
 * Change the language for a model.
 */
export function setModelLanguage(model, languageId) {
    StaticServices.modelService.get().setMode(model, StaticServices.modeService.get().create(languageId));
}
/**
 * Set the markers for a model.
 */
export function setModelMarkers(model, owner, markers) {
    if (model) {
        StaticServices.markerService.get().changeOne(owner, model.uri, markers);
    }
}
/**
 * Get markers for owner and/or resource
 *
 * @returns list of markers
 */
export function getModelMarkers(filter) {
    return StaticServices.markerService.get().read(filter);
}
/**
 * Emitted when markers change for a model.
 * @event
 */
export function onDidChangeMarkers(listener) {
    return StaticServices.markerService.get().onMarkerChanged(listener);
}
/**
 * Get the model that has `uri` if it exists.
 */
export function getModel(uri) {
    return StaticServices.modelService.get().getModel(uri);
}
/**
 * Get all the created models.
 */
export function getModels() {
    return StaticServices.modelService.get().getModels();
}
/**
 * Emitted when a model is created.
 * @event
 */
export function onDidCreateModel(listener) {
    return StaticServices.modelService.get().onModelAdded(listener);
}
/**
 * Emitted right before a model is disposed.
 * @event
 */
export function onWillDisposeModel(listener) {
    return StaticServices.modelService.get().onModelRemoved(listener);
}
/**
 * Emitted when a different language is set to a model.
 * @event
 */
export function onDidChangeModelLanguage(listener) {
    return StaticServices.modelService.get().onModelModeChanged((e) => {
        listener({
            model: e.model,
            oldLanguage: e.oldModeId
        });
    });
}
/**
 * Create a new web worker that has model syncing capabilities built in.
 * Specify an AMD module to load that will `create` an object that will be proxied.
 */
export function createWebWorker(opts) {
    return actualCreateWebWorker(StaticServices.modelService.get(), opts);
}
/**
 * Colorize the contents of `domNode` using attribute `data-lang`.
 */
export function colorizeElement(domNode, options) {
    const themeService = StaticServices.standaloneThemeService.get();
    themeService.registerEditorContainer(domNode);
    return Colorizer.colorizeElement(themeService, StaticServices.modeService.get(), domNode, options);
}
/**
 * Colorize `text` using language `languageId`.
 */
export function colorize(text, languageId, options) {
    const themeService = StaticServices.standaloneThemeService.get();
    themeService.registerEditorContainer(document.body);
    return Colorizer.colorize(StaticServices.modeService.get(), text, languageId, options);
}
/**
 * Colorize a line in a model.
 */
export function colorizeModelLine(model, lineNumber, tabSize = 4) {
    const themeService = StaticServices.standaloneThemeService.get();
    themeService.registerEditorContainer(document.body);
    return Colorizer.colorizeModelLine(model, lineNumber, tabSize);
}
/**
 * @internal
 */
function getSafeTokenizationSupport(language) {
    let tokenizationSupport = modes.TokenizationRegistry.get(language);
    if (tokenizationSupport) {
        return tokenizationSupport;
    }
    return {
        getInitialState: () => NULL_STATE,
        tokenize: (line, hasEOL, state, deltaOffset) => nullTokenize(language, line, state, deltaOffset)
    };
}
/**
 * Tokenize `text` using language `languageId`
 */
export function tokenize(text, languageId) {
    let modeService = StaticServices.modeService.get();
    // Needed in order to get the mode registered for subsequent look-ups
    modeService.triggerMode(languageId);
    let tokenizationSupport = getSafeTokenizationSupport(languageId);
    let lines = splitLines(text);
    let result = [];
    let state = tokenizationSupport.getInitialState();
    for (let i = 0, len = lines.length; i < len; i++) {
        let line = lines[i];
        let tokenizationResult = tokenizationSupport.tokenize(line, true, state, 0);
        result[i] = tokenizationResult.tokens;
        state = tokenizationResult.endState;
    }
    return result;
}
/**
 * Define a new theme or update an existing theme.
 */
export function defineTheme(themeName, themeData) {
    StaticServices.standaloneThemeService.get().defineTheme(themeName, themeData);
}
/**
 * Switches to a theme.
 */
export function setTheme(themeName) {
    StaticServices.standaloneThemeService.get().setTheme(themeName);
}
/**
 * Clears all cached font measurements and triggers re-measurement.
 */
export function remeasureFonts() {
    clearAllFontInfos();
}
/**
 * Register a command.
 */
export function registerCommand(id, handler) {
    return CommandsRegistry.registerCommand({ id, handler });
}
/**
 * @internal
 */
export function createMonacoEditorAPI() {
    return {
        // methods
        create: create,
        onDidCreateEditor: onDidCreateEditor,
        createDiffEditor: createDiffEditor,
        createDiffNavigator: createDiffNavigator,
        computeDirtyDiff: computeDirtyDiff,
        createModel: createModel,
        setModelLanguage: setModelLanguage,
        setModelMarkers: setModelMarkers,
        getModelMarkers: getModelMarkers,
        onDidChangeMarkers: onDidChangeMarkers,
        getModels: getModels,
        getModel: getModel,
        onDidCreateModel: onDidCreateModel,
        onWillDisposeModel: onWillDisposeModel,
        onDidChangeModelLanguage: onDidChangeModelLanguage,
        createWebWorker: createWebWorker,
        colorizeElement: colorizeElement,
        colorize: colorize,
        colorizeModelLine: colorizeModelLine,
        tokenize: tokenize,
        defineTheme: defineTheme,
        setTheme: setTheme,
        remeasureFonts: remeasureFonts,
        registerCommand: registerCommand,
        // enums
        AccessibilitySupport: standaloneEnums.AccessibilitySupport,
        ContentWidgetPositionPreference: standaloneEnums.ContentWidgetPositionPreference,
        CursorChangeReason: standaloneEnums.CursorChangeReason,
        DefaultEndOfLine: standaloneEnums.DefaultEndOfLine,
        EditorAutoIndentStrategy: standaloneEnums.EditorAutoIndentStrategy,
        EditorOption: standaloneEnums.EditorOption,
        EndOfLinePreference: standaloneEnums.EndOfLinePreference,
        EndOfLineSequence: standaloneEnums.EndOfLineSequence,
        MinimapPosition: standaloneEnums.MinimapPosition,
        MouseTargetType: standaloneEnums.MouseTargetType,
        OverlayWidgetPositionPreference: standaloneEnums.OverlayWidgetPositionPreference,
        OverviewRulerLane: standaloneEnums.OverviewRulerLane,
        RenderLineNumbersType: standaloneEnums.RenderLineNumbersType,
        RenderMinimap: standaloneEnums.RenderMinimap,
        ScrollbarVisibility: standaloneEnums.ScrollbarVisibility,
        ScrollType: standaloneEnums.ScrollType,
        TextEditorCursorBlinkingStyle: standaloneEnums.TextEditorCursorBlinkingStyle,
        TextEditorCursorStyle: standaloneEnums.TextEditorCursorStyle,
        TrackedRangeStickiness: standaloneEnums.TrackedRangeStickiness,
        WrappingIndent: standaloneEnums.WrappingIndent,
        // classes
        ConfigurationChangedEvent: ConfigurationChangedEvent,
        BareFontInfo: BareFontInfo,
        FontInfo: FontInfo,
        TextModelResolvedOptions: TextModelResolvedOptions,
        FindMatch: FindMatch,
        // vars
        EditorType: EditorType,
        EditorOptions: EditorOptions
    };
}
