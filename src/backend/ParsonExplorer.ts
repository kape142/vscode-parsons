import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class ParsonExplorer implements vscode.TreeDataProvider<ExerciseFile>{
    private readonly fileList: string[];
    constructor(fileList: string[]){
        this.fileList = fileList;
    }
    onDidChangeTreeData?: vscode.Event<void | ExerciseFile | null | undefined> | undefined;

    getTreeItem(element: ExerciseFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }
    getChildren(element?: ExerciseFile): ExerciseFile[] {
        return this.fileList.map(filename => new ExerciseFile(filename));
    }

}

export class ExerciseFile extends vscode.TreeItem {

    constructor(
        public readonly label: string
    ){
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: "parsonExplorer.displayFile",
            title: '',
            arguments: [label]
        };
    }    
}