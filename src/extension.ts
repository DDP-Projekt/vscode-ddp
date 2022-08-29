'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';
import * as path from 'path';

let DDPPATH = process.env.DDPPATH;

export function activate(ctx: vscode.ExtensionContext) {
	console.log('ddp extension activated');

	let out = vscode.window.createOutputChannel("vscode-ddp", "ddp");
	ctx.subscriptions.push(out);

	if (DDPPATH === undefined || DDPPATH === "") {
		out.appendLine("DDPPATH not found\nThis might cause errors in some commands");
	}

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

	let langSrvDisposable = lspClient.start();
	ctx.subscriptions.push(langSrvDisposable);

	ctx.subscriptions.push(vscode.commands.registerCommand("ddp.languageserver.restart", async () => {
		out.appendLine("restarting DDPLS");
		await lspClient.stop();
		langSrvDisposable.dispose();
		langSrvDisposable = lspClient.start();
		ctx.subscriptions.push(langSrvDisposable);
	}));

	ctx.subscriptions.push(vscode.commands.registerCommand("ddp.run.file", async () => {
		let currentFile = vscode.window.activeTextEditor?.document.fileName;
		if (currentFile === undefined) { return; }
		if (path.extname(currentFile) !== '.ddp') {
			out.appendLine("file must be a .ddp file");
			return;
		}

		if (DDPPATH === undefined) {
			DDPPATH = "";
		}

		out.appendLine(currentFile);
		let exe = path.join(DDPPATH, 'kddp.exe').replace(new RegExp('\\' + path.sep, 'g'), '/');
		let filePath = currentFile.replace(new RegExp('\\' + path.sep, 'g'), '/');
		let command = exe + " run " + filePath;

		let terminal = vscode.window.activeTerminal;
		if (terminal === undefined) {
			terminal = vscode.window.createTerminal("ddp-run");
			ctx.subscriptions.push(terminal);
		}
		terminal.show();
		terminal.sendText(command);
	}));
}

export function deactivate() { }