import { CodeLine } from "../model";
import * as vscode from 'vscode';
import { GapParserLanguage } from "../LanguageSupport/LanguageModel";
import { fileNameToLanguage, getParserForLanguage } from "../LanguageSupport/LanguageHelper";
import { Gap, UncompiledGap } from "../GapSupport/GapModel";

export class CodeFile{
    private gapParser: GapParserLanguage;
    public indentation: string;
    constructor(
        public text: string,
        public filename: string
    ){
        const language = fileNameToLanguage(filename);
        this.gapParser = getParserForLanguage(language);
        this.indentation = this.findIndentation(); // can be postponed until first need
    }

    getLines(): Array<string>{
        return this.text.split("\n");
    }

    getGapFromComment(comment: string): UncompiledGap{
        return this.gapParser.getGapFromComment(comment);
    }

    removeText(text: string): void{
        const index = this.text.indexOf(text);
        if(index > 0){
            this.text = this.text.slice(0, index)+this.text.slice(index+text.length);
        }else{
            throw new Error(`text: \n${text}\n could not be found in file ${this.filename}`);
        }
    }

    removeAnswersFromLine(lineNumber: number, replacements: Array<{id: string, text: string, startIndex?: number}>): void{
        const lines = this.getLines();
        const line = lines[lineNumber];
        replacements
            .map((replacement, i) => {
                return {
                    text: replacement.text,
                    index: i,
                    id: replacement.id,
                    startIndex: replacement.startIndex,
                    appearances: line.split(replacement.text).length-1
                };
            })
            .sort((replacement, otherReplacement)=>{
                if(replacement.startIndex){
                    return otherReplacement.startIndex ? 0 : 1;
                }
                if(otherReplacement.startIndex){
                    return -1;
                }
                if(replacement.appearances !== otherReplacement.appearances){
                    return otherReplacement.appearances - replacement.appearances;
                }
                return replacement.index - otherReplacement.index;
            })
            .forEach(replacement => {
                if(replacement.startIndex){
                    lines[lineNumber] = lines[lineNumber].substring(0, replacement.startIndex) + 
                        replacement.id + 
                        lines[lineNumber].substring(replacement.startIndex + replacement.text.length);
                }else{
                    lines[lineNumber] = lines[lineNumber].replace(replacement.text, replacement.id);
                }
            });
        this.text = lines.join("\n");
    }

    createGapComment(gap: Gap, lineNumber: number): {text: string, writePos: vscode.Position}{
        const line = this.getLines()[lineNumber];
        const indentations = (line.indexOf(line.trim())) / this.indentation.length;
        const newComment = this.gapParser.createComment(gap, indentations, this.indentation);
        const comments = this.findCommentsAndLines().get({text: line, lineNumber});
        let writePos = new vscode.Position(lineNumber+1, 0);
        if(comments){
            const lastComment = comments
                .map(c => {
                    return {
                        comment: c,
                        index: this.text.indexOf(c)
                    };
                })
                .sort((a,b)=>b.index-a.index)[0];
            const lastLine = this.text.substring(0, lastComment.index + lastComment.comment.length).split("\n").length;
            writePos = new vscode.Position(lastLine, 0);
        }
        return {text: newComment, writePos};
    }

    findCommentsAndLines(): Map<CodeLine, Array<string>>{
        return this.gapParser.findCommentsAndLines(this.text);
    }

    private findIndentation(): string{
        const indents: Array<number> = [];
        let symbol = " ";
        let indentedLines = 0;
        this.getLines().forEach(line => {
            const indentations = (line.indexOf(line.trim()));
            if(indentations > 0){
                indentedLines++;
                symbol = line.charAt(0);
                while(indents.length <= indentations){
                    indents.push(0);
                }
                for(let i = 1; i < indents.length; i++){
                    indents[i] += indentations % i === 0 ? 1 : 0;
                }
            }
        });
        const foundIndentation = indents.lastIndexOf(indentedLines); //does not handle even a single line of non-standard indentation
        return symbol.repeat(foundIndentation > 0 ? foundIndentation : (symbol === " ")? 4 : 1);
    }
}