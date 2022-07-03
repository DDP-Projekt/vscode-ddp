import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';

export function activate(context: vscode.ExtensionContext) {
	console.log('activated');

	// DDPLS must be installed and in the PATH
	let serverOptions: langsrv.ServerOptions = {
		run: { command: "DDPLS" },
		debug: { command: "DDPLS" }
	};

	let clientOptions: langsrv.LanguageClientOptions = {
		documentSelector: [ // not sure if this is needed, but it works
			{
				pattern: '**/*.ddp',
			}
		]
	};

	let lspClient = new langsrv.LanguageClient("ddpls", "DDPLS", serverOptions, clientOptions);

	lspClient.start();
}

export function deactivate() {}