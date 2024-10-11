import * as vscode from 'vscode';
// import * as path from 'path';
// import * as fs from 'fs';

const SCRATCHPAD_CONTENT_KEY = 'scratchpadTabs';

class ScratchpadViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'scratchpad';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionContext: vscode.ExtensionContext) {
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
        case 'confirmCloseTab':
          const result = await vscode.window.showWarningMessage(
            `Are you sure you want to close the tab "${data.value.title}"?`,
            { modal: true },
            'Yes',
            'No'
          );
          if (result === 'Yes') {
            webviewView.webview.postMessage({ type: 'closeTabConfirmed', value: data.value.index });
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
        .tab-title {
          cursor: pointer;
          flex-grow: 1;
          padding-right: 5px;
        }
        .tab-title:hover {
          text-decoration: underline;
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
          
        .rename-input {
          background: transparent;
          border: none;
          color: inherit;
          font-size: inherit;
          font-family: inherit;
          padding: 0;
          width: 100%;
        }
        .rename-input:focus {
          outline: none;
          border-bottom: 1px solid #007acc;
        }
          
        .close-icon {
    width: 10px;  /* Reduced from 14px */
    height: 10px; /* Reduced from 14px */
    position: relative;
    cursor: pointer;
    display: inline-block;
    margin-left: 5px;
  }
  .close-icon::before,
  .close-icon::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 1px;  /* Reduced from 2px for a thinner line */
    background-color: #cccccc;
    top: 50%;
    left: 0;
  }
  .close-icon::before {
    transform: rotate(45deg);
  }
  .close-icon::after {
    transform: rotate(-45deg);
  }
  .close-icon:hover::before,
  .close-icon:hover::after {
    background-color: #ffffff;
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
            'onclick="switchTab(' + index + ')">' +
            '<span class="tab-title" ondblclick="startRename(' + index + ')">' + tab.title + '</span>' +
            '<span class="tab-icon close-icon" onclick="event.stopPropagation(); closeTab(' + index + ')"></span>' +
            '</div>'
          ).join('') + '<div id="addTab" onclick="addTab()">+</div>';
        }
        function startRename(index) {
          const tabTitle = document.querySelector('.tab:nth-child(' + (index + 1) + ') .tab-title');
          const currentTitle = tabs[index].title;
          tabTitle.innerHTML = '<input type="text" class="rename-input" value="' + currentTitle.replace(/"/g, '&quot;') + '" />';
          const input = tabTitle.querySelector('input');
          input.focus();
          input.select();
          input.addEventListener('blur', function() { finishRename(index, input.value); });
          input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              input.blur();
            }
          });
        }
        function finishRename(index, newTitle) {
          if (newTitle && newTitle !== tabs[index].title) {
            tabs[index].title = newTitle;
            renderTabs();
            updateState();
          } else {
            renderTabs();
          }
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

        function closeTab(index) {
          if (tabs.length > 1) {
            vscode.postMessage({ 
              type: 'confirmCloseTab', 
              value: { index, title: tabs[index].title }
            });
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
            case 'closeTabConfirmed':
              const index = message.value;
              tabs.splice(index, 1);
              currentTabIndex = Math.min(currentTabIndex, tabs.length - 1);
              renderTabs();
              editor.setValue(tabs[currentTabIndex].content);
              updateState();
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
    await this._extensionContext.globalState.update(SCRATCHPAD_CONTENT_KEY, state);
  }

  private loadData(): { tabs: { title: string; content: string }[], currentTabIndex: number } {
    const data = this._extensionContext.globalState.get<{ tabs: { title: string; content: string }[], currentTabIndex: number }>(SCRATCHPAD_CONTENT_KEY);
    if (data && Array.isArray(data.tabs) && typeof data.currentTabIndex === 'number') {
      return data;
    }
    return { tabs: [{ title: 'New Tab', content: '' }], currentTabIndex: 0 };
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ScratchpadViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ScratchpadViewProvider.viewType, provider)
  );
}

export function deactivate() { }