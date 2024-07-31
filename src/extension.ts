import * as vscode from 'vscode';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadContent';

class ScratchpadViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'scratchpad';

    private _view?: vscode.WebviewView;
    private _content: string = '';
    private _saveTimeout: NodeJS.Timeout | null = null;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {
        this._content = this._extensionContext.globalState.get(SCRATCHPAD_CONTENT_KEY, '');
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
                vscode.Uri.joinPath(this._extensionContext.extensionUri, 'out')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'update':
                    this._content = data.value;
                    this._debouncedSave();
                    break;
            }
        });
    }

    private _debouncedSave() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this.saveContent();
        }, 1000); // Debounce for 1 second
    }

    public saveContent() {
        try {
            this._extensionContext.globalState.update(SCRATCHPAD_CONTENT_KEY, this._content);
            console.log('Scratchpad content saved successfully');
        } catch (error) {
            console.error('Error saving scratchpad content:', error);
            vscode.window.showErrorMessage('Failed to save scratchpad content. Please try again.');
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const monacoBase = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionContext.extensionUri, 'out', 'vs'
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
                <script src="${monacoBase}/loader.js"></script>
                <script>
                    const vscode = acquireVsCodeApi();
                    let editor;
                    let lastSavedContent = ${JSON.stringify(this._content)};

                    require.config({ paths: { vs: '${monacoBase}' } });

                    require(['vs/editor/editor.main'], function() {
                        editor = monaco.editor.create(document.getElementById('editor'), {
                            value: lastSavedContent,
                            language: 'plaintext',
                            theme: 'vs-dark',
                            automaticLayout: true
                        });

                        editor.onDidChangeModelContent(() => {
                            const currentContent = editor.getValue();
                            if (currentContent !== lastSavedContent) {
                                lastSavedContent = currentContent;
                                vscode.postMessage({
                                    type: 'update',
                                    value: currentContent
                                });
                            }
                        });

                        window.addEventListener('message', event => {
                            const message = event.data;
                            switch (message.type) {
                                case 'update':
                                    if (message.content !== editor.getValue()) {
                                        editor.setValue(message.content);
                                    }
                                    break;
                            }
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }
}

let scratchpadProvider: ScratchpadViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    scratchpadProvider = new ScratchpadViewProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, scratchpadProvider)
    );

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('scratchpad') && scratchpadProvider) {
                scratchpadProvider.saveContent(); // Force a save when configuration changes
            }
        })
    );
}

export function deactivate() {
    // Ensure any pending saves are completed
    if (scratchpadProvider) {
        scratchpadProvider.saveContent();
    }
}