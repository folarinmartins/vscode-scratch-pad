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
            localResourceRoots: [this._extensionContext.extensionUri]
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

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Scribble</title>
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
    const provider = new ScratchpadViewProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
    );
}

export function deactivate() {}
