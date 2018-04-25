import Document from '@atjson/document';
import CommonMarkRenderer from '@atjson/renderer-commonmark';
import schema from '@atjson/schema';

describe('commonmark', () => {
  it('raw atjson document', () => {
    let document = new Document({
      content: 'Some text that is both bold and italic plus something after.',
      contentType: 'text/atjson',
      annotations: [
        { type: 'bold', start: 23, end: 31 },
        { type: 'italic', start: 28, end: 38 }
      ],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('Some text that is both **bold *and*** *italic* plus something after.');
  });

  it('a plain text document with virtual paragraphs', () => {
    let document = new Document({
      content: 'A paragraph with some bold\n\ntext that continues into the next.',
      annotations: [
        { type: 'paragraph', start: 0, end: 28 },
        { type: 'parse-token', start: 26, end: 28 },
        { type: 'paragraph', start: 28, end: 62 },
        { type: 'bold', start: 22, end: 32 }
      ],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe(
                 'A paragraph with some **bold**\n\n**text** that continues into the next.\n\n');
  });

  it('a list', () => {
    let document = new Document({
      content: ['I have a list:',
                'First item plus bold text',
                'Second item plus italic text',
                'Item 2a',
                'Item 2b',
                'After all the lists'].join(''),
      annotations: [
        { type: 'paragraph', start: 0, end: 14 },
        { type: 'bold', start: 30, end: 34 },
        { type: 'italic', start: 56, end: 62 },
        { type: 'list', attributes: { type: 'numbered', tight: true }, start: 14, end: 81 },
        { type: 'list-item', start: 14, end: 39 },
        { type: 'paragraph', start: 14, end: 39 },
        { type: 'list-item', start: 39, end: 81 },
        { type: 'paragraph', start: 39, end: 67 },
        { type: 'list', attributes: { type: 'bulleted', tight: true }, start: 67, end: 81 },
        { type: 'list-item', start: 67, end: 74 },
        { type: 'paragraph', start: 67, end: 74 },
        { type: 'list-item', start: 74, end: 81 },
        { type: 'paragraph', start: 74, end: 81 },
        { type: 'paragraph', start: 81, end: 100 }
      ],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe(
                 `I have a list:

1. First item plus **bold** text
2. Second item plus *italic* text
   - Item 2a
   - Item 2b

After all the lists

`);
  });

  it('links', () => {
    let document = new Document({
      content: 'I have a link',
      annotations: [{
        type: 'link', start: 9, end: 13, attributes: {
          url: 'https://example.com'
        }
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('I have a [link](https://example.com)');
  });

  it('images', () => {
    let document = new Document({
      content: '\uFFFC',
      annotations: [{
        type: 'image', start: 0, end: 1, attributes: {
          description: 'CommonMark',
          url: 'http://commonmark.org/images/markdown-mark.png'
        }
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('![CommonMark](http://commonmark.org/images/markdown-mark.png)');
  });

  describe('blockquote', () => {
    it('single quote', () => {
      let document = new Document({
        content: 'This is a quote\n\nThat has some\nlines in it.',
        annotations: [{
          type: 'blockquote', start: 0, end: 43
        }]
      });

      let renderer = new CommonMarkRenderer();
      expect(renderer.render(document)).toBe('> This is a quote\n> \n> That has some\n> lines in it.\n\n');
    });

    it('with a paragraph', () => {
      let document = new Document({
        content: 'This is a quoteAnd this is not.',
        annotations: [{
          type: 'blockquote', start: 0, end: 15
        }, {
          type: 'paragraph', start: 0, end: 15
        }, {
          type: 'paragraph', start: 15, end: 31
        }],
        schema
      });

      let renderer = new CommonMarkRenderer();
      expect(renderer.render(document)).toBe('> This is a quote\n\nAnd this is not.\n\n');
    });

    it('with flanking whitespace', () => {
      let document = new Document({
        content: '\n\nThis is a quote\nAnd this is not.',
        annotations: [{
          type: 'blockquote', start: 0, end: 18
        }, {
          type: 'paragraph', start: 2, end: 18
        }, {
          type: 'paragraph', start: 18, end: 34
        }],
        schema
      });

      let renderer = new CommonMarkRenderer();
      expect(renderer.render(document)).toBe('> This is a quote\n\nAnd this is not.\n\n');
    });

    it('with surrounding paragraphs', () => {
      let document = new Document({
        content: 'This is some text\n\nThis is a quote\n\nAnd this is not.',
        annotations: [{
          type: 'paragraph', start: 0, end: 19
        }, {
          type: 'parse-token', start: 17, end: 19
        }, {
          type: 'blockquote', start: 19, end: 36
        }, {
          type: 'paragraph', start: 19, end: 36
        }, {
          type: 'parse-token', start: 34, end: 36
        }, {
          type: 'paragraph', start: 36, end: 52
        }],
        schema
      });

      let renderer = new CommonMarkRenderer();
      expect(renderer.render(document)).toBe('This is some text\n\n> This is a quote\n\nAnd this is not.\n\n');
    });
  });

  it('handles horizontal-rules annotations', () => {
    let document = new Document({
      content: 'x\uFFFCy',
      contentType: 'text/atjson',
      annotations: [
        { type: 'paragraph', start: 0, end: 1 },
        { type: 'horizontal-rule', start: 1, end: 2 },
        { type: 'paragraph', start: 2, end: 3 }
      ],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('x\n\n***\ny\n\n');
  });

  it('headlines', () => {
    let document = new Document({
      content: 'Banner\nHeadline\n',
      annotations: [{
        type: 'heading', start: 0, end: 7, attributes: { level: 1 }
      }, {
        type: 'parse-token', start: 6, end: 7, attributes: { tokenType: 'newline' }
      }, {
        type: 'heading', start: 7, end: 16, attributes: { level: 2 }
      }, {
        type: 'parse-token', start: 15, end: 16, attributes: { tokenType: 'newline' }
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('# Banner\n## Headline\n');
  });

  it('moves spaces at annotation boundaries to the outside', () => {
    let document = new Document({
      content: 'This is bold text and a link.',
      annotations: [{
        type: 'bold', start: 8, end: 13
      }, {
        type: 'link', start: 23, end: 28, attributes: { url: 'https://example.com' }
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('This is **bold** text and a [link](https://example.com).');
  });

  test('unambiguous nesting of bold and italic', () => {
    let document = new Document({
      content: '\uFFFCbold then italic\uFFFC \uFFFCitalic then bold\uFFFC',
      annotations: [{
        type: 'parse-token', start: 0, end: 1
      }, {
        type: 'bold', start: 0, end: 18
      }, {
        type: 'italic', start: 1, end: 17
      }, {
        type: 'parse-token', start: 17, end: 18
      }, {
        type: 'parse-token', start: 19, end: 20
      }, {
        type: 'italic', start: 19, end: 37
      }, {
        type: 'bold', start: 20, end: 36
      }, {
        type: 'parse-token', start: 36, end: 37
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('**_bold then italic_** *__italic then bold__*');
  });

  test('empty format strings are removed', () => {
    let document = new Document({
      content: 'Some formatting on empty spaces',
      annotations: [{
        type: 'bold', start: 0, end: 0
      }, {
        type: 'italic', start: 4, end: 5
      }],
      schema
    });

    let renderer = new CommonMarkRenderer();
    expect(renderer.render(document)).toBe('Some formatting on empty spaces');
  });
});
