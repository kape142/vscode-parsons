import { Gap, UncompiledGap } from "../GapSupport/GapModel";
import { CodeLine } from "../model";
import { javaCommentParser } from "./Languages/Java";
import { pythonCommentParser } from "./Languages/Python";

export type ImplementedLanguage = "java" | "python";

export interface GapParserLanguage{
    /**
     * 
     * @param text the code that is annotated with gap definition comments
     * @returns a Map which uses a combination of the text and line number of the line of code
     *  and maps it to a list of comments that are below the line
     */
    findCommentsAndLines(text: string): Map<CodeLine, Array<string>>;
    /**
     * @param gap a gap object that should be added to a document.
     * @param indent how many times the new comment should be indented
     * @param indentationSymbol the indentation used in the current document,
     *  should be prepended to all lines of the comment @param indent times
     * @returns a string that is a valid comment in the relevant programming language,
     *  with all information from the @param gap inserted, and with correct indentation
     */
    createComment(gap: Gap, indent?: number, indentationSymbol?: string): string
    /**
     * @param comment a string that includes data that can be converted to a Gap object.
     * @returns a gap object extracted from the @param comment
     */
    getGapFromComment(comment: string): UncompiledGap
}

