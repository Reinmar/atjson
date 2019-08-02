import Document, {
  Annotation,
  ParseAnnotation,
  UnknownAnnotation
} from '@atjson/document';
import {
  Bold,
  Code,
  Heading,
  HTML,
  Image,
  Italic,
  Link,
  List
} from '@atjson/offset-annotations';
import Renderer, { Context } from '@atjson/renderer-hir';
import {
  BEGINNING_WHITESPACE,
  BEGINNING_WHITESPACE_PUNCTUATION,
  ENDING_WHITESPACE,
  ENDING_WHITESPACE_PUNCTUATION,
  WHITESPACE_PUNCTUATION
} from './lib/punctuation';
export * from './lib/punctuation';

function getPreviousChar(doc: Document, end: number) {
  let start = end;

  while (start > 0) {
    let parseAnnotations = doc.where(
      a => a instanceof ParseAnnotation && a.end >= start && a.start < start
    );
    if (parseAnnotations.length) {
      start = Math.min(...parseAnnotations.annotations.map(a => a.start));
    } else {
      break;
    }
  }

  let wrappingAnnotations = doc
    .where(
      a => !(a instanceof ParseAnnotation || a instanceof UnknownAnnotation)
    )
    .where(
      a =>
        (a.start >= start && a.start < end) || (a.end >= start && a.end <= end)
    );

  if (wrappingAnnotations.length) {
    return '';
  }

  return doc.content[start - 1];
}

function getNextChar(doc: Document, start: number) {
  let end = start;

  while (end < doc.content.length) {
    let parseAnnotations = doc.where(
      a => a instanceof ParseAnnotation && a.start <= end && a.end > end
    );
    if (parseAnnotations.length) {
      end = Math.max(...parseAnnotations.annotations.map(a => a.end));
    } else {
      break;
    }
  }

  let wrappingAnnotations = doc
    .where(
      a => !(a instanceof ParseAnnotation || a instanceof UnknownAnnotation)
    )
    .where(
      a =>
        (a.start >= start && a.start <= end) || (a.end > start && a.end <= end)
    );

  if (wrappingAnnotations.length) {
    return '';
  }

  return doc.content[end];
}

export function* splitDelimiterRuns(
  annotation: Annotation,
  context: Context,
  options: { escapeHtmlEntities: boolean } = { escapeHtmlEntities: true }
): Iterable<any> {
  let rawText = yield;
  let text = rawText.map(unescapeEntities).join('');
  let start = 0;
  let end = text.length;
  let match;

  while (start < end) {
    match = text.slice(start).match(BEGINNING_WHITESPACE_PUNCTUATION);
    if (!match) break;
    if (match[2]) {
      start += match[2].length;
    } else if (match[3]) {
      let prevChar = getPreviousChar(context.document, annotation.start);
      if (start === 0 && prevChar && !prevChar.match(WHITESPACE_PUNCTUATION)) {
        start += match[3].length;
      } else {
        break;
      }
    }
  }
  while (end > start) {
    match = text.slice(0, end).match(ENDING_WHITESPACE_PUNCTUATION);
    if (!match) break;
    if (match[2]) {
      end -= match[2].length;
    } else if (match[3]) {
      let nextChar = getNextChar(context.document, annotation.end);
      if (
        end === text.length &&
        nextChar &&
        !nextChar.match(WHITESPACE_PUNCTUATION)
      ) {
        end -= match[3].length;
      } else {
        break;
      }
    }
  }

  if (options.escapeHtmlEntities) {
    return [text.slice(0, start), text.slice(start, end), text.slice(end)].map(
      escapeHtmlEntities
    );
  } else {
    return [text.slice(0, start), text.slice(start, end), text.slice(end)].map(
      escapeEntities
    );
  }
}

export function* split(): Iterable<any> {
  let rawText = yield;
  let text = rawText.join('');
  let start = 0;
  let end = text.length;
  let match;

  while (start < end) {
    match = text.slice(start).match(BEGINNING_WHITESPACE);
    if (!match) break;
    start += match[1].length;
  }
  while (end > start) {
    match = text.slice(0, end).match(ENDING_WHITESPACE);
    if (!match) break;
    end -= match[1].length;
  }

  return [text.slice(0, start), text.slice(start, end), text.slice(end)];
}

