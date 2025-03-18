'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';

export class AstTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined> = new vscode.EventEmitter<TreeItem | undefined>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined> = this._onDidChangeTreeData.event;
	private ast: TreeItem[]; // Store AST from LSP
	private lsp: langsrv.LanguageClient

	constructor(lsp: langsrv.LanguageClient) {
		this.ast = []
		this.lsp = lsp
	}

	// Fetch the AST from the LSP server
	public async fetchAST() {
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

		return element;
	}

	// Provide the children of a node
	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		if (!element) {
			// Root items
			return Promise.resolve(this.ast);
		}
		// Child nodes (can be expanded based on your data structure)
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
	
	constructor(id: string, iconId: string) {
		super(id);
		this.iconId = iconId
	}
}