// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';



class ScratchpadViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'scratchpad';

	private _view?: vscode.WebviewView;
	private _scratchpadFile: string;

	constructor(private readonly _extensionUri: vscode.Uri) {
			this._scratchpadFile = path.join(_extensionUri.fsPath, 'scratchpad.txt');
	}

	public resolveWebviewView(
			webviewView: vscode.WebviewView,
			context: vscode.WebviewViewResolveContext,
			_token: vscode.CancellationToken,
	) {
			this._view = webviewView;

			webviewView.webview.options = {
					enableScripts: true,
					localResourceRoots: [this._extensionUri]
			};

			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

			webviewView.webview.onDidReceiveMessage(data => {
					switch (data.type) {
							case 'update':
									fs.writeFileSync(this._scratchpadFile, data.value);
									break;
					}
			});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
			const initialContent = fs.existsSync(this._scratchpadFile) 
					? fs.readFileSync(this._scratchpadFile, 'utf8') 
					: '';

			return `
					<!DOCTYPE html>
					<html lang="en">
					<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<title>Scratchpad</title>
							<style>
									body, html {
											height: 100%;
											margin: 0;
											padding: 0;
									}
									#scratchpad {
											width: 100%;
											height: 100%;
											border: none;
											resize: none;
											padding: 10px;
											box-sizing: border-box;
											font-family: var(--vscode-editor-font-family);
											font-size: var(--vscode-editor-font-size);
											background-color: var(--vscode-editor-background);
											color: var(--vscode-editor-foreground);
									}
							</style>
					</head>
					<body>
							<textarea id="scratchpad">${initialContent}</textarea>
							<script>
									const vscode = acquireVsCodeApi();
									const scratchpad = document.getElementById('scratchpad');
									
									scratchpad.addEventListener('input', () => {
											vscode.postMessage({
													type: 'update',
													value: scratchpad.value
											});
									});
							</script>
					</body>
					</html>
			`;
	}
}



export function activate(context: vscode.ExtensionContext) {
	const provider = new ScratchpadViewProvider(context.extensionUri);
	
	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('scratch-pad.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Scratch Pad!');
	});
	
	context.subscriptions.push(disposable);
	context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
