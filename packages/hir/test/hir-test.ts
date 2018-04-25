import Document, { Annotation } from '@atjson/document';
import { HIR } from '@atjson/hir';
import schema from './schema';
import { bold, document, italic, li, ol, paragraph, ul } from './utils';

describe('@atjson/hir', () => {

  /**
   * FIXME I don't know how to test types. This just throws in compile time,
   * but we should test that invalid objects are in fact caught by the compiler. ???
   *
  it('rejects invalid documents', () => {
    let invalidDoc = { blah: 'x' };
    expect(() => new HIR(invalidDoc)).toThrow();
  });
   */

  it('accepts atjson-shaped object', () => {
    let validDoc = new Document({
      content: 'test\ndocument\n\nnew paragraph',
      annotations: [],
      schema
    });

    let expected = document('test\ndocument\n\nnew paragraph');
    expect(new HIR(validDoc)).toBeDefined();
    expect(new HIR(validDoc).toJSON()).toEqual(expected);
  });

  describe('constructs a valid hierarchy', () => {

    it('from a document without nesting', () => {
      let noNesting = new Document({
        content: 'A string with a bold and an italic annotation',
        annotations: [
          { type: 'bold', start: 16, end: 20 },
          { type: 'italic', start: 28, end: 34 }
        ],
        schema
      });

      let hir = new HIR(noNesting).toJSON();
      let expected = document(
        'A string with a ',
        bold('bold'),
        ' and an ',
        italic('italic'),
        ' annotation'
      );

      expect(hir).toEqual(expected);
    });

    it('from a document with nesting', () => {
      let nested = new Document({
        content: 'I have a list:\n\nFirst item plus bold text\n\n' +
                 'Second item plus italic text\n\nItem 2a\n\nItem 2b\n\nAfter all the lists',
        annotations: [
          { type: 'bold', start: 32, end: 36 },
          { type: 'italic', start: 60, end: 66 },
          { type: 'ordered-list', start: 16, end: 91 },
          { type: 'list-item', start: 16, end: 43 },
          { type: 'list-item', start: 43, end: 91 },
          { type: 'ordered-list', start: 73, end: 91 },
          { type: 'list-item', start: 73, end: 82 },
          { type: 'list-item', start: 82, end: 91 }
        ],
        schema
      });

      let expected = document(
        'I have a list:\n\n',
        ol(
          li('First item plus ', bold('bold'), ' text\n\n'),
          li('Second item plus ', italic('italic'), ' text\n\n',
            ol(
              li('Item 2a\n\n'),
              li('Item 2b\n\n')
            )
          )
        ),
        'After all the lists'
      );

      expect(new HIR(nested).toJSON()).toEqual(expected);
    });

    it('from a document with overlapping annotations at the same level', () => {
      let overlapping = new Document({
        content: 'Some text that is both bold and italic plus something after.',
        annotations: [
          { type: 'bold', start: 23, end: 31 },
          { type: 'italic', start: 28, end: 38 }
        ],
        schema
      });

      let expected = document(
        'Some text that is both ',
        bold('bold ', italic('and')),
        italic(' italic'),
        ' plus something after.'
      );

      expect(new HIR(overlapping).toJSON()).toEqual(expected);
    });

    it('from a document with overlapping annotations across heirarchical levels', () => {
      let spanning = new Document({
        content: 'A paragraph with some bold\n\ntext that continues into the next.',
        annotations: [
          { type: 'paragraph', start: 0, end: 28 },
          { type: 'paragraph', start: 28, end: 62 },
          { type: 'bold', start: 22, end: 32 }
        ],
        schema
      });

      let expected = document(
        paragraph(
          'A paragraph with some ',
          bold('bold\n\n'),
        ),
        paragraph(
          bold('text'),
          ' that continues into the next.'
        )
      );

      expect(new HIR(spanning).toJSON()).toEqual(expected);
    });

    it('from a zero-length document with annotations', () => {
      let zerolength = new Document({
        content: '',
        annotations: [
          { type: 'paragraph', start: 0, end: 0 },
          { type: 'bold', start: 0, end: 0 }
        ],
        schema
      });

      let expected = document( paragraph( bold() ) );

      expect(new HIR(zerolength).toJSON()).toEqual(expected);
    });

    it('from a document with zero-length paragraphs', () => {
      let zerolength = new Document({
        content: 'One fish\n\nTwo fish\n\n\n\nRed fish\n\nBlue fish',
        annotations: [
          { type: 'paragraph', start: 0, end: 8 },
          { type: 'parse-token', start: 8, end: 10 },
          { type: 'paragraph', start: 10, end: 18 },
          { type: 'parse-token', start: 18, end: 20 },
          { type: 'paragraph', start: 20, end: 22 },
          { type: 'parse-token', start: 20, end: 22 },
          { type: 'paragraph', start: 22, end: 30 },
          { type: 'parse-token', start: 30, end: 32 },
          { type: 'paragraph', start: 32, end: 41 }
        ],
        schema
      });

      let expected = document(
        paragraph('One fish'),
        paragraph('Two fish'),
        paragraph(),
        paragraph('Red fish'),
        paragraph('Blue fish')
      );

      expect(new HIR(zerolength).toJSON()).toEqual(expected);
    });

    it('from a document with a point annotation', () => {
      let zerolength = new Document({
        content: 'One fish\n\nTwo fish\n\n\n\nRed fish\n\nBlue fish',
        annotations: [
          { type: 'paragraph', start: 0, end: 8 },
          { type: 'parse-token', start: 8, end: 10 },
          { type: 'paragraph', start: 10, end: 18 },
          { type: 'parse-token', start: 18, end: 20 },
          { type: 'paragraph', start: 20, end: 22 },
          { type: 'parse-token', start: 20, end: 22 },
          { type: 'paragraph', start: 22, end: 30 },
          { type: 'parse-token', start: 30, end: 32 },
          { type: 'paragraph', start: 32, end: 41 },
          { type: 'bold', start: 21, end: 21 }
        ],
        schema
      });

      let expected = document(
        paragraph('One fish'),
        paragraph('Two fish'),
          paragraph(
            bold()
          ),
        paragraph('Red fish'),
        paragraph('Blue fish')
      );

      expect(new HIR(zerolength).toJSON()).toEqual(expected);
    });
  });
});
