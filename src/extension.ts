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
    const state = this.loadData();
    webviewView.webview.postMessage({ type: 'init', value: state });
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
            const state = this.loadData();
            state.tabs[data.value.index].title = newTitle;
            await this.saveData(state);
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
    const state = this.loadData();

    // Use the bundled Monaco Editor files
    const monacoBase = webview.asWebviewUri(vscode.Uri.joinPath(
      this._extensionContext.extensionUri, 'node_modules', 'monaco-editor', 'min'
    ));

    return this._createHtmlContent(monacoBase.toString(), JSON.stringify(state));
  }

  private _createHtmlContent(monacoBase: string, data: string): string {
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
          align-items: center;
        }
        .tab {
          display: flex;
          align-items: center;
          padding: 5px 10px;
          cursor: pointer;
          border: 1px solid #3c3c3c;
          background-color: #2d2d2d;
          color: #cccccc;
        }
        .tab.active {
          background-color: #1e1e1e;
        }
        .tab-icon {
          margin-left: 5px;
          cursor: pointer;
        }
        #addTab {
          padding: 5px 10px;
          cursor: pointer;
          background-color: #2d2d2d;
          color: #cccccc;
        }
        #editor {
          width: 100%;
          height: calc(100% - 30px);
        }
      </style>
    </head>
    <body>
      <div id="tabs"></div>
      <div id="editor"></div>
      <script src="${monacoBase}/vs/loader.js"></script>
      <script>
        const vscode = acquireVsCodeApi();
        let editor;
        let { tabs, currentTabIndex } = ${data};
        if (!Array.isArray(tabs) || typeof currentTabIndex !== 'number') {
          tabs = [{ title: 'New Tab', content: '' }];
          currentTabIndex = 0;
        }

        function renderTabs() {
          const tabsContainer = document.getElementById('tabs');
          tabsContainer.innerHTML = tabs.map((tab, index) => 
            '<div class="tab ' + (index === currentTabIndex ? 'active' : '') + '" ' +
            'onclick="switchTab(' + index + ')">' + tab.title +
            '<span class="tab-icon" onclick="event.stopPropagation(); renameTab(' + index + ')">✏️</span>' +
            '<span class="tab-icon" onclick="event.stopPropagation(); closeTab(' + index + ')">❌</span>' +
            '</div>'
          ).join('') + '<div id="addTab" onclick="addTab()">+</div>';
        }

        function switchTab(index) {
          currentTabIndex = index;
          renderTabs();
          editor.setValue(tabs[currentTabIndex].content);
          updateState();
        }

        function updateState() {
          tabs[currentTabIndex].content = editor.getValue();
          vscode.postMessage({ type: 'update', value: { tabs, currentTabIndex } });
        }

        function addTab() {
          tabs.push({ title: 'New Tab', content: '' });
          switchTab(tabs.length - 1);
        }

        function renameTab(index) {
          vscode.postMessage({ 
            type: 'renameTab', 
            value: { index, currentTitle: tabs[index].title }
          });
        }

        function closeTab(index) {
          if (tabs.length > 1) {
            tabs.splice(index, 1);
            currentTabIndex = Math.min(currentTabIndex, tabs.length - 1);
            renderTabs();
            editor.setValue(tabs[currentTabIndex].content);
            updateState();
          } else {
            vscode.postMessage({ type: 'error', value: 'Cannot close the last tab' });
          }
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

          editor.onDidChangeModelContent(updateState);

          renderTabs();
        });
      </script>
    </body>
    </html>
  `;
  }

  private async saveData(state: { tabs: { title: string; content: string }[], currentTabIndex: number }): Promise<void> {
    await fs.promises.writeFile(this.storagePath, JSON.stringify(state), 'utf8');
  }

  private loadData(): { tabs: { title: string; content: string }[], currentTabIndex: number } {
    try {
      const data = fs.readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.tabs) && typeof parsed.currentTabIndex === 'number') {
        return parsed;
      }
      throw new Error('Invalid data structure');
    } catch (error) {
      return { tabs: [{ title: 'New Tab', content: '' }], currentTabIndex: 0 };
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScratchpadViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
  );
}

export function deactivate() { }