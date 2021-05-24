import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { DisposableWrapper } from '../model';
import { ExerciseFile } from './ParsonExplorer';
import { readParsonFile, verifyFolder } from './FileReader';

export class AnswerVerification{
    private terminal?: vscode.Terminal;
    private nextTerminalId: number = 1;
    public static register(workspaceroot: string): DisposableWrapper<AnswerVerification>{
        let answerVerification = new AnswerVerification(workspaceroot);
        let compileAndRun = vscode.commands.registerCommand('vscodeparsons.compileAndRun', (exerciseFile: ExerciseFile)=>answerVerification.compileAndRun(exerciseFile.uri));
        let disposable = vscode.Disposable.from(compileAndRun, answerVerification);
        return {it: answerVerification, disposable};
    }

    public dispose(){
        if(this.terminal){
            this.terminal.dispose();
        }
    }

    constructor(private workspaceroot: string){}

    compileAndRun(filePath: string){
        const parson = readParsonFile(filePath, this.workspaceroot);
        const answerMap: {[key: string]: string} = {};
        parson.answers.forEach(answer => {
            answerMap[answer.gap.id] = answer.snippet.text;
        });
        parson.exercise.files.forEach(file => {
            file.gaps.forEach(gap => {
                file.text = file.text.replace(gap.id, answerMap[gap.id]);
            });
            const folderPath = path.join(this.workspaceroot, parson.exercise.output!);
            verifyFolder(folderPath);
            fs.writeFileSync(path.join(folderPath, file.name), file.text);
        });
        if(parson.exercise.runCommands){
            if(!this.terminal || this.terminal.exitStatus){
                const terminalName = `Parson Terminal #${this.nextTerminalId++}`;
                this.terminal = vscode.window.createTerminal(terminalName);
            }else{
                this.terminal.sendText(`cd "${this.workspaceroot}"`);
                this.terminal.sendText("clear");
            }
            this.terminal.show();
            parson.exercise.runCommands.forEach(command => {
                if(command.startsWith("parson-compile:")){
                    this.compileAndRun(command.substring("parson-compile:".length));
                }else{
                    this.terminal?.sendText(command);
                }
            });
        }
    }
}