import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Answer, DisposableWrapper } from '../model';
import { ExerciseFile } from './ParsonExplorer';
import { readParsonFile, verifyFolder } from './FileReader';
import { replaceMostRecent } from '../util';

export class AnswerVerification{
    private terminal?: vscode.Terminal;
    private nextTerminalId: number = 1;
    public static register(workspaceroot: string): DisposableWrapper<AnswerVerification>{
        let answerVerification = new AnswerVerification(workspaceroot);
        let compileAndRun = vscode.commands.registerCommand('vscodeparsons.compileAndRun', (exerciseFile: ExerciseFile)=>answerVerification.compileAndRun(exerciseFile.uri));
        let disposable = vscode.Disposable.from(compileAndRun);
        return {it: answerVerification, disposable};
    }

    constructor(private workspaceroot: string){

    }

    compileAndRun(filePath: string){
        const parson = readParsonFile(filePath, this.workspaceroot);
        const answerMap: {[key: string]: string} = {};
        parson.answers.forEach(answer => {
            answerMap[answer.gap.id] = answer.snippet.text;
        });
        console.log(parson);
        const gapFinder = new RegExp("\\s*\\/\\*\\s*\\$parson\\s*\\{.+?\\}\\s*\\*\\/", "gs",); // TODO needs to handle comment blocks simultaneously
        parson.exercise.files.forEach(file => {
            console.log(file);
            const extraction = file.text.match(gapFinder);
            if(extraction){
                extraction
                    .reverse()
                    .map(comment => {
                        return {
                            jsonString: comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1),
                            index: file.text.indexOf(comment)
                        };})
                    .map(data => {
                        return {
                            gap: JSON.parse(data.jsonString) as {id: string, text: string},
                            index: data.index
                        };})
                    .forEach(data => {
                        file.text = replaceMostRecent(file.text, data.gap.text!, data.gap.id, data.index);
                    });
                extraction.forEach(comment => {
                    const index = file.text.indexOf(comment);
                    file.text = file.text.slice(0, index)+file.text.slice(index+comment.length);
                });
                file.gaps.forEach(gap=>{
                    file.text = file.text.replace(gap.id, answerMap[gap.id] || "");
                });
            }
            console.log("runnable:\n"+file.text);
            const folderPath = path.join(this.workspaceroot, parson.exercise.output!);
            console.log(folderPath, file.name);
            verifyFolder(folderPath);
            fs.writeFileSync(path.join(folderPath, file.name), file.text);
        });
        if(!this.terminal || this.terminal.exitStatus){
            const terminalName = `Parson Terminal #${this.nextTerminalId++}`;
            this.terminal =  vscode.window.createTerminal(terminalName);
            this.terminal.sendText(`echo '${terminalName} created'`);
            this.terminal.sendText(`cd ${parson.exercise.output}`);
        }
        this.terminal.sendText(`rm *.class`);
        this.terminal.sendText("clear");
        this.terminal.show();
        this.terminal.sendText(`javac *.java`);
        this.terminal.sendText(`java ${parson.exercise.entryPoint}`);
    }
}