// http://spec.commonmark.org/0.28/#backslash-escapes
function escapePunctuation(
  text: string,
  options: { escapeHtmlEntities: boolean } = { escapeHtmlEntities: true }
) {
  let escaped = text
    .replace(/([#!*+=\\\^_`{|}~])/g, '\\$1')
    .replace(/(\[)([^\]]*$)/g, '\\$1$2') // Escape bare opening brackets [
    .replace(/(^[^\[]*)(\].*$)/g, '$1\\$2') // Escape bare closing brackets ]
    .replace(/(\]\()/g, ']\\(') // Escape parenthesis ](
    .replace(/^(\s*\d+)\.(\s+)/gm, '$1\\.$2') // Escape list items; not all numbers
    .replace(/(^[\s]*)-/g, '$1\\-') // `  - list item`
    .replace(/(\r\n|\r|\n)([\s]*)-/g, '$1$2\\-'); // `- list item\n - list item`

  if (options.escapeHtmlEntities) {
    return escapeHtmlEntities(escaped);
  } else {
    return escapeEntities(escaped);
  }
}

function escapeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, '&amp;amp;')
    .replace(/&lt;/g, '&amp;lt;')
    .replace(/&nbsp;/g, '&amp;nbsp;')
    .replace(/</g, '&lt;')
    .replace(/\u00A0/gu, '&nbsp;');
}

function escapeEntities(text: string) {
  return text
    .replace(/&amp;/g, '&amp;amp;')
    .replace(/&nbsp;/g, '&amp;nbsp;')
    .replace(/\u00A0/gu, '&nbsp;');
}

function unescapeEntities(text: string) {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&nbsp;/gi, '\u00A0');
}

