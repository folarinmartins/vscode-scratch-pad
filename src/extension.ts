import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadTabs';

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

    webviewView.webview.onDidReceiveMessage(async (data: { type: string; value: any; }) => {
      switch (data.type) {
        case 'update':
          this.saveData(data.value).catch(error => {
            console.error('Error saving data:', error);
            vscode.window.showErrorMessage('Error saving data: ' + error.message);
          });
          break;
        case 'renameTab':
          const newTitle = await vscode.window.showInputBox({
            prompt: 'Enter new tab name',
            value: data.value.currentTitle
          });
          if (newTitle) {
            const tabs = this.loadData();
            tabs[data.value.index].title = newTitle;
            await this.saveData(tabs);
            webviewView.webview.postMessage({ type: 'tabRenamed', value: { index: data.value.index, newTitle } });
          }
          break;
        case 'error':
          vscode.window.showErrorMessage(data.value);
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
    const tabs = this.loadData();

    // Use the bundled Monaco Editor files
    const monacoBase = webview.asWebviewUri(vscode.Uri.joinPath(
      this._extensionContext.extensionUri, 'node_modules', 'monaco-editor', 'min'
    ));

    return this._createHtmlContent(monacoBase.toString(), JSON.stringify(tabs));
  }

  private _createHtmlContent(monacoBase: string, tabsJson: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Scratch pad</title>
      <style>
        body, html {
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        #tabs {
          display: flex;
          background-color: #252526;
        }
        .tab {
          padding: 5px 10px;
          cursor: pointer;
          border: 1px solid #3c3c3c;
          background-color: #2d2d2d;
          color: #cccccc;
        }
        .tab.active {
          background-color: #1e1e1e;
        }
        #editor {
          width: 100%;
          height: calc(100% - 30px);
        }
        #tabActions {
          display: flex;
          justify-content: flex-end;
          padding: 5px;
          background-color: #252526;
        }
        #tabActions button {
          margin-left: 5px;
        }
      </style>
    </head>
    <body>
      <div id="tabs"></div>
      <div id="tabActions">
        <button id="addTab">Add Tab</button>
        <button id="renameTab">Rename Tab</button>
        <button id="deleteTab">Delete Tab</button>
      </div>
      <div id="editor"></div>
      <script src="${monacoBase}/vs/loader.js"></script>
      <script>
        const vscode = acquireVsCodeApi();
        let editor;
        let tabs = ${tabsJson};
        let currentTabIndex = 0;

        function renderTabs() {
          const tabsContainer = document.getElementById('tabs');
          tabsContainer.innerHTML = tabs.map((tab, index) => 
            '<div class="tab ' + (index === currentTabIndex ? 'active' : '') + '" ' +
            'onclick="switchTab(' + index + ')">' + tab.title + '</div>'
          ).join('');
        }

        function switchTab(index) {
          currentTabIndex = index;
          renderTabs();
          editor.setValue(tabs[currentTabIndex].content);
        }

        function updateTab() {
          tabs[currentTabIndex].content = editor.getValue();
          vscode.postMessage({ type: 'update', value: tabs });
        }
          
        window.addEventListener('message', event => {
          const message = event.data;
          switch (message.type) {
            case 'tabRenamed':
              tabs[message.value.index].title = message.value.newTitle;
              renderTabs();
              break;
          }
        });

        require.config({ paths: { vs: '${monacoBase}/vs' } });

        require(['vs/editor/editor.main'], function() {
          editor = monaco.editor.create(document.getElementById('editor'), {
            value: tabs[currentTabIndex].content,
            language: 'plaintext',
            theme: 'vs-dark',
            automaticLayout: true
          });

          editor.onDidChangeModelContent(updateTab);

          renderTabs();

          document.getElementById('addTab').onclick = () => {
            tabs.push({ title: 'New Tab', content: '' });
            currentTabIndex = tabs.length - 1;
            renderTabs();
            editor.setValue('');
            updateTab();
          };

          document.getElementById('renameTab').onclick = () => {
            vscode.postMessage({ 
              type: 'renameTab', 
              value: { index: currentTabIndex, currentTitle: tabs[currentTabIndex].title }
            });
          };

          document.getElementById('deleteTab').onclick = () => {
            if (tabs.length > 1) {
              tabs.splice(currentTabIndex, 1);
              currentTabIndex = Math.max(0, currentTabIndex - 1);
              renderTabs();
              editor.setValue(tabs[currentTabIndex].content);
              updateTab();
            } else {
              vscode.postMessage({ type: 'error', value: 'Cannot delete the last tab' });
            }
          };
        });
      </script>
    </body>
    </html>
  `;
  }

  private loadData(): { title: string; content: string }[] {
    const savedData = this._extensionContext.globalState.get<{ title: string; content: string }[]>(SCRATCHPAD_CONTENT_KEY);
    if (savedData && savedData.length > 0) {
      return savedData;
    }
    // Backward compatibility: convert old data to new format
    const oldContent = this._extensionContext.globalState.get<string>(SCRATCHPAD_CONTENT_KEY, 'Welcome to Scratchpad for VS Code');
    return [{ title: 'Tab 1', content: oldContent }];
  }

  private async saveData(data: { title: string; content: string }[]): Promise<void> {
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