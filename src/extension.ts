'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

let DDPPATH = process.env.DDPPATH;

export function activate(ctx: vscode.ExtensionContext) {
	console.log('ddp extension activated');

	let out = vscode.window.createOutputChannel("vscode-ddp", "ddp");
	ctx.subscriptions.push(out);

	if (DDPPATH === undefined || DDPPATH === "") {
		out.appendLine("DDPPATH not found\nThis might cause errors in some commands");
	}

	let config = vscode.workspace.getConfiguration('ddp');

	let commandName = "DDPLS";
	{
		let ddplsPath = ctx.asAbsolutePath(path.join('bin', os.platform() === 'win32' ? 'DDPLS.exe' : 'DDPLS'));
		out.appendLine("bundled ddplsPath: " + ddplsPath);
		if (fs.existsSync(ddplsPath)) {
			out.appendLine("using bundled DDPLS");
			out.appendLine(ddplsPath);
			commandName = ddplsPath;
		}
	}
	{
		let ddplsPath = config.get<string>("DDPLS.path");
		if (ddplsPath !== "" && ddplsPath !== undefined) {
			out.appendLine("using custom DDPLS path");
			commandName = ddplsPath;
		}
	}

	let lsArgs = config.get<string[]>("DDPLS.flags");
	// DDPLS must be installed and in the PATH
	let serverOptions: langsrv.ServerOptions = {
		run: { command: commandName, args: lsArgs },
		debug: { command: commandName, args: lsArgs }
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

	ctx.subscriptions.push(vscode.commands.registerCommand("ddp.languageserver.stop", async () => {
		out.appendLine("stopping DDPLS");
		await lspClient.stop();
		langSrvDisposable.dispose();
	}));

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

		let DDPPATH = process.env.DDPPATH === undefined ? "" : process.env.DDPPATH;
		if (config.has("DDPPATH")) {
			let ddppath = config.get<string>("DDPPATH");
			if (ddppath !== "" && ddppath !== undefined) {
				DDPPATH = ddppath;
			}
		}

		let exe = path.join(DDPPATH, 'bin', os.platform() === 'win32' ? 'kddp.exe' : 'kddp').replace(new RegExp('\\' + path.sep, 'g'), '/');
		let filePath = currentFile.replace(new RegExp('\\' + path.sep, 'g'), '/');

		let command = exe + ' starte ' + filePath;

		if (config.has("run.args")) {
			let args = config.get<string[]>("run.args");
			if (args !== undefined) {
				command += ' ' + args.join(' ');
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