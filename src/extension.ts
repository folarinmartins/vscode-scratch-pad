import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadContent';

class ScratchpadViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scratchpad';

  private _view?: vscode.WebviewView;
  private storagePath: string;

  constructor(private readonly _extensionContext: vscode.ExtensionContext) {
    if (!_extensionContext.storagePath) {
      throw new Error('Storage path is not defined');
    }
    this.storagePath = path.join(_extensionContext.storagePath, 'scratchpadContent.txt');
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionContext.extensionUri,
        vscode.Uri.joinPath(this._extensionContext.extensionUri, 'node_modules', 'monaco-editor', 'min')
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data: { type: any; value: any; }) => {
      switch (data.type) {
        case 'update':
          this.saveData(data.value).catch(error => {
            console.error('Error saving data:', error);
            vscode.window.showErrorMessage('Error saving data: ' + error.message);
          });
          break;
      }
    });
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const initialContent = this.loadData();

    // Use the bundled Monaco Editor files
    const monacoBase = webview.asWebviewUri(vscode.Uri.joinPath(
      this._extensionContext.extensionUri, 'node_modules', 'monaco-editor', 'min'
    ));

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
                        overflow: hidden;
                    }
                    #editor {
                        width: 100%;
                        height: 100%;
                    }
                </style>
            </head>
            <body>
                <div id="editor"></div>
                <script src="${monacoBase}/vs/loader.js"></script>
                <script>
                    const vscode = acquireVsCodeApi();
                    let editor;

                    require.config({ paths: { vs: '${monacoBase}/vs' } });

                    require(['vs/editor/editor.main'], function() {
                        editor = monaco.editor.create(document.getElementById('editor'), {
                            value: ${JSON.stringify(initialContent)},
                            language: 'plaintext',
                            theme: 'vs-dark',
                            automaticLayout: true
                        });

                        editor.onDidChangeModelContent(() => {
                            vscode.postMessage({
                                type: 'update',
                                value: editor.getValue()
                            });
                        });
                    });
                </script>
            </body>
            </html>
        `;
  }

  private loadData(): string {
    return this._extensionContext.globalState.get(SCRATCHPAD_CONTENT_KEY, 'Welcome to Scratchpad for VS Code');
  }

  private async saveData(data: string): Promise<void> {
    await this._extensionContext.globalState.update(SCRATCHPAD_CONTENT_KEY, data);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScratchpadViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
  );
}

export function deactivate() { }