function escapeAttribute(text: string) {
  return text.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function getNumberOfRequiredBackticks(text: string) {
  let index = 0;
  let counts = [0];
  for (let i = 0, len = text.length; i < len; i++) {
    if (text[i] === '`') {
      counts[index] = counts[index] + 1;
    } else if (counts[index] !== 0) {
      counts.push(0);
      index++;
    }
  }

  return counts.sort().reduce((result, count) => {
    if (count === result) {
      return result + 1;
    }
    return result;
  }, 1);
}

export default class CommonmarkRenderer extends Renderer {
  /**
   * Controls whether HTML entities should be escaped. This
   * may be desireable if markdown is being generated for humans
   * and your markdown flavor doesn't support HTML.
   *
   * By default, `escapeHtmlEntities` is set to `true` if your
   * schema has an annotation with the type `html`. You can override
   * this configuration by passing in another parameter to the constructor.
   */
  protected options: {
    escapeHtmlEntities: boolean;
  };

  protected state: any;

  constructor(document: Document, options?: { escapeHtmlEntities: boolean }) {
    super(document);
    this.state = {};
    if (options == null) {
      let DocumentClass = document.constructor as typeof Document;
      this.options = {
        escapeHtmlEntities: !!DocumentClass.schema.find(a => a.type === 'html')
      };
    } else {
      this.options = options;
    }
  }

  text(text: string) {
    if (this.state.isPreformatted) {
      return text;
    }
    return escapePunctuation(text, this.options);
  }

  *root() {
    let rawText = yield;
    return rawText.join('');
  }

  /**
   * Bold text looks like **this** in Markdown.
   *
   * Asterisks are used here because they can split
   * words; underscores cannot split words.
   */
  *Bold(bold: Bold, context: Context): Iterable<any> {
    let [before, text, after] = yield* splitDelimiterRuns(
      bold,
      context,
      this.options
    );
    if (text.length === 0) {
      return before + after;
    } else {
      if (
        !context.previous &&
        !context.next &&
        context.parent instanceof Italic
      ) {
        return `${before}__${text}__${after}`;
      }
      return `${before}**${text}**${after}`;
    }
  }

  /**
   * > A block quote has `>` in front of every line
   * > it is on.
   * >
   * > It can also span multiple lines.
   */
  *Blockquote(): Iterable<any> {
    let text = yield;
    let lines: string[] = text.join('').split('\n');
    let endOfQuote = lines.length;
    let startOfQuote = 0;

    while (startOfQuote < endOfQuote - 1 && lines[startOfQuote].match(/^\s*$/))
      startOfQuote++;
    while (
      endOfQuote > startOfQuote + 1 &&
      lines[endOfQuote - 1].match(/^\s*$/)
    )
      endOfQuote--;

    let quote =
      lines
        .slice(startOfQuote, endOfQuote)
        .map(line => `> ${line}`)
        .join('\n') + '\n';

    if (!this.state.tight) {
      quote += '\n';
    }
    return quote;
  }

  /**
   * # Headings have 6 levels, with a single `#` being the most important
   *
   * ###### and six `#` being the least important
   *
   * If the heading spans multiple lines, then we will use the underline
   * style, using a series of `=` or `-` markers. This only works for
   * headings of level 1 or 2, so any other level will be broken.
   */
  *Heading(heading: Heading): Iterable<any> {
    let rawText = yield;
    let text = rawText.join('');
    let level = new Array(heading.attributes.level + 1).join('#');

    // Multiline headings are supported for level 1 and 2
    if (text.indexOf('\n') !== -1) {
      if (heading.attributes.level === 1) {
        return `${text}\n====\n`;
      } else if (heading.attributes.level === 2) {
        return `${text}\n----\n`;
      }
    }
    return `${level} ${text}\n`;
  }

  /**
   * A horizontal rule separates sections of a story
   * ***
   * Into multiple sections.
   */
  *HorizontalRule(): Iterable<any> {
    return '***\n';
  }

  /**
   * Images are embedded like links, but with a `!` in front.
   * ![CommonMark](http://commonmark.org/images/markdown-mark.png)
   */
  *Image(image: Image): Iterable<any> {
    let AltTextRenderer = this.constructor as typeof CommonmarkRenderer;
    if (image.attributes.title) {
      let title = image.attributes.title.replace(/"/g, '\\"');
      return `![${AltTextRenderer.render(
        image.attributes.description,
        this.options
      )}](${image.attributes.url} "${title}")`;
    }
    return `![${AltTextRenderer.render(
      image.attributes.description,
      this.options
    )}](${image.attributes.url})`;
  }

  /**
   * Italic text looks like *this* in Markdown.
   */
  *Italic(italic: Italic, context: Context): Iterable<any> {
    // This adds support for strong emphasis (per Commonmark)
    // Strong emphasis includes _*two*_ emphasis markers around text.
    let state = { ...this.state };
    this.state.isItalicized = true;

    let [before, text, after] = yield* splitDelimiterRuns(
      italic,
      context,
      this.options
    );
    this.state = state;

    if (text.length === 0) {
      return before + after;
    } else {
      let markup = state.isItalicized ? '_' : '*';
      let hasWrappingBoldMarkup =
        !context.previous && !context.next && context.parent instanceof Bold;
      let hasAdjacentBoldMarkup =
        (context.next instanceof Bold && after.length === 0) ||
        (context.previous instanceof Bold && before.length === 0);
      if (hasWrappingBoldMarkup || hasAdjacentBoldMarkup) {
        markup = '_';
      }
      return `${before}${markup}${text}${markup}${after}`;
    }
  }

  /**
   * A line break in Commonmark can be two white spaces at the end of the line  <--
   * or it can be a backslash at the end of the line\
   */
  *LineBreak(): Iterable<any> {
    return '  \n';
  }

  /**
   * A [link](http://commonmark.org) has the url right next to it in Markdown.
   */
  *Link(link: Link): Iterable<any> {
    let [before, text, after] = yield* split();
    let url = escapeAttribute(link.attributes.url);
    if (link.attributes.title) {
      let title = link.attributes.title.replace(/"/g, '\\"');
      return `${before}[${text}](${url} "${title}")${after}`;
    }
    return `${before}[${text}](${url})${after}`;
  }

  /**
   * A `code` span can be inline or as a block:
   *
   * ```js
   * function () {}
   * ```
   */
  *Code(code: Code, context: Context): Iterable<any> {
    let state = { ...this.state };
    Object.assign(this.state, { isPreformatted: true, htmlSafe: true });

    let rawText = yield;
    let text = rawText.join('');
    this.state = state;

    if (code.attributes.style === 'fence') {
      text = '\n' + text;
      let info = code.attributes.info || '';
      let newlines = '\n';
      if (this.state.isList && context.next) {
        newlines += '\n';
      }

      if (text.indexOf('```') !== -1) {
        return `~~~${info}${text}~~~${newlines}`;
      } else {
        return `\`\`\`${info}${text}\`\`\`${newlines}`;
      }
    } else if (code.attributes.style === 'block') {
      return (
        text
          .split('\n')
          .map((line: string) => `    ${line}`)
          .join('\n') + '\n'
      );
    } else {
      // MarkdownIt strips all leading and trailing whitespace from code blocks,
      // which means that we get an empty string for a single whitespace (` `).
      if (text.length === 0) {
        return '` `';

        // We need to properly escape backticks inside of code blocks
        // by using variable numbers of backticks.
      } else {
        let backticks = '`'.repeat(getNumberOfRequiredBackticks(text));
        return `${backticks}${text}${backticks}`;
      }
    }
  }

  *Html(html: HTML): Iterable<any> {
    let state = { ...this.state };
    Object.assign(this.state, { isPreformatted: true, htmlSafe: true });

    let rawText = yield;
    let text = rawText.join('');

    this.state = state;

    if (html.attributes.style === 'block') {
      return text + '\n';
    }
    return text;
  }

  /**
   * A list item is part of an ordered list or an unordered list.
   */
  *ListItem(): Iterable<any> {
    let digit: number = this.state.digit;
    let delimiter = this.state.delimiter;
    let marker: string = delimiter;
    if (this.state.type === 'numbered') {
      marker = `${digit}${delimiter}`;
      this.state.digit++;
    }

    let indent = ' '.repeat(marker.length + 1);
    let text = yield;
    let item = text.join('');
    let firstCharacter = 0;
    while (item[firstCharacter] === ' ') firstCharacter++;

    let lines: string[] = item.split('\n');
    lines.push((lines.pop() || '').replace(/[ ]+$/, ''));
    lines.unshift((lines.shift() || '').replace(/^[ ]+/, ''));
    let [first, ...rest] = lines;

    item =
      ' '.repeat(firstCharacter) +
      first +
      '\n' +
      rest
        .map(line => indent + line)
        .join('\n')
        .replace(/[ ]+$/, '');

    if (this.state.tight) {
      item = item.replace(/([ \n])+$/, '\n');
    }

    // Code blocks using spaces can follow lists,
    // however, they will be included in the list
    // if we don't adjust spacing on the list item
    // to force the code block outside of the list
    // See http://spec.commonmark.org/dingus/?text=%20-%20%20%20hello%0A%0A%20%20%20%20I%27m%20a%20code%20block%20_outside_%20the%20list%0A
    if (this.state.hasCodeBlockFollowing) {
      return ` ${marker}    ${item}`;
    }
    return `${marker} ${item}`;
  }

  /**
   * 1. An ordered list contains
   * 2. A number
   * 3. Of things with numbers preceding them
   */
  *List(list: List, context: Context): Iterable<any> {
    let start = 1;

    if (list.attributes.startsAt != null) {
      start = list.attributes.startsAt;
    }

    let delimiter = '';

    if (list.attributes.type === 'numbered') {
      delimiter = '.';

      if (
        context.previous instanceof List &&
        context.previous.attributes.type === 'numbered' &&
        context.previous.attributes.delimiter === '.'
      ) {
        delimiter = ')';
      }
    } else if (list.attributes.type === 'bulleted') {
      delimiter = '-';

      if (
        context.previous instanceof List &&
        context.previous.attributes.type === 'bulleted' &&
        context.previous.attributes.delimiter === '-'
      ) {
        delimiter = '+';
      }
    }
    list.attributes.delimiter = delimiter;

    let state = { ...this.state };

    // Handle indendation for code blocks that immediately follow a list.
    let hasCodeBlockFollowing =
      context.next instanceof Code && context.next.attributes.style === 'block';
    Object.assign(this.state, {
      isList: true,
      type: list.attributes.type,
      digit: start,
      delimiter,
      tight: list.attributes.tight,
      hasCodeBlockFollowing
    });

    let text = yield;

    this.state = state;
    return text.join('') + '\n';
  }

  /**
   * Paragraphs are delimited by two or more newlines in markdown.
   */
  *Paragraph(): Iterable<any> {
    let rawText = yield;
    let text = rawText.join('');

    // Remove leading and trailing newlines from paragraphs
    // with text in them.
    // This ensures that paragraphs preceded with tabs or spaces
    // will not turn into code blocks
    if (!text.match(/^\s+$/g)) {
      text = text.replace(/^\s+/g, '').replace(/\s+$/g, '');
    }

    if (this.state.tight) {
      return text + '\n';
    }
    return text + '\n\n';
  }
}
