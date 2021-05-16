import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Exercise, SavedExerciseAnswer, Gap, GapDirectory, SnippetDirectory, ParsonConfig, DisposableWrapper } from '../model';
import { getCodeFilesInFolder } from './FileReader';
import { generateNonce } from '../util';
import { ExerciseFile, ParsonExplorer } from './ParsonExplorer';
import { ParsonViewerProvider } from './ParsonViewerProvider';

export class AdminTools{
    public static register(parsonExplorer: ParsonExplorer, parsonViewerProvider: ParsonViewerProvider): DisposableWrapper<AdminTools>{
        let adminTools = new AdminTools(parsonExplorer, parsonViewerProvider);
        let fileToProblem = vscode.commands.registerCommand('vscodeparsons.fileToProblem', ()=>adminTools.fileToProblem());
        let folderToProblem = vscode.commands.registerCommand('vscodeparsons.folderToProblem', ()=>adminTools.folderToProblem());
        let exportFile = vscode.commands.registerCommand('vscodeparsons.exportFile', ()=>adminTools.exportFile());
        let registerGap = vscode.commands.registerCommand('vscodeparsons.registerGap', ()=>adminTools.createGap());
        let refreshEntries = vscode.commands.registerCommand('vscodeparsons.refreshEntries', ()=>adminTools.refreshEntries());
        let refreshEntry = vscode.commands.registerCommand('vscodeparsons.refreshEntry', (exerciseFile)=>adminTools.refreshEntry(exerciseFile));
        let disposable = vscode.Disposable.from(fileToProblem, folderToProblem, exportFile, registerGap, refreshEntries);
        return {it: adminTools, disposable};
    }

    constructor(private parsonExplorer: ParsonExplorer, private parsonViewerProvider: ParsonViewerProvider){

    }

