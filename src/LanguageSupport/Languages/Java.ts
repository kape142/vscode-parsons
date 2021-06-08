import { Gap, UncompiledGap } from "../../GapSupport/GapModel";
import { CodeLine } from "../../model";
import { findCommentsAndLines, createComment, getGapFromComment} from "../LanguageHelper";
import { GapParserLanguage } from "../LanguageModel";

export const javaCommentParser: GapParserLanguage = {
    findCommentsAndLines(text: string): Map<CodeLine, Array<string>>{
        return findCommentsAndLines(text, "\\/\\*", "\\*\\/");
    },
    createComment(gap: Gap, indent: number = 0, indentationSymbol: string = "    "): string{
       return createComment(gap, indent, indentationSymbol, "/*", "*/");
    },
    getGapFromComment(comment: string): UncompiledGap{
        return getGapFromComment(comment);
    }
};