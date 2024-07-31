import * as vscode from 'vscode';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadContent';

class ScratchpadViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'scratchpad';

    private _view?: vscode.WebviewView;
    private _content: string = '';
    private _saveTimeout: NodeJS.Timeout | null = null;

    constructor(private readonly _extensionContext: vscode.ExtensionContext) {
        this._content = this._extensionContext.globalState.get(SCRATCHPAD_CONTENT_KEY, '');
        console.log('ScratchpadViewProvider constructed');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Resolving webview view');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionContext.extensionUri,
                vscode.Uri.joinPath(this._extensionContext.extensionUri, 'out')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('Webview HTML set');

        webviewView.webview.onDidReceiveMessage(data => {
            console.log('Received message from webview:', data);
            switch (data.type) {
                case 'update':
                    this._content = data.value;
                    this._debouncedSave();
                    break;
                case 'error':
                    console.error('Error in webview:', data.value);
                    vscode.window.showErrorMessage(`Scratchpad error: ${data.value}`);
                    break;
                case 'log':
                    console.log('Webview log:', data.value);
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

        console.log('Monaco base URI:', monacoBase.toString());

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
                    #fallback {
                        display: none;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                    }
                </style>
            </head>
            <body>
                <div id="editor"></div>
                <div id="fallback">
                    <h2>Scratchpad</h2>
                    <p>If you're seeing this message, the Monaco editor failed to load.</p>
                    <p>Please check the developer console for error messages.</p>
                </div>
                <script src="${monacoBase}/loader.js"></script>
                <script>
                    const vscode = acquireVsCodeApi();
                    let editor;
                    let lastSavedContent = ${JSON.stringify(this._content)};

                    function postLog(message) {
                        vscode.postMessage({ type: 'log', value: message });
                    }

                    postLog('Script started');

                    require.config({ paths: { vs: '${monacoBase}' } });

                    require(['vs/editor/editor.main'], function() {
                        postLog('Monaco editor loaded');
                        try {
                            editor = monaco.editor.create(document.getElementById('editor'), {
                                value: lastSavedContent,
                                language: 'plaintext',
                                theme: 'vs-dark',
                                automaticLayout: true
                            });
                            postLog('Monaco editor created');

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
                        } catch (error) {
                            postLog('Error initializing Monaco editor: ' + error.toString());
                            vscode.postMessage({
                                type: 'error',
                                value: 'Failed to initialize editor: ' + error.toString()
                            });
                            document.getElementById('fallback').style.display = 'block';
                        }
                    }, function(error) {
                        postLog('Failed to load Monaco editor: ' + error.toString());
                        vscode.postMessage({
                            type: 'error',
                            value: 'Failed to load Monaco editor: ' + error.toString()
                        });
                        document.getElementById('fallback').style.display = 'block';
                    });
                </script>
            </body>
            </html>
        `;
    }
}

let scratchpadProvider: ScratchpadViewProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Scratchpad extension is being activated');

    try {
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

        console.log('Scratchpad extension activated successfully');
    } catch (error) {
        console.error('Error activating Scratchpad extension:', error);
        vscode.window.showErrorMessage('Failed to activate Scratchpad extension. Please check the logs and reload the window.');
    }
}

export function deactivate() {
    // Ensure any pending saves are completed
    if (scratchpadProvider) {
        scratchpadProvider.saveContent();
    }
}