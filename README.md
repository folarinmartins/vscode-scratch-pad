<!-- @format -->

# Scratch Pad for VS Code

Scratch Pad is a simple, yet powerful extension for Visual Studio Code that provides a convenient space for quick notes, code snippets, and temporary text alongside your workspace.

This came from a need I'd had for a long time - opened a feature request on VS Code ([VS Code issue](https://github.com/Microsoft/vscode/issues/58774)) but it wasn't approved, so I went ahead to create one.

## Features

-   **Persistent Scratchpad**: A dedicated space for notes that persists between VS Code sessions.
-   **Multiple Tabs**: Create and manage multiple scratchpads for better organization.
-   **Cross-Device Sync**: Your scratchpad content syncs across devices using VS Code's Settings Sync.
-   **Cross-Workspace Persistence**: Access your scratchpad content across different workspaces.
-   **Convenient Location**: Sits right next to your terminal for easy access.
-   **Auto-save**: Your notes are automatically saved as you type.
-   **Theme-matched**: Automatically matches your VS Code theme for a seamless look.

![Scratch Pad in action](images/scratchpad.png)

## Requirements

This extension requires Visual Studio Code version 1.60.0 or higher.

## Installation

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS) to open the Quick Open dialog
3. Type `ext install scratch-pad` and press Enter
4. Restart VS Code

## Usage

1. Click on the Scratch Pad icon in the panel area (where Terminal and Output views are located)
2. Start typing your notes or pasting your snippets
3. Your content is automatically saved
4. To add a new tab, click the '+' button
5. To rename a tab, double-click on its name
6. To close a tab, click the 'x' button (you'll be prompted for confirmation)

## Extension Settings

This extension contributes the following settings:

-   `scratchPad.fontSize`: Set the font size for the scratch pad (default: matches editor font size)
-   `scratchPad.fontFamily`: Set the font family for the scratch pad (default: matches editor font family)

## Known Issues

-   None currently reported

## Roadmap

Future plans for Scratch Pad include:

-   [ ] Drag-and-drop functionality to reorder tabs
-   [ ] Tab groups or categories for better organization
-   [ ] Search functionality across all tabs
-   [ ] Syntax highlighting for common programming languages
-   [ ] Option to export all tabs as a single document
-   [ ] Markdown support
-   [ ] Code snippet formatting
-   [ ] Manage Secrets
-   [ ] Named Snippets
-   [ ] Labels and tags

## Contributing

If you have suggestions for improvements or bug fixes, please feel free to contribute! Here's how:

1. Fork the repository
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create a new Pull Request

Before submitting your pull request, please make sure your changes are consistent with the project's coding style and that all tests pass.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any suggestions for improvements, please [open an issue](https://github.com/folarinmartins/vscode-scratch-pad/issues) on our GitHub repository.

---

**Enjoy your new Scratch Pad!**
