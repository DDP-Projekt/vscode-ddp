'use strict';

import * as vscode from 'vscode';
import * as langsrv from 'vscode-languageclient/node';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { lookpath } from 'lookpath';
import { AstTreeDataProvider } from './ast'

let DDPPATH = process.env.DDPPATH;

export async function activate(ctx: vscode.ExtensionContext) {
	console.log('ddp extension activated');

	let out = vscode.window.createOutputChannel("vscode-ddp", "ddp");
	ctx.subscriptions.push(out);

	if (DDPPATH === undefined || DDPPATH === "") {
		out.appendLine("DDPPATH not found\nThis might cause errors in some commands");
	}

	let config = vscode.workspace.getConfiguration('ddp');

	let ddplsCommand = os.platform() === 'win32' ? 'DDPLS.exe' : 'DDPLS';
	{
		let ddplsPath = ctx.asAbsolutePath(path.join('bin', ddplsCommand));
		if (fs.existsSync(ddplsPath)) {
			out.appendLine("found bundled DDPLS: " + ddplsPath);
			ddplsCommand = ddplsPath;
		}
	}
	{
		let useSystemLs = config.get<boolean>("DDPLS.useSystemwideInstall");
		if (useSystemLs === true) {
			let ddplsPath = await lookpath('DDPLS');
			if (ddplsPath !== undefined) {
				out.appendLine("using system-wide DDPLS: " + ddplsPath);
				ddplsCommand = ddplsPath;
			} else {
				out.appendLine("no system-wide DDPLS found, falling back to bundled DDPLS");
			}
		}
	}
	{
		let ddplsPath = config.get<string>("DDPLS.path");
		if (ddplsPath !== "" && ddplsPath !== undefined) {
			out.appendLine("using custom DDPLS path: " + ddplsPath);
			ddplsCommand = ddplsPath;
		}
	}

	let lsArgs = config.get<string[]>("DDPLS.flags");
	// DDPLS must be installed and in the PATH
	let serverOptions: langsrv.ServerOptions = {
		run: { command: ddplsCommand, args: lsArgs },
		debug: { command: ddplsCommand, args: lsArgs }
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
	
	let showCommand = vscode.commands.registerCommand('ddp.showAST', () => {
		// Register the tree data provider
		const treeDataProvider = new AstTreeDataProvider(lspClient);

		// Register the TreeView in the sidebar
		vscode.window.createTreeView('simpleTreeView', {
			treeDataProvider: treeDataProvider
		});
	});

	ctx.subscriptions.push(showCommand);
}

export function deactivate() { }