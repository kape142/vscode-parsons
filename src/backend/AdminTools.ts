import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Exercise, SavedExerciseAnswer, Gap, GapDirectory, SnippetDirectory, ParsonConfig } from '../model';
import { getCodeFilesInFolder } from './FileReader';
import { generateNonce } from '../util';

export class AdminTools{
    public static register(): Array<vscode.Disposable>{
        let fileToProblem = vscode.commands.registerCommand('vscodeparsons.fileToProblem', this.fileToProblem);
        let folderToProblem = vscode.commands.registerCommand('vscodeparsons.folderToProblem', this.folderToProblem);
        let exportFile = vscode.commands.registerCommand('vscodeparsons.exportFile', this.exportFile);
        return [fileToProblem, folderToProblem, exportFile];
    }

    private static fileToProblem(){
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
        vscode.workspace.openTextDocument(newFilePath).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        fs.unlinkSync(filePath);
        //console.log("unlinked");
        AdminTools.updateFolder(folderPath);
    }

    private static folderToProblem(){
        if(!vscode.window.activeTextEditor){return;}
        const document = vscode.window.activeTextEditor.document;
        const filePath = document.fileName;
        const folderPath = path.dirname(filePath);
        console.log(filePath, folderPath);
        AdminTools.updateFolder(folderPath);
    }

    private static updateFolder(folderPath: string){
        console.log("updateFolder", folderPath);
        AdminTools.createSnippetsFile(folderPath);
        //AdminTools.createGapsFile(folderPath);
        AdminTools.createParsonConfig(folderPath);
    }

    private static createSnippetsFile(folderPath: string){
        const fileName = path.join(path.join(folderPath, "snippets.json"));
        if(!AdminTools.fileExists(fileName)){
            const snippets: SnippetDirectory = {
                dragdrop: ["example"],
                dropdown: {list: ["foo", "bar"]}
            };
            const snippetString = JSON.stringify(snippets, null, 4);
            fs.writeFile(fileName, snippetString, (err)=> {throw err;});
        }
    }

    /*private static createGapsFile(folderPath: string){
        const fileName = path.join(folderPath, "gaps.json");
        const folderContents = fs.readdirSync(folderPath);
        let gaps: GapDirectory = {};
        folderContents
            .filter(file => !["snippets.json", "parsonconfig.json", "gaps.json"].includes(file))
            .forEach(file => {gaps[file] = AdminTools.findGaps(folderPath, file);});
        
        if(AdminTools.fileExists(fileName)){
            const prevGaps = AdminTools.readFile<GapDirectory>(fileName);
            Object.keys(prevGaps).forEach(key => {
                if(gaps[key]){
                    gaps[key].forEach(gap=>{
                        if(!prevGaps[key].find(prevGap => gap.id === prevGap.id)){
                            prevGaps[key].push(gap);
                        }
                    });
                    prevGaps[key].forEach(gap=>{
                        if(!gaps[key].find(newGap => gap.id === newGap.id) && !gap.id.endsWith("!deprecated")){
                            gap.id+="!deprecated";
                        }
                    });
                }
            });
            Object.keys(gaps).forEach(key => {
                if(!prevGaps[key]){
                    prevGaps[key] = gaps[key];
                }
            });
            gaps = prevGaps;
        }
        const gapString = JSON.stringify(gaps, null, 4);
        fs.writeFile(fileName, gapString, (err)=> {throw err;});
    }*/

    private static findGaps(folderPath: string, fileName: string): Array<Gap>{
        const filePath = path.join(folderPath, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return fileContent
            .split("$parson{")
            .slice(1)
            .map(str => str.substr(0, str.indexOf("}")))
            .filter(str => str.trim() !== "")
            .map(str => {return {id: str, width: 20, type: "dragdrop"};});
    }

    private static createParsonConfig(folderPath: string){
        const fileName = path.join(folderPath, "parsonconfig.json");
        if(!AdminTools.fileExists(fileName)){
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

    private static exportFile(){
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
            const extracted = AdminTools.extractGaps(fs.readFileSync(path.join(folderPath, filename), 'utf-8'));
            gaps[filename] = extracted.gaps;
            files[filename] = extracted.codeFile;
        });
        
        const parsonConfig = AdminTools.readFile<ParsonConfig>(path.join(folderPath, "parsonconfig.json"));
        const snippets = AdminTools.readFile<SnippetDirectory>(path.join(folderPath, "snippets.json"));
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
        AdminTools.verifyFolder(path.join(workspaceFolder, parsonConfig.output.parson));
        console.log("parson folder verified");
        fs.writeFileSync(path.join(workspaceFolder, parsonConfig.output.parson, `${parsonConfig.filename}.parson`),JSON.stringify(parson, null, 4));
        console.log("parson file created");
        AdminTools.verifyFolder(path.join(workspaceFolder, parsonConfig.output.parsondef));
        console.log("parsondef folder verified");
        fs.writeFileSync(path.join(workspaceFolder, parsonConfig.output.parsondef, `${parsonConfig.filename}.parsondef`),JSON.stringify(parsondef, null, 4));
        console.log("parsondef file created");
    }

    private static createGap(){
        vscode.window.activeTextEditor?.selection;
    }
    

    private static extractGaps(codeFile: string): {codeFile: string, gaps: Array<Gap>}{
        const gaps: Array<Gap> = [];
        const regexp = new RegExp("\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/", "gs",);
        const extraction = codeFile.match(regexp);
        let cleanCodeFile = codeFile.slice();
        console.log(extraction);
        if(extraction){
            const extractedGaps = extraction
                .map(comment => comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1))
                .map(jsonString => JSON.parse(jsonString));
            console.log(cleanCodeFile);
            extraction.forEach(comment => {
                const index = cleanCodeFile.indexOf(comment);
                cleanCodeFile = cleanCodeFile.slice(0, index)+cleanCodeFile.slice(index+comment.length);
                console.log(comment, index, cleanCodeFile);
            });
            extractedGaps
                .forEach(gap => {
                    let nonce = generateNonce(12);
                    gap.nonce = nonce;
                    cleanCodeFile = cleanCodeFile.replace(gap.text, `$parson{${nonce}}`);
                    gaps.push({id: nonce, type: gap.type, width: gap.width});
                    console.log(cleanCodeFile);
                });
        }
        console.log(cleanCodeFile, gaps);
        return {codeFile: cleanCodeFile, gaps};
    }

    private static verifyFolder(folderPath: string){
        try{
            fs.accessSync(folderPath);
        }catch(error){
            fs.mkdirSync(folderPath);
        }
    }

    private static fileExists(filePath: string): boolean{
        try{
            fs.accessSync(filePath);
        }catch(error){
            return false;
        }
        return true;
    }

    private static readFile<T>(filePath: string): T{
        const text = fs.readFileSync(filePath, 'utf-8');
        const result: T = JSON.parse(text);
        return result;
    }
}