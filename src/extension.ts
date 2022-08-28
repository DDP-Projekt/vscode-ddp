'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';

export function activate(ctx: vscode.ExtensionContext) {
	console.log('ddp extension activated');

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

	console.log("starting DDPLS");
	let langSrvDisposable = lspClient.start();
	ctx.subscriptions.push(langSrvDisposable);

	ctx.subscriptions.push(vscode.commands.registerCommand("ddp.languageserver.restart", async () => {
		console.log("restarting DDPLS");
		await lspClient.stop();
		langSrvDisposable.dispose();
		langSrvDisposable = lspClient.start();
		ctx.subscriptions.push(langSrvDisposable);
	}));
}

export function deactivate() { }