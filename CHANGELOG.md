<!-- @format -->

# Change Log

All notable changes to the "scratch-pad" extension will be documented in this file.

## [Unreleased]

-   [Planned] Add drag-and-drop functionality to reorder tabs
-   [Planned] Implement tab groups or categories for better organization
-   [Planned] Add search functionality across all tabs
-   [Planned] Introduce syntax highlighting for common programming languages
-   [Planned] Add option to export all tabs as a single document

## [1.7.0] - 2024-10-11

-   [Added] Enabled syncing across devices using globalState.setKeysForSync
-   [Changed] Scratchpad content now syncs with VS Code's Settings Sync feature

## [1.6.1] - 2024-10-11

-   [Added] Cross-workspace data persistence using globalState
-   [Changed] Switched from file-based storage to VS Code's globalState for data persistence

## [1.5.0] - 2024-10-11

-   [Added] Multiple tabs functionality
-   [Added] Ability to add and close tabs
-   [Added] Double-click to rename tabs in-place
-   [Added] Confirmation dialog before closing tabs
-   [Changed] Replaced edit icon with double-click functionality for renaming
-   [Changed] Improved close icon design and size

// ... rest of the changelog ...

## [1.4.3] - 2024-10-09

-   [Changed] Changed tab title to "scratch pad"

## [1.4.2] - 2024-10-09

-   [Added] Restored globalState to sync content on all connected devices

## [1.4.1] - 2024-10-09

-   [Fixed] Bug: State not properly saving
-   [Removed] Global sync to content on all connected devices

## [1.3.8] - 2024-08-13

-   [Changed] Updated changelog and readme

## [1.3.7] - 2024-08-13

-   [Added] CHANGELOG.md to track changes

## [1.3.2-6] - 2024-07-24

-   [Fixed] Bug fixes and performance improvements
-   [Added] product (publisher) icon

## [1.3.0] - 2024-07-21

-   [Changed] Upgraded scratchpad to fully featured editor to support advanced features

## [1.2.0] - 2024-07-19

-   [Changed] Moved persistent mechanism from local file to globalUpdate to take advantage of Setting Sync

## [1.0.0] - 2024-07-18

-   [Added] Initial release of Scratch Pad
-   [Added] Persistent scratchpad in the panel area
-   [Added] Auto-save functionality
-   [Added] Theme-matching appearance