    private fileToProblem(){
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const fileName = path.basename(filePath);
        const fileNameNoExt = fileName.substr(0, fileName.indexOf("."));
        if(fileNameNoExt.trim() === ""){return;}
        const folderPath = path.join(path.dirname(filePath), fileNameNoExt);
        fs.mkdirSync(folderPath);
        //console.log(filePath, path.join(folderPath, fileName));
        const newFilePath = path.join(folderPath, fileName);
        fs.copyFileSync(filePath, newFilePath);
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        vscode.workspace.openTextDocument(newFilePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        fs.unlinkSync(filePath);
        //console.log("unlinked");
        this.updateFolder(folderPath);
    }

    private folderToProblem(){
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const folderPath = path.dirname(filePath);
        console.log(filePath, folderPath);
        this.updateFolder(folderPath);
    }

    private updateFolder(folderPath: string){
        console.log("updateFolder", folderPath);
        this.createSnippetsFile(folderPath);
        this.createParsonConfig(folderPath);
    }

    private createSnippetsFile(folderPath: string){
        const fileName = path.join(path.join(folderPath, "snippets.json"));
        if(!this.fileExists(fileName)){
            const snippets: SnippetDirectory = {
                dragdrop: ["example"],
                dropdown: {list: ["foo", "bar"]}
            };
            const snippetString = JSON.stringify(snippets, null, 4);
            fs.writeFile(fileName, snippetString, (err)=> {throw err;});
        }
    }

    private findGaps(folderPath: string, fileName: string): Array<Gap>{
        const filePath = path.join(folderPath, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent
            .split("$parson{")
            .slice(1)
            .map(str => str.substr(0, str.indexOf("}")))
            .filter(str => str.trim() !== "")
            .map(str => {return {id: str, width: 20, type: "dragdrop"};});
    }

    private createParsonConfig(folderPath: string){
        const fileName = path.join(folderPath, "parsonconfig.json");
        if(!this.fileExists(fileName)){
            const parsonConfig: ParsonConfig = {
                output: {
                    parson: "exampleFiles",
                    parsondef: ".parson"
                },
                name: path.basename(folderPath),
                includesSolution: false
            };
            const parsonConfigString = JSON.stringify(parsonConfig, null, 4);
            fs.writeFile(fileName, parsonConfigString, (err)=> {throw err;});
        }
    }

    private exportFile(){
        console.log("export");
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const folderPath = path.dirname(filePath);
        const codeFiles = getCodeFilesInFolder(folderPath);
        const gaps: GapDirectory = {};
        const files: {[key: string]: string} = {};
        //console.log(codeFiles);

        codeFiles.forEach(filename => {
            const extracted = this.extractGaps(fs.readFileSync(path.join(folderPath, filename), 'utf-8'));
            gaps[filename] = extracted.gaps;
            files[filename] = extracted.codeFile;
        });
        
        const parsonConfig = this.readFile<ParsonConfig>(path.join(folderPath, "parsonconfig.json"));
        const snippets = this.readFile<SnippetDirectory>(path.join(folderPath, "snippets.json"));
        if(!parsonConfig.filename){
            parsonConfig.filename = parsonConfig.name;
        }

        const parsondef: Exercise = {
            name: parsonConfig.name,
            files: Object.keys(gaps).map(fileName => {
                return {
                    name: fileName,
                    text: files[fileName],
                    gaps: gaps[fileName]
                };
            }),
            snippets: snippets.dragdrop.map((snip, i) => {return {text: snip, id: i};})
        };

        const parson: SavedExerciseAnswer = {
            parsonDef: parsonConfig.filename,
            answers: []
        };
        const workspaceFolder = vscode.workspace.workspaceFolders!![0].uri.fsPath;
        console.log(parson, parsondef, workspaceFolder, path.join(workspaceFolder, parsonConfig.output.parson, `${parsonConfig.filename}.parson`));
        this.verifyFolder(path.join(workspaceFolder, parsonConfig.output.parson));
        console.log("parson folder verified");
        const parsonFileName = path.join(parsonConfig.output.parson, `${parsonConfig.filename}.parson`);
        fs.writeFileSync(path.join(workspaceFolder, parsonFileName),JSON.stringify(parson, null, 4));
        console.log("parson file created");
        this.verifyFolder(path.join(workspaceFolder, parsonConfig.output.parsondef));
        console.log("parsondef folder verified");
        fs.writeFileSync(path.join(workspaceFolder, parsonConfig.output.parsondef, `${parsonConfig.filename}.parsondef`),JSON.stringify(parsondef, null, 4));
        console.log("parsondef file created");
        this.parsonExplorer.onDidChangeTreeDataEmitter.fire();
        this.parsonViewerProvider.updateFile(parsonFileName);
    }

    private createGap(){
        if(vscode.window.activeTextEditor){
            const selection = vscode.window.activeTextEditor?.selection;
            const document = vscode.window.activeTextEditor.document;
            const documentText = document.getText();
            const selectionText = document.getText(selection);
            const restOfText = document.getText().substring(document.offsetAt(selection.end));
            //console.log(selectionText, "\nrest: ", restOfText);
            const regexp = new RegExp("(\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/)+", "s",);
            const gapsForLine = restOfText.match(regexp);
            let writePos = new vscode.Position(selection.end.line+1, 0);
            if(gapsForLine?.[0] && writePos.line === document.positionAt(documentText.indexOf(gapsForLine[0])).line+1){
                const gapsForLineOffset = document.getText().indexOf(gapsForLine[0])+gapsForLine[0].length;
                const endPos = document.positionAt(gapsForLineOffset);
                writePos = new vscode.Position(endPos.line+1, 0);
            }
            const startOfLine = document.getText(new vscode.Range(new vscode.Position(selection.start.line,0), selection.end));
            const indentationIsTab = startOfLine.charAt(0) === "\t";
            //console.log("indentation:"+startOfLine.charAt(0)+"stop", indentationIsTab);
            const indentations = (startOfLine.length - startOfLine.trim().length) / (indentationIsTab ? 1 : 4);
            //console.log(indentations, startOfLine.length, startOfLine.trim().length);
            let gapText = `${this.indent(indentations)}/*$parson{\n`+
                `${this.indent(indentations+1)}"text": "${selectionText.replace('"', '\\"')}",\n`+
                `${this.indent(indentations+1)}"width": ${selectionText.length*2},\n`+
                `${this.indent(indentations+1)}"type": "dragdrop"\n`+
                `${this.indent(indentations)}}*/\n`;
            //console.log(gapText);
            let snippetUri = path.join(path.dirname(document.fileName), "snippets.json");
            //console.log(snippetUri, document.uri);
            vscode.workspace.openTextDocument(snippetUri).then(snipDoc => {
                let snippets = JSON.parse(snipDoc.getText()) as SnippetDirectory;
                snippets.dragdrop.push(selectionText);
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, writePos, gapText);
                edit.replace(snipDoc.uri, new vscode.Range(0,0,snipDoc.lineCount, 0), JSON.stringify(snippets, null, 4),);
                vscode.workspace.applyEdit(edit);
            });
            
        }
    }

    indent(ind: number): string{
        let str = "";
        for(let i = 0; i < ind; i++){
            str+="    ";
        }
        //console.log("str", str);
        return str;
    }
    

    private extractGaps(codeFile: string): {codeFile: string, gaps: Array<Gap>}{
        const gaps: Array<Gap> = [];
        const regexp = new RegExp("\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/", "gs",);
        const extraction = codeFile.match(regexp);
        let updatedCodeFile = codeFile.slice();
        //console.log(extraction);
        if(extraction){
            for(const comment of extraction){
                const jsonString = comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1);
                const gap = JSON.parse(jsonString);
                const nonce = generateNonce(12);
                gap.id = nonce;
                const newJsonString = JSON.stringify(gap);
                updatedCodeFile = updatedCodeFile.replace(jsonString, newJsonString);
                gaps.push({id: nonce, type: gap.type, width: gap.width});
            }
        }
        //console.log(updatedCodeFile);
        //console.log(gaps);
        return {codeFile: updatedCodeFile, gaps};
    }

    private refreshEntries(){
        this.parsonExplorer.onDidChangeTreeDataEmitter.fire();
    }

    private refreshEntry(a: ExerciseFile){
        this.parsonViewerProvider.updateFile(a.uri);
    }

    private verifyFolder(folderPath: string){
        try{
            fs.accessSync(folderPath);
        }catch(error){
            fs.mkdirSync(folderPath);
        }
    }

    private fileExists(filePath: string): boolean{
        try{
            fs.accessSync(filePath);
        }catch(error){
            return false;
        }
        return true;
    }

    private readFile<T>(filePath: string): T{
        const text = fs.readFileSync(filePath, 'utf-8');
        const result: T = JSON.parse(text);
        return result;
    }
}