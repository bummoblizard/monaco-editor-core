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
import * as dom from '../../../base/browser/dom';
import { Action, Separator } from '../../../base/common/actions';
import { CancellationToken } from '../../../base/common/cancellation';
import { EditorExtensionsRegistry } from '../../browser/editorExtensions';
import { Range } from '../../common/core/range';
import { ITextModelService } from '../../common/services/resolverService';
import { DefinitionAction, SymbolNavigationAction, SymbolNavigationAnchor } from '../gotoSymbol/goToCommands';
import { PeekContext } from '../peekView/peekView';
import { isIMenuItem, MenuId, MenuRegistry } from '../../../platform/actions/common/actions';
import { ICommandService } from '../../../platform/commands/common/commands';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation';
export function showGoToContextMenu(accessor, editor, anchor, part) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const resolverService = accessor.get(ITextModelService);
        const contextMenuService = accessor.get(IContextMenuService);
        const commandService = accessor.get(ICommandService);
        const instaService = accessor.get(IInstantiationService);
        yield part.item.resolve(CancellationToken.None);
        if (!part.part.location) {
            return;
        }
        const location = part.part.location;
        const menuActions = [];
        // from all registered (not active) context menu actions select those
        // that are a symbol navigation action
        const filter = new Set(MenuRegistry.getMenuItems(MenuId.EditorContext)
            .map(item => isIMenuItem(item) ? item.command.id : ''));
        for (const delegate of EditorExtensionsRegistry.getEditorActions()) {
            if (delegate instanceof SymbolNavigationAction && filter.has(delegate.id)) {
                menuActions.push(new Action(delegate.id, delegate.label, undefined, true, () => __awaiter(this, void 0, void 0, function* () {
                    const ref = yield resolverService.createModelReference(location.uri);
                    try {
                        yield instaService.invokeFunction(delegate.run.bind(delegate), editor, new SymbolNavigationAnchor(ref.object.textEditorModel, Range.getStartPosition(location.range)));
                    }
                    finally {
                        ref.dispose();
                    }
                })));
            }
        }
        if (part.part.command) {
            const { command } = part.part;
            menuActions.push(new Separator());
            menuActions.push(new Action(command.id, command.title, undefined, true, () => {
                var _a;
                commandService.executeCommand(command.id, ...((_a = command.arguments) !== null && _a !== void 0 ? _a : []));
            }));
        }
        // show context menu
        const useShadowDOM = editor.getOption(115 /* useShadowDOM */);
        contextMenuService.showContextMenu({
            domForShadowRoot: useShadowDOM ? (_a = editor.getDomNode()) !== null && _a !== void 0 ? _a : undefined : undefined,
            getAnchor: () => {
                const box = dom.getDomNodePagePosition(anchor);
                return { x: box.left, y: box.top + box.height + 8 };
            },
            getActions: () => menuActions,
            onHide: () => {
                editor.focus();
            },
            autoSelectFirstItem: true,
        });
    });
}
export function goToDefinitionWithLocation(accessor, event, editor, location) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolverService = accessor.get(ITextModelService);
        const ref = yield resolverService.createModelReference(location.uri);
        yield editor.invokeWithinContext((accessor) => __awaiter(this, void 0, void 0, function* () {
            const openToSide = event.hasSideBySideModifier;
            const contextKeyService = accessor.get(IContextKeyService);
            const isInPeek = PeekContext.inPeekEditor.getValue(contextKeyService);
            const canPeek = !openToSide && editor.getOption(78 /* definitionLinkOpensInPeek */) && !isInPeek;
            const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { alias: '', label: '', id: '', precondition: undefined });
            return action.run(accessor, editor, { model: ref.object.textEditorModel, position: Range.getStartPosition(location.range) });
        }));
        ref.dispose();
    });
}
