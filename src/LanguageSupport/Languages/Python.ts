import { Gap, UncompiledGap } from "../../GapSupport/GapModel";
import { CodeLine} from "../../model";
import { findCommentsAndLines, createComment, getGapFromComment} from "../LanguageHelper";
import { GapParserLanguage } from "../LanguageModel";

export const pythonCommentParser: GapParserLanguage = {
    findCommentsAndLines(text: string): Map<CodeLine, Array<string>>{
        return findCommentsAndLines(text, "'''", "'''");
    },
    createComment(gap: Gap, indent: number, indentationSymbol: string): string{
       return createComment(gap, indent,indentationSymbol, "'''\n", "\n'''");
    },
    getGapFromComment(comment: string): UncompiledGap{
        return getGapFromComment(comment);
    }
};