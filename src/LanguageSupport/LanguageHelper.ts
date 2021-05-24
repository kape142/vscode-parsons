import { Gap, UncompiledGap } from "../GapSupport/GapModel";
import { CodeLine } from "../model";
import { GapParserLanguage, ImplementedLanguage } from "./LanguageModel";
import { javaCommentParser } from "./Languages/Java";
import { pythonCommentParser } from "./Languages/Python";

export function findCommentsAndLines(text: string, regexBlockCommentStart: string, regexBlockCommentEnd: string): Map<CodeLine, Array<string>>{
    const multiRegexp = new RegExp(`(\\s*${regexBlockCommentStart}\\s*\\$parson\\s*\\{.+?\\}\\s*${regexBlockCommentEnd})+`, "gs",);
    const singleRegexp = new RegExp(`\\s*${regexBlockCommentStart}\\s*\\$parson\\s*\\{.+?\\}\\s*${regexBlockCommentEnd}`, "gs",);
    const lineComments = text.match(multiRegexp);
    const map = new Map<CodeLine, Array<string>>();
    const lines = text.split("\n");
    console.log(lines);
    for(const lineComment of lineComments || []){
        const line = text.substring(0, text.indexOf(lineComment)).split("\n").length-1;
        //console.log(line);
        //console.log(lines[line]);
        const comments = lineComment.match(singleRegexp);
        if(comments){
            map.set({text: lines[line], lineNumber: line}, comments);
        }
    }
    console.log(map);
    return map;
}

export function getGapFromComment(comment: string): UncompiledGap{
    const jsonString = comment.substring(comment.indexOf("{"), comment.lastIndexOf("}")+1);
    const gap: UncompiledGap = JSON.parse(jsonString);
    return gap;
}

export function createComment(gap: Gap, indentation: number, indentationSymbol: string, blockCommentStart: string, blockCommentEnd: string){
    let comment = `${indentationSymbol.repeat(indentation)}${blockCommentStart.replace("\n","\n"+indentationSymbol.repeat(indentation))}$parson{\n`;
    Object.keys(gap)
        .filter(key => Object(gap).hasOwnProperty(key))
        .forEach((key, i, arr) => {
            comment+=`${indentationSymbol.repeat(indentation+1)}"${key}": ${wrap(Object(gap)[key], indentation+1, indentationSymbol)}${i<arr.length-1?",":""}\n`;
        });
    comment += `${indentationSymbol.repeat(indentation)}}${blockCommentEnd.replace("\n","\n"+indentationSymbol.repeat(indentation))}\n`;
    return comment;
}

function wrap(object: any, indentation: number, indentationSymbol: string){
    if(typeof object === "string"){
        return `"${object}"`;
    }
    if(Array.isArray(object)){
        let s = `[\n`;
        object.forEach((o,i,arr) => {
            s+= `${indentationSymbol.repeat(indentation+1)}${wrap(o, indentation+1, indentationSymbol)}${i<arr.length-1?",":""}\n`;
        });
        s+= `${indentationSymbol.repeat(indentation)}]`;
        return s;
    }
    return object;
}

export function fileNameToLanguage(filename: string): ImplementedLanguage{
    const extension = filename.split(".")[filename.split(".").length-1];
    switch(extension){
        case "java": return "java";
        case "py": return "python";
        default: throw new Error(`file extension ".${extension}" not yet supported`);
    }
}

export function getParserForLanguage(language: ImplementedLanguage): GapParserLanguage{
    switch(language){
        case "java": return javaCommentParser;
        case "python": return pythonCommentParser;
    }
}