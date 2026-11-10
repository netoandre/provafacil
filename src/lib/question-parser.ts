/**
 * Parses pasted text to extract question statement and alternatives.
 * Supports formats like:
 *   A) text / a) text / A. text / a. text / (A) text / (a) text
 */

export interface ParsedQuestion {
  statement: string;
  alternatives: string[];
  type: 'objective' | 'subjective';
  score?: number;
}

const ALT_PATTERN = /^[\s]*(?:\(?([a-eA-E])\)|([a-eA-E])[).]\s)/;
const SCORE_PATTERN = /\(([\d,.]+)\s*(?:pt|pts|pontos|ponto)\)/i;
const QUESTION_NUM_PATTERN = /^[\s]*(?:(?:Questão|questão|QUESTÃO|Pergunta|pergunta)\s*\d+[\s).:;-]*|(\d+)\s*[).:-]\s)/;
const SEPARATOR_PATTERN = /^[\s]*[-*=]{3,}[\s]*$/;

/**
 * Parses a string to extract correct alternatives (A-E).
 * Supports: "1-A 2:B" (numbered) and "A B C" (sequential).
 */
export function parseAnswerKey(raw: string): Record<number, string> | string[] {
  // Try to find numbered patterns: "1-A", "2:B", "3)C", "4.D"
  const numberedPattern = /(\d+)[\s.:)-]+([a-eA-E])(?![a-zA-Z])/g;
  const numberedMatches: Record<number, string> = {};
  let match;
  let hasNumbers = false;

  while ((match = numberedPattern.exec(raw)) !== null) {
    numberedMatches[parseInt(match[1])] = match[2].toUpperCase();
    hasNumbers = true;
  }

  if (hasNumbers) return numberedMatches;

  // Fallback to sequential
  const sequentialMatches = raw.match(/\b[a-eA-E]\b/g);
  return sequentialMatches ? sequentialMatches.map(m => m.toUpperCase()) : [];
}


export function parseQuestionText(raw: string): ParsedQuestion | null {
  const lines = raw.split('\n').map(l => l.trimEnd());

  const statementLines: string[] = [];
  const alternatives: { letter: string; text: string }[] = [];
  let currentAlt: { letter: string; text: string } | null = null;

  for (const line of lines) {
    const match = line.match(ALT_PATTERN);
    if (match) {
      if (currentAlt) alternatives.push(currentAlt);
      const letter = (match[1] || match[2]).toUpperCase();
      const text = line.replace(ALT_PATTERN, '').trim();
      currentAlt = { letter, text };
    } else if (currentAlt) {
      if (line.trim()) {
        currentAlt.text += ' ' + line.trim();
      }
    } else {
      // If the first line of the question contains a number like "1) ", strip it.
      if (statementLines.length === 0) {
        const numMatch = line.match(QUESTION_NUM_PATTERN);
        if (numMatch) {
            statementLines.push(line.replace(QUESTION_NUM_PATTERN, '').trim());
            continue;
        }
      }
      statementLines.push(line);
    }
  }
  if (currentAlt) alternatives.push(currentAlt);

  let statement = statementLines.join('\n').trim();
  if (!statement && alternatives.length === 0) return null;

  // Extract and remove score from statement line if found
  let score: number | undefined;
  const scoreMatch = statement.match(SCORE_PATTERN);
  if (scoreMatch) {
      score = parseFloat(scoreMatch[1].replace(',', '.'));
      statement = statement.replace(SCORE_PATTERN, '').trim();
  }

  return {
    statement,
    alternatives: alternatives.map(a => a.text),
    type: alternatives.length > 0 ? 'objective' : 'subjective',
    score
  };
}

/**
 * Splits raw text containing multiple numbered questions into individual question blocks,
 * then parses each one.
 * Supports "---" as a manual separator.
 */
export function parseMultipleQuestions(raw: string): ParsedQuestion[] {
  const lines = raw.split('\n');
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isManualSeparator = SEPARATOR_PATTERN.test(trimmed);
    const isNumberedStart = QUESTION_NUM_PATTERN.test(trimmed);

    // If we've got a match for a new block AND we already have content, split.
    if ((isManualSeparator || isNumberedStart) && currentBlock.length > 0) {
      blocks.push(currentBlock);
      currentBlock = [];
    }

    // Don't add separator lines to the actual question content
    if (isManualSeparator) {
      continue;
    }

    // Just push the line as is, no stripping!
    currentBlock.push(line);
  }
  
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // If no numbered/manual splits were found, try parsing the whole text as a single question
  if (blocks.length === 0) {
    const parsed = parseQuestionText(raw);
    return parsed ? [parsed] : [];
  }

  const results: ParsedQuestion[] = [];
  for (const block of blocks) {
    const parsed = parseQuestionText(block.join('\n'));
    if (parsed) results.push(parsed);
  }
  return results;
}

