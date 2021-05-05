# vscode-parsons README

This is the README for the extension "vscode-parsons", a Visual Studio Code extension for creating and solving parsons problems within Visual Studio Code.

## Usage

To run the extension from this repository follow these steps:

* Clone this repository
* Open the repository in Visual Studio Code
* Run `npm install` in the terminal
* Press `F5` to run the extension in a new window
* In the new window open the folder 'Example workspace' from this repository

## Features

### Solving Parsons problems
* 'Parson Explorer' view in the 'Explorer' tab that displays all tasks in the current workspace
* Custom editor for `.parson` files that displays code snippets in a tab on the right and gaps in which to place them in the code

### Creating Parsons problems
* Commands to create Parsons problems that can be accessed from the Command Palette (ctrl+shift+P)
    * 'Create Parsons Problem from file' converts the currently open file into a folder which contains the file plus all setup files for a Parsons problem
    * 'Create Parsons Problem from folder' converts the folder which contains the currently open file into a folder for a Parsons problem by creating missing setup files or updating existing ones based on all code files in the folder
    * 'Export Parsons Problem to file' compiles the folder which contains the currently open file into `.parson` and `.parsondef` files and saves them to the locations specified in `parsonconfig.json`