'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';

export let nodePickerMode = false;
export function register(ctx: vscode.ExtensionContext, lspClient: langsrv.LanguageClient) {
	// Register the tree data provider
	const treeDataProvider = new AstTreeDataProvider(lspClient);

	// Register the TreeView in the sidebar
	const view = vscode.window.createTreeView('ast-view-tree', { treeDataProvider: treeDataProvider });
	view.onDidChangeVisibility((e) => {
		treeDataProvider.viewVisible = e.visible;
		treeDataProvider.fetchAst();
	});

	// Listen for changes in the text editor's selection
	let prevSelectionEmpty = false;
	vscode.window.onDidChangeTextEditorSelection((e) => {
		if (prevSelectionEmpty && e.selections[0].isEmpty) { return; }

		prevSelectionEmpty = e.selections[0].isEmpty;
		treeDataProvider.fetchAstWithTimeout(100);
	});

	// Listen for document content changes
	vscode.workspace.onDidChangeTextDocument((e) => {
		if (e.document === vscode.window.activeTextEditor?.document) {
			treeDataProvider.fetchAstWithTimeout(300);
		}
	});

	// Listen for when a different file is opened
	vscode.window.onDidChangeActiveTextEditor(() => treeDataProvider.fetchAst());

	// view buttons
	ctx.subscriptions.push(vscode.commands.registerCommand('ddp.ast.refresh', () => treeDataProvider.fetchAst()));
	registerGoToNodeBtn(ctx);
	registerNodePickerBtn(ctx, treeDataProvider, view);
}

function registerGoToNodeBtn(ctx: vscode.ExtensionContext) {
	const highlightDecorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(255, 255, 0, 0.3)',
		borderRadius: '2px',
	});

	let highlightTimer: NodeJS.Timeout | null = null;
	ctx.subscriptions.push(vscode.commands.registerCommand('ddp.ast.goToNode', (x: TreeItem) => {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.selections = [new vscode.Selection(x.range.start, x.range.start)];
			editor.revealRange(x.range);
			
			// highlight node for 1s
			editor.setDecorations(highlightDecorationType, [x.range]);
			if (highlightTimer) {
				clearTimeout(highlightTimer);
			}
			highlightTimer = setTimeout(() => editor.setDecorations(highlightDecorationType, []), 1000);
		}
	}));
}

let oldDelay = 0;
function registerNodePickerBtn(ctx: vscode.ExtensionContext, treeDataProvider: AstTreeDataProvider, view: vscode.TreeView<TreeItem>) {
	const nodePickerOutline = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(0, 255, 200, 0.3)',
	});

	ctx.subscriptions.push(vscode.commands.registerCommand('ddp.ast.nodePicker', () => {
		vscode.window.activeTextEditor?.setDecorations(nodePickerOutline, []);
		nodePickerMode = !nodePickerMode;
		const configuration = vscode.workspace.getConfiguration()

		if (nodePickerMode) {
			// set hover.delay to 0 to make the picker fast
			oldDelay = configuration.get("editor.hover.delay") ?? 300
			configuration.update("editor.hover.delay", 0, vscode.ConfigurationTarget.Global)
		} else {
			// restore old delay setting
			configuration.update("editor.hover.delay", oldDelay, vscode.ConfigurationTarget.Global)
		}
	}));

	ctx.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file', language: 'ddp' }, {
		provideHover(document: vscode.TextDocument, position: vscode.Position) {
			const editor = vscode.window.activeTextEditor;
			if (!nodePickerMode) {
				return;
			}

			const node = treeDataProvider.findNode(position);

			if (!node) {
				editor?.setDecorations(nodePickerOutline, []);
			} else {
				editor?.setDecorations(nodePickerOutline, [node.range]);
				view.reveal(node);
			}

			return null;
		}
	}));
}

export class AstTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;
	
	private ast: TreeItem[];
	private lsp: langsrv.LanguageClient;
	public viewVisible: boolean;

	constructor(lsp: langsrv.LanguageClient) {
		this.ast = [];
		this.lsp = lsp;
		this.viewVisible = false;
	}

	private debounceTimeout: NodeJS.Timeout | null = null;
	public async fetchAstWithTimeout(ms: number) {
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		this.debounceTimeout = setTimeout(() => this.fetchAst(), ms);
	}

	public findNode(position: vscode.Position) : TreeItem | undefined {
		try {
			return this.findNodeInternal(this.ast, position);
		}
		catch (error) {
			vscode.window.showErrorMessage(`Error finding Node: ${error}`);
		}
	}
	
	private findNodeInternal(tree: TreeItem[], position: vscode.Position): TreeItem | undefined {
		for (const item of tree) {
			if (item.label !== "ImportStmt" && item.children) {
				const foundInChild = this.findNodeInternal(item.children, position);
				if (foundInChild) {
					return foundInChild;
				}
			}

			// Check if the position is within the range of this TreeItem
			if (item.range.start.line <= position.line && item.range.start.character <= position.character 
				&& item.range.end.line >= position.line && item.range.end.character >= position.character) {
				return item;
			}	
		}

		return undefined;  // Return undefined if no node is found at the position
	}

	// Fetch the AST from the LSP server
	public async fetchAst() {
		if (!this.viewVisible) {
			return;
		}

		const document = vscode.window.activeTextEditor?.document;
		const selection = vscode.window.activeTextEditor?.selection;

		if (!document || document.languageId !== "ddp") {
			return;
		}

		try {
			this.ast = await this.lsp.sendRequest('ast/getTree', {
				path: document.uri.toString(),
				range: selection?.isEmpty ? null : selection
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Error fetching AST: ${error}`);
		}
		
		this.refresh();
	}

	// Provide the tree's root items
	getTreeItem(element: TreeItem): vscode.TreeItem {
		if (element.iconId) {
			element.iconPath = new vscode.ThemeIcon(element.iconId);
			element.tooltip = `Start: [L:${element.range.start.line+1}, C: ${element.range.start.character+1}]\n`
			+ `End: [L:${element.range.end.line+1}, C: ${element.range.end.character+1}]`;
		}

		return element;
	}

	// Provide the children of a node
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		if (!element) {
			// Root items
			return Promise.resolve(this.ast);
		}

		if (!element.children) {
			return Promise.reject();
		}

		return Promise.resolve(element.children);
	}

	getParent(element: TreeItem): vscode.ProviderResult<TreeItem> {
		const findParent = (tree: TreeItem[], target: TreeItem): vscode.ProviderResult<TreeItem> => {
			for (const item of tree) {
				if (!item.children) {
					continue;
				}

				if (item.children.includes(target)) {
					return item; // Found the parent
				}

				// Recursively search in the children
				const foundParent = findParent(item.children, target);
				if (foundParent) {
					return foundParent;
				}
			}
			return null; // No parent found
		};

		return findParent(this.ast, element);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
}

class TreeItem extends vscode.TreeItem {
	children?: TreeItem[];
	iconId: string;
	range: vscode.Range;

	constructor(id: string, range: vscode.Range, iconId: string) {
		super(id);
		this.iconId = iconId;
		this.range = range;
	}
}