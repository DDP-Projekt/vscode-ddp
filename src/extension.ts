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

		let config = vscode.workspace.getConfiguration('ddp');
		if (config.has("DDPPATH")) {
			let ddppath = config.get("DDPPATH");
			if (ddppath !== "") {
				DDPPATH = config.get("DDPPATH");
			}
		}
		if (DDPPATH === undefined) {
			DDPPATH = "";
		}

		let exe = path.join(DDPPATH, 'kddp.exe').replace(new RegExp('\\' + path.sep, 'g'), '/');
		let filePath = currentFile.replace(new RegExp('\\' + path.sep, 'g'), '/');

		let gccFlags = "", externGccFlags = "";
		if (config.has("run.gccFlags")) {
			let flags = config.get<string>("run.gccFlags");
			if (flags !== undefined) {
				gccFlags = flags;
			}
		}
		if (config.has("run.externGccFlags")) {
			let flags = config.get<string>("run.externGccFlags");
			if (flags !== undefined) {
				externGccFlags = flags;
			}
		}

		let command = exe + ' run ' + filePath + ' --gcc_flags="' + gccFlags + '" --extern_gcc_flags="' + externGccFlags + '"';

		if (config.has("run.verbose")) {
			let verbose = config.get<boolean>("run.verbose");
			if (verbose !== undefined && verbose) {
				command += ' --verbose';
			}
		}

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