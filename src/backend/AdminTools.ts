import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Exercise, SavedExerciseAnswer, Gap, GapDirectory, SnippetDirectory, ParsonConfig, DisposableWrapper } from '../model';
import { fileExists, getCodeFilesInFolder, readFile, verifyFolder } from './FileReader';
import { generateNonce } from '../util';
import { ExerciseFile, ParsonExplorer } from './ParsonExplorer';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonDecorationProvider } from './ParsonDecorationProvider';

export class AdminTools{
    public static register(
        parsonExplorer: ParsonExplorer,
        parsonViewerProvider: ParsonViewerProvider,
        decorationProvider: ParsonDecorationProvider): DisposableWrapper<AdminTools>{
        let adminTools = new AdminTools(parsonExplorer, parsonViewerProvider, decorationProvider);
        let fileToProblem = vscode.commands.registerCommand('vscodeparsons.fileToProblem', ()=>adminTools.fileToProblem());
        let folderToProblem = vscode.commands.registerCommand('vscodeparsons.folderToProblem', ()=>adminTools.folderToProblem());
        let exportFile = vscode.commands.registerCommand('vscodeparsons.exportFile', ()=>adminTools.exportFile());
        let registerGap = vscode.commands.registerCommand('vscodeparsons.registerGap', ()=>adminTools.createGap());
        let refreshEntries = vscode.commands.registerCommand('vscodeparsons.refreshEntries', ()=>adminTools.refreshEntries());
        let refreshEntry = vscode.commands.registerCommand('vscodeparsons.refreshEntry', (exerciseFile)=>adminTools.refreshEntry(exerciseFile));
        let disposable = vscode.Disposable.from(fileToProblem, folderToProblem, exportFile, registerGap, refreshEntries, refreshEntry);
        return {it: adminTools, disposable};
    }

    constructor(
        private parsonExplorer: ParsonExplorer,
        private parsonViewerProvider: ParsonViewerProvider,
        private decorationProvider: ParsonDecorationProvider){

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
        if(!fileExists(fileName)){
            const snippets: SnippetDirectory = {
                dragdrop: ["example"],
                dropdown: {list: ["foo", "bar"]}
            };
            const snippetString = JSON.stringify(snippets, null, 4);
            fs.writeFile(fileName, snippetString, (err)=> {throw err;});
        }
    }

    private createParsonConfig(folderPath: string){
        const fileName = path.join(folderPath, "parsonconfig.json");
        if(!fileExists(fileName)){
            const parsonConfig: ParsonConfig = {
                output: {
                    parson: "exampleFiles",
                    parsondef: ".parson",
                    code: "dist"
                },
                name: path.basename(folderPath),
                includesSolution: false,
                runnable: false,
                entryPoint: ""
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

        const parsonConfig = readFile<ParsonConfig>(path.join(folderPath, "parsonconfig.json"));
        const snippets = readFile<SnippetDirectory>(path.join(folderPath, "snippets.json"));

        codeFiles.forEach(filename => {
            const extracted = this.extractAndConvertGaps(fs.readFileSync(path.join(folderPath, filename), 'utf-8'), snippets);
            gaps[filename] = extracted.gaps;
            files[filename] = extracted.codeFile;
        });
        
        
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
            snippets: snippets.dragdrop.map((snip, i) => {return {text: snip, id: i};}),
            runnable: parsonConfig.runnable,
            output: parsonConfig.output.code,
            entryPoint: parsonConfig.entryPoint
        };

        const parson: SavedExerciseAnswer = {
            parsonDef: parsonConfig.filename,
            answers: []
        };
        const workspaceFolder = vscode.workspace.workspaceFolders!![0].uri.fsPath;
        console.log(parson, parsondef, workspaceFolder, path.join(workspaceFolder, parsonConfig.output.parson, `${parsonConfig.filename}.parson`));
        verifyFolder(path.join(workspaceFolder, parsonConfig.output.parson));
        console.log("parson folder verified");
        const parsonFileName = path.join(parsonConfig.output.parson, `${parsonConfig.filename}.parson`);
        fs.writeFileSync(path.join(workspaceFolder, parsonFileName),JSON.stringify(parson, null, 4));
        console.log("parson file created");
        verifyFolder(path.join(workspaceFolder, parsonConfig.output.parsondef));
        console.log("parsondef folder verified");
        fs.writeFileSync(path.join(workspaceFolder, parsonConfig.output.parsondef, `${parsonConfig.filename}.parsondef`),JSON.stringify(parsondef, null, 4));
        console.log("parsondef file created");
        try{ // bytt til å trye i hver metode
            this.refreshEntries();
            this.refreshEntry({uri: parsonFileName, files: parsondef.files.map(file=>file.name)});
        }catch(error){
            console.log(error);
        }
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
    

    private extractAndConvertGaps(codeFile: string, snippets: SnippetDirectory): {codeFile: string, gaps: Array<Gap>}{
        const gaps: Array<Gap> = [];
        const regexp = new RegExp("\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/", "gs",);
        const extraction = codeFile.match(regexp);
        let updatedCodeFile = codeFile.slice();
        //console.log(extraction);
        if(extraction){
            for(const comment of extraction){
                const jsonString = comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1);
                const gap: Gap = JSON.parse(jsonString);
                const nonce = generateNonce(12);
                gap.id = nonce;
                if(gap.type === "dropdown"){
                    gap.options = snippets.dropdown[gap.dropdown!];
                }
                const newJsonString = JSON.stringify({id: nonce, text: gap.text});
                updatedCodeFile = updatedCodeFile.replace(jsonString, newJsonString);
                gaps.push({id: nonce, type: gap.type, width: gap.width, options: gap.options});
            }
        }
        //console.log(updatedCodeFile);
        //console.log(gaps);
        return {codeFile: updatedCodeFile, gaps};
    }

    private refreshEntries(){
        this.parsonExplorer.onDidChangeTreeDataEmitter.fire();
    }

    private refreshEntry(exerciseFile: {uri: string, files?: Array<string>}){
        this.parsonViewerProvider.updateFile(exerciseFile.uri);
        exerciseFile.files?.forEach(file => {
            const parsonUri = vscode.Uri.parse(`parson:${path.join(exerciseFile.uri, file)}`);
            console.log("parsonUri: "+parsonUri.path);
            this.decorationProvider.fileChangeEmitter.fire(parsonUri);
        });
    }
}