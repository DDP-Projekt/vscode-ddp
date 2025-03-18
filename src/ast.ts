'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';

export function register(ctx: vscode.ExtensionContext, lspClient: langsrv.LanguageClient) {
	// Register the tree data provider
	const treeDataProvider = new AstTreeDataProvider(lspClient);

	// Register the TreeView in the sidebar
	const view = vscode.window.createTreeView('ast-view-tree', {
		treeDataProvider: treeDataProvider
	});

	let prevSelectionEmpty = false
	// Listen for changes in the text editor's selection
	vscode.window.onDidChangeTextEditorSelection((e) => {
		if (!view.visible) return
		if (prevSelectionEmpty && e.selections[0].isEmpty) return

		prevSelectionEmpty = e.selections[0].isEmpty
		treeDataProvider.fetchAstWithTimeout(100)
	});

	// Listen for document content changes
	vscode.workspace.onDidChangeTextDocument((e) => {
		if (e.document === vscode.window.activeTextEditor?.document && view.visible) {
			treeDataProvider.fetchAstWithTimeout(300)
		}
	});

	vscode.window.onDidChangeActiveTextEditor((e) => {
		if (view.visible) {
			treeDataProvider.fetchAst();
		}
	})

	view.onDidChangeVisibility((e) => {
		if (e.visible) {
			treeDataProvider.fetchAst();
		}
	})

	ctx.subscriptions.push(vscode.commands.registerCommand('ddp.ast.refresh', () => {
		treeDataProvider.fetchAst();
	}))

	ctx.subscriptions.push(vscode.commands.registerCommand('ddp.ast.goToNode', async (x: TreeItem) => {
		let editor = vscode.window.activeTextEditor
		if (editor) {
			editor.selections = [new vscode.Selection(x.range.start, x.range.start)]
		}
	}))

}

export class AstTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;
	
	private ast: TreeItem[];
	private lsp: langsrv.LanguageClient

	constructor(lsp: langsrv.LanguageClient) {
		this.ast = []
		this.lsp = lsp
	}

	private debounceTimeout: NodeJS.Timeout | null = null
	public async fetchAstWithTimeout(ms: number) {
		if (this.debounceTimeout) {
			clearTimeout(this.debounceTimeout);
		}

		this.debounceTimeout = setTimeout(() => {
			this.fetchAst();
		}, ms)
	}

	// Fetch the AST from the LSP server
	public async fetchAst() {
		const document = vscode.window.activeTextEditor?.document;
		const selection = vscode.window.activeTextEditor?.selection;

		if (document) {
			try {
				const response: TreeItem[] = await this.lsp.sendRequest('custom/ast', {
					path: document.uri.toString(),
					range: selection?.isEmpty ? null : selection
				});

				this.ast = response
				console.log(response)
				this.refresh()
			} catch (error) {
				vscode.window.showErrorMessage(`Error fetching AST: ${error}`);
			}
		}
	}

	// Provide the tree's root items
	getTreeItem(element: TreeItem): vscode.TreeItem {
		element.iconPath = element.iconId ? new vscode.ThemeIcon(element.iconId) : undefined
		element.tooltip = `Start: [L:${element.range.start.line+1}, C: ${element.range.start.character+1}]\n`
			+ `End: [L:${element.range.end.line+1}, C: ${element.range.end.character+1}]`

		return element;
	}

	// Provide the children of a node
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		if (!element) {
			// Root items
			return Promise.resolve(this.ast);
		}

		if (!element.children) {
			return Promise.reject()
		}

		return Promise.resolve(element.children);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}
}

class TreeItem extends vscode.TreeItem {
	children?: TreeItem[]
	iconId: string
	range: vscode.Range

	constructor(id: string, range: vscode.Range, iconId: string) {
		super(id);
		this.iconId = iconId
		this.range = range
	}
}