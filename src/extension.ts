import * as vscode from 'vscode';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadContent';

class ScratchpadViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'scratchpad';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {}

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

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'update':
                    this._extensionContext.globalState.update(SCRATCHPAD_CONTENT_KEY, data.value);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const initialContent = this._extensionContext.globalState.get(SCRATCHPAD_CONTENT_KEY, '');
        const monacoScriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionContext.extensionUri, 'node_modules', 'monaco-editor', 'min', 'vs', 'loader.js'
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
                <script src="${monacoScriptUri}"></script>
                <script>
                    const vscode = acquireVsCodeApi();
                    let editor;

                    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.50.0/min/vs' } });

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
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new ScratchpadViewProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
    );
}

export function deactivate() {}
