import { HIR } from '@atjson/hir';
import OffsetSource from '@atjson/offset-annotations';
import HTMLSource from '../src';

describe('@atjson/source-html', () => {
  test('dataset', () => {
    let doc = HTMLSource.fromRaw(
      '<div class="spaceship" data-ship-id="92432" data-weapons="kittens"></div>'
    );
    expect(doc.where({ type: '-html-div' }).toJSON()).toMatchObject([
      {
        type: '-html-div',
        attributes: {
          '-html-class': 'spaceship',
          '-html-dataset': {
            '-html-ship-id': '92432',
            '-html-weapons': 'kittens'
          }
        }
      }
    ]);
  });

  test('pre-code', () => {
    let doc = HTMLSource.fromRaw(
      '<pre><code>this <b>is</b> a test</code></pre>'
    );
    let hir = new HIR(doc).toJSON();

    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'pre',
          attributes: {},
          children: [
            {
              type: 'code',
              attributes: {},
              children: [
                'this ',
                {
                  type: 'b',
                  attributes: {},
                  children: ['is']
                },
                ' a test'
              ]
            }
          ]
        }
      ]
    });
  });

  test('<p>aaa<br />\nbbb</p>', () => {
    let doc = HTMLSource.fromRaw('<p>aaa<br />\nbbb</p>');
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'p',
          attributes: {},
          children: [
            'aaa',
            { type: 'br', attributes: {}, children: [] },
            '\nbbb'
          ]
        }
      ]
    });
  });

  test('<a href="https://example.com">example</a>', () => {
    let doc = HTMLSource.fromRaw('<a href="https://example.com">example</a>');
    let hir = new HIR(doc).toJSON();

    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'a',
          attributes: {
            href: 'https://example.com'
          },
          children: ['example']
        }
      ]
    });
  });

  test('<img src="https://example.com/test.png" /> ', () => {
    let doc = HTMLSource.fromRaw('<img src="https://example.com/test.png" /> ');
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'img',
          attributes: {
            src: 'https://example.com/test.png'
          },
          children: []
        },
        ' '
      ]
    });
  });

  test('<h2></h2>\n<h1></h1>\n<h3></h3>', () => {
    let doc = HTMLSource.fromRaw('<h2></h2>\n<h1></h1>\n<h3></h3>');
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'h2',
          attributes: {},
          children: []
        },
        '\n',
        {
          type: 'h1',
          attributes: {},
          children: []
        },
        '\n',
        {
          type: 'h3',
          attributes: {},
          children: []
        }
      ]
    });
  });

  test('<p><img src="/url" alt="Foo" title="title" /></p>', () => {
    let doc = HTMLSource.fromRaw(
      '<p><img src="/url" alt="Foo" title="title" /></p>'
    );
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'p',
          attributes: {},
          children: [
            {
              type: 'img',
              attributes: {
                src: '/url',
                alt: 'Foo',
                title: 'title'
              },
              children: []
            }
          ]
        }
      ]
    });
  });

  test('<p>**<a href="**"></p>', () => {
    let doc = HTMLSource.fromRaw('<p>**<a href="**"></p>');
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'p',
          attributes: {},
          children: [
            '**',
            {
              type: 'a',
              attributes: {
                href: '**'
              },
              children: []
            }
          ]
        }
      ]
    });
  });

  test('&lt;&gt;', () => {
    let doc = HTMLSource.fromRaw('&lt;&gt;');
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: ['<>']
    });
  });

  test('<a href="https://en.wiktionary.org/wiki/%E6%97%A5%E6%9C%AC%E4%BA%BA"></a>', () => {
    let doc = HTMLSource.fromRaw(
      '<a href="https://en.wiktionary.org/wiki/%E6%97%A5%E6%9C%AC%E4%BA%BA"></a>'
    );
    let hir = new HIR(doc).toJSON();
    expect(hir).toMatchObject({
      type: 'root',
      attributes: {},
      children: [
        {
          type: 'a',
          attributes: {
            href: 'https://en.wiktionary.org/wiki/日本人'
          },
          children: []
        }
      ]
    });
  });

  describe('translator to common schema', () => {
    test('bold, strong', () => {
      let doc = HTMLSource.fromRaw('This <b>text</b> is <strong>bold</strong>');
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          'This ',
          {
            type: 'bold',
            attributes: {},
            children: ['text']
          },
          ' is ',
          {
            type: 'bold',
            attributes: {},
            children: ['bold']
          }
        ]
      });
    });

    test('i, em', () => {
      let doc = HTMLSource.fromRaw('This <i>text</i> is <em>italic</em>');
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          'This ',
          {
            type: 'italic',
            attributes: {},
            children: ['text']
          },
          ' is ',
          {
            type: 'italic',
            attributes: {},
            children: ['italic']
          }
        ]
      });
    });

    test('s, del', () => {
      let doc = HTMLSource.fromRaw(
        'This is some <del>deleted</del> and <s>struck</s> text'
      );
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          'This is some ',
          {
            type: 'strikethrough',
            attributes: {},
            children: ['deleted']
          },
          ' and ',
          {
            type: 'strikethrough',
            attributes: {},
            children: ['struck']
          },
          ' text'
        ]
      });
    });

    test('h1, h2, h3, h4, h5, h6', () => {
      let doc = HTMLSource.fromRaw(
        '<h1>Title</h1><h2>Byline</h2><h3>Section</h3><h4>Normal heading</h4><h5>Small heading</h5><h6>Tiny heading</h6>'
      );
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'heading',
            attributes: { level: 1 },
            children: ['Title']
          },
          {
            type: 'heading',
            attributes: { level: 2 },
            children: ['Byline']
          },
          {
            type: 'heading',
            attributes: { level: 3 },
            children: ['Section']
          },
          {
            type: 'heading',
            attributes: { level: 4 },
            children: ['Normal heading']
          },
          {
            type: 'heading',
            attributes: { level: 5 },
            children: ['Small heading']
          },
          {
            type: 'heading',
            attributes: { level: 6 },
            children: ['Tiny heading']
          }
        ]
      });
    });

    test('p, br', () => {
      let doc = HTMLSource.fromRaw('<p>This paragraph has a<br>line break</p>');
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'paragraph',
            attributes: {},
            children: [
              'This paragraph has a',
              {
                type: 'line-break',
                attributes: {},
                children: []
              },
              'line break'
            ]
          }
        ]
      });
    });

    test('a', () => {
      let doc = HTMLSource.fromRaw(
        'This <a href="https://condenast.com">is a link</a>'
      );
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          'This ',
          {
            type: 'link',
            attributes: {
              url: 'https://condenast.com'
            },
            children: ['is a link']
          }
        ]
      });
    });

    test('hr', () => {
      let doc = HTMLSource.fromRaw('Horizontal <hr> rules!');
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          'Horizontal ',
          {
            type: 'horizontal-rule',
            attributes: {},
            children: []
          },
          ' rules!'
        ]
      });
    });

    test('img', () => {
      let doc = HTMLSource.fromRaw(
        '<img src="https://pbs.twimg.com/media/DXiMcM9X4AEhR3u.jpg" alt="Miles Davis came out, blond, in gold lamé, and he plays really terrific music. High heels. 4/6/86" title="Miles Davis & Andy Warhol">'
      );
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'image',
            attributes: {
              url: 'https://pbs.twimg.com/media/DXiMcM9X4AEhR3u.jpg',
              description: {
                content:
                  'Miles Davis came out, blond, in gold lamé, and he plays really terrific music. High heels. 4/6/86',
                annotations: []
              },
              title: 'Miles Davis & Andy Warhol'
            },
            children: []
          }
        ]
      });
    });

    test('blockquote', () => {
      let doc = HTMLSource.fromRaw('<blockquote>This is a quote</blockquote>');
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'blockquote',
            attributes: {},
            children: ['This is a quote']
          }
        ]
      });
    });

    test('code', () => {
      let doc = HTMLSource.fromRaw(`<code>console.log('wowowowow');</code>`);
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'code',
            attributes: { style: 'inline' },
            children: [`console.log('wowowowow');`]
          }
        ]
      });
    });

    describe('code blocks', () => {
      test('pre code', () => {
        let doc = HTMLSource.fromRaw(
          `<pre> <code>console.log('wowowowow');</code>\n</pre>`
        );
        let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
        expect(hir).toMatchObject({
          type: 'root',
          attributes: {},
          children: [
            ' ',
            {
              type: 'code',
              attributes: { style: 'block' },
              children: [`console.log('wowowowow');`]
            },
            '\n'
          ]
        });
      });

      test('multiple code blocks inside of pre', () => {
        let doc = HTMLSource.fromRaw(
          `<pre><code>console.log('wow');</code><code>console.log('wowowow');</code></pre>`
        ).convertTo(OffsetSource);
        doc.where(a => a.type === 'unknown').remove();

        let hir = new HIR(doc).toJSON();
        expect(hir).toMatchObject({
          type: 'root',
          attributes: {},
          children: [
            {
              type: 'code',
              attributes: { style: 'inline' },
              children: [`console.log('wow');`]
            },
            {
              type: 'code',
              attributes: { style: 'inline' },
              children: [`console.log('wowowow');`]
            }
          ]
        });
      });

      test('text inside of pre, but not code', () => {
        let doc = HTMLSource.fromRaw(
          `<pre>hi<code>console.log('wowowow');</code></pre>`
        ).convertTo(OffsetSource);
        doc.where(a => a.type === 'unknown').remove();

        let hir = new HIR(doc).toJSON();
        expect(hir).toMatchObject({
          type: 'root',
          attributes: {},
          children: [
            'hi',
            {
              type: 'code',
              attributes: { style: 'inline' },
              children: [`console.log('wowowow');`]
            }
          ]
        });
      });
    });

    test('ul, ol, li', () => {
      let doc = HTMLSource.fromRaw(
        '<ol start="2"><li>Second</li><li>Third</li></ol><ul><li>First</li><li>Second</li></ul>'
      );
      let hir = new HIR(doc.convertTo(OffsetSource)).toJSON();
      expect(hir).toMatchObject({
        type: 'root',
        attributes: {},
        children: [
          {
            type: 'list',
            attributes: {
              type: 'numbered',
              startsAt: 2
            },
            children: [
              {
                type: 'list-item',
                attributes: {},
                children: ['Second']
              },
              {
                type: 'list-item',
                attributes: {},
                children: ['Third']
              }
            ]
          },
          {
            type: 'list',
            attributes: {
              type: 'bulleted'
            },
            children: [
              {
                type: 'list-item',
                attributes: {},
                children: ['First']
              },
              {
                type: 'list-item',
                attributes: {},
                children: ['Second']
              }
            ]
          }
        ]
      });
    });
  });
});
