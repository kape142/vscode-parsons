import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Exercise, SavedExerciseAnswer, GapDirectory, ParsonConfig, DisposableWrapper, Snippet } from '../model';
import { fileExists, getCodeFilesInFolder, readFile, verifyFolder } from './FileReader';
import { ParsonExplorer } from './ParsonExplorer';
import { ParsonViewerProvider } from './ParsonViewerProvider';
import { ParsonDecorationProvider } from './ParsonDecorationProvider';
import { CodeFile } from './CodeFile';
import { compileGap } from '../GapSupport/GapTypeHelper';
import { getGapFromComment } from '../LanguageSupport/LanguageHelper';
import { CompiledGap, UncompiledGap } from '../GapSupport/GapModel';

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
        let registerFileSaveListener = adminTools.registerFileSaveListener();
        let registerRefreshSettingListener = adminTools.registerRefreshSettingListener();
        let disposable = vscode.Disposable.from(fileToProblem, folderToProblem, exportFile,
             registerGap, refreshEntries, refreshEntry, registerFileSaveListener, registerRefreshSettingListener);
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
        const newFilePath = path.join(folderPath, fileName);
        fs.copyFileSync(filePath, newFilePath);
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        vscode.workspace.openTextDocument(newFilePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        fs.unlinkSync(filePath);
        this.updateFolder(folderPath);
    }

    private folderToProblem(){
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const folderPath = path.dirname(filePath);
        this.updateFolder(folderPath);
    }

    private updateFolder(folderPath: string){
        this.createParsonConfig(folderPath);
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
                runCommands: ["cd dist", "javac *.java", "java Main"]
            };
            const parsonConfigString = JSON.stringify(parsonConfig, null, 4);
            fs.writeFile(fileName, parsonConfigString, (err)=> {if(err){throw err;}});
        }
    }

    private exportFile(){
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const folderPath = path.dirname(filePath);
        const filenames = getCodeFilesInFolder(folderPath);
        const gaps: GapDirectory = {};

        const parsonConfig = readFile<ParsonConfig>(path.join(folderPath, "parsonconfig.json"));
        const snippets: Array<Snippet> = [];

        const files = filenames.map(filename => new CodeFile(fs.readFileSync(path.join(folderPath, filename), 'utf-8'), filename));
        const lineMaps = files.map(file => {
            return {
                map: file.findCommentsAndLines(),
                codeFile: file
            };
        });
        const lineLists = lineMaps.map(lineMap => {
            return {
                list: Array.from(lineMap.map.keys())
                    .map(line => {
                        const comments = lineMap.map.get(line)!;
                        return {
                            lineText: line.text,
                            lineNumber: line.lineNumber,
                            comments,
                            gaps: comments.map(getGapFromComment)
                        };
                    }),
                codeFile: lineMap.codeFile
            };
        });

        const uncompiledGaps: Array<UncompiledGap> = lineLists  
            .map(lineList => lineList.list
                .map(line => line.gaps)
                .reduce((acc, cur) => acc.concat(cur), [])
            )
            .reduce((acc, cur) => acc.concat(cur), []);

        lineLists.forEach(lineList => {
            const fileGaps: Array<CompiledGap> = [];
            lineList.list.forEach(line => {
                const replacements: Array<{id: string, text: string, startIndex?: number}> = [];
                line.gaps.forEach(gap => {
                    const compiledGap = compileGap(gap, uncompiledGaps);
                    fileGaps.push(compiledGap.gap);
                    if(compiledGap.snippets){
                        snippets.push(...compiledGap.snippets);
                    }
                    replacements.push({text: gap.text, id: compiledGap.gap.id, startIndex: gap.startIndex});
                });
                lineList.codeFile.removeAnswersFromLine(line.lineNumber, replacements);
            });
            gaps[lineList.codeFile.filename] = fileGaps;
        });

        lineLists.forEach(lineList => {
            lineList.list.forEach(line => {
                line.comments.forEach(comment => {
                    lineList.codeFile.removeText(comment);
                });
            });
        });
        
        if(!parsonConfig.filename){
            parsonConfig.filename = parsonConfig.name;
        }

        const parsondef: Exercise = {
            name: parsonConfig.name,
            files: files.map(file => {
                return {
                    name: file.filename,
                    text: file.text,
                    gaps: gaps[file.filename]
                };
            }),
            snippets: snippets,
            runnable: parsonConfig.runnable,
            output: parsonConfig.output.code,
            runCommands: parsonConfig.runCommands
        };

        const parson: SavedExerciseAnswer = {
            parsonDef: path.join(parsonConfig.output.parsondef,parsonConfig.filename),
            answers: []
        };
        const workspaceFolder = vscode.workspace.workspaceFolders!![0].uri.fsPath;
        verifyFolder(path.join(workspaceFolder, parsonConfig.output.parson));
        const parsonFileName = path.join(parsonConfig.output.parson, `${parsonConfig.filename}.parson`);
        fs.writeFileSync(path.join(workspaceFolder, parsonFileName),JSON.stringify(parson, null, 4));
        verifyFolder(path.join(workspaceFolder, parsonConfig.output.parsondef));
        fs.writeFileSync(path.join(workspaceFolder, parsonConfig.output.parsondef, `${parsonConfig.filename}.parsondef`),JSON.stringify(parsondef, null, 4));
        this.refreshEntries();
        this.refreshEntry({uri: parsonFileName, files: parsondef.files.map(file=>file.name)});
    }

    private createGap(){
        if(vscode.window.activeTextEditor){
            const selection = vscode.window.activeTextEditor?.selection;
            const document = vscode.window.activeTextEditor.document;
            const documentText = document.getText();
            const selectionText = document.getText(selection);
            const codeFile = new CodeFile(documentText, document.fileName);
            let gap: UncompiledGap = {
                text: selectionText.replace('"', '\\"'),
                width: selectionText.length * 2,
                type: "dragdrop",
                options: ["example"]
            };
            const gapComment = codeFile.createGapComment(gap, selection.end.line);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, gapComment.writePos, gapComment.text);
            vscode.workspace.applyEdit(edit);
        }
    }

    private refreshEntries(){
        try{
            this.parsonExplorer.onDidChangeTreeDataEmitter.fire();
        }catch(error){
            if(error){
                console.log(error);
            }
        }
    }

    private refreshEntry(exerciseFile: {uri: string, files?: Array<string>}){
        try{
            this.parsonViewerProvider.updateFile(exerciseFile.uri);
        }catch(error){
            if(error){
                console.log(error);
            }
        }
        try{
            exerciseFile.files?.forEach(file => {
                const parsonUri = vscode.Uri.parse(`parson:${path.join(exerciseFile.uri, file)}`);
                this.decorationProvider.fileChangeEmitter.fire(parsonUri);
            });
        }catch(error){
            if(error){
                console.log(error);
            }
        }
    }

    private registerRefreshSettingListener(){
        return vscode.workspace.onDidChangeConfiguration((configChange: vscode.ConfigurationChangeEvent) => {
            if(configChange.affectsConfiguration("vscodeparsons.enableRefreshing")){
                this.refreshEntries();
            }
        });
    }

    private registerFileSaveListener(){
        let saveDisposable: vscode.Disposable | undefined = this.updateSaveListener();
        const configDisposable = vscode.workspace.onDidChangeConfiguration((configChange: vscode.ConfigurationChangeEvent) => {
            if(configChange.affectsConfiguration("vscodeparsons.listenForChanges")){
                saveDisposable = this.updateSaveListener(saveDisposable);
            }
        });
        return new vscode.Disposable(()=>{
            saveDisposable?.dispose();
            configDisposable.dispose();
        });
    }

    private updateSaveListener(saveDisposable?: vscode.Disposable): vscode.Disposable | undefined{
        const settingValue = vscode.workspace.getConfiguration("vscodeparsons").get<boolean>("listenForChanges");
        if(settingValue){
            return vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
                const folder = path.dirname(document.fileName);
                if(fileExists(path.join(folder, "parsonconfig.json"))){
                    this.exportFile();
                }
            });
        }else{
            saveDisposable?.dispose();
        }
        
    }
}