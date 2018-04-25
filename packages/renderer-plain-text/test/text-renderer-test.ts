import Document, { Annotation } from '@atjson/document';
import PlainTextRenderer from '@atjson/renderer-plain-text';
import HTMLSource from '@atjson/source-html';

describe('PlainTextRenderer', function () {
  it('returns the text from the atjson document', function () {
    let renderer = new PlainTextRenderer();
    let annotations: Annotation[] = [{
      type: 'atjson',
      start: 0,
      end: 5,
      attributes: {
        contentType: 'text/plain',
        content: 'Call me Ishmael',
        annotations: []
      }
    }];

    let document = new Document({
      content: '☎️👨🏻⛵️🐳👌🏼',
      contentType: 'text/plain',
      annotations
    });
    let text = renderer.render(document);
    expect(text).toBe('☎️👨🏻⛵️🐳👌🏼');
  });

  it('strips virtual annotations', function () {
    let html = '<p>This is some <em>fancy</em> <span class="fancy">text</span>.';
    let doc = new HTMLSource(html);

    let renderer = new PlainTextRenderer();
    let text = renderer.render(doc);
    expect(text).toBe('This is some fancy text.');
  });
});
