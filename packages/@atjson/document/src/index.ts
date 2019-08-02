import Annotation, { AnnotationConstructor } from './annotation';
import {
  BlockAnnotation,
  InlineAnnotation,
  ObjectAnnotation,
  ParseAnnotation,
  UnknownAnnotation
} from './annotations';
import Change, {
  AdjacentBoundaryBehaviour,
  Deletion,
  Insertion
} from './change';
import AnnotationCollection from './collection';
import Join from './join';
import JSON from './json';

export interface AnnotationJSON {
  id?: string;
  type: string;
  start: number;
  end: number;
  attributes: JSON;
}

/**
 * AttributesOf returns a type that is the inferred attributes
 * of an annotation.
 *
 * If you're using Annotations with the ReactRenderer, you can
 * use the same types across your Annotations and Components.
 *
 * For example, a heading annotation:
 *
 * ```ts
 * import { BlockAnnotation } from '@atjson/document';
 *
 * export default Heading extends BlockAnnotation<{
 *   level: 1 | 2 | 3 | 4 | 5 | 6;
 * }> {
 *   static vendorPrefix = 'test';
 *   static type = 'heading';
 * }
 * ```
 *
 * You could then pull in the annotation and reuse it in React:
 *
 * ```ts
 * import * as React from 'react';
 * import { AttributesOf } from '@atjson/document';
 * import HeadingAnnotation from './heading';
 *
 * export const Heading: React.StatelessComponent<AttributesOf<HeadingAnnotation>> = () => {
 *   // React's propTypes are now { level: 1 | 2 | 3 | 4 | 5 | 6 }
 * };
 * ```
 */
type AttributesOf<AnnotationClass> = AnnotationClass extends Annotation<
  infer Attributes
>
  ? Attributes
  : never;

export {
  AdjacentBoundaryBehaviour,
  Annotation,
  AnnotationCollection,
  AnnotationConstructor,
  AttributesOf,
  BlockAnnotation,
  Change,
  Deletion,
  InlineAnnotation,
  Insertion,
  JSON,
  ObjectAnnotation,
  Join,
  ParseAnnotation,
  UnknownAnnotation
};

/**
 * Get the function that converts between two documents. Use this to grab a converter
 * for testing, or for nesting conversions.
 *
 * An example of how to use this is:
 * ```ts
 * import { getConverterFor } from '@atjson/document';
 * import OffsetSource from '@atjson/offset-annotations';
 * import CommonmarkSource from '@atjson/source-commonmark';
 *
 * let convertCommonmark = getConverterFor(CommonmarkSource, OffsetSource);
 * // or
 * let convertCommonmark = getConverterFor('application/vnd.atjson+commonmark', 'application/vnd.atjson+offset');
 * ```
 */
export function getConverterFor(
  from: typeof Document | string,
  to: typeof Document | string
): never | ((doc: Document) => Document) {
  let exports = (typeof window !== 'undefined' ? window : global) as any;
  let fromType = typeof from === 'string' ? from : from.contentType;
  let toType = typeof to === 'string' ? to : to.contentType;

  let converters = exports.__atjson_converters__;
  let converter = converters
    ? converters[fromType]
      ? converters[fromType][toType]
      : null
    : null;

  if (converter == null) {
    let fromName = typeof from === 'string' ? from : from.name;
    let toName = typeof to === 'string' ? to : to.name;
    throw new Error(
      `🚨 There is no converter registered between ${fromName} and ${toName}.\n\nDid you forget to \`import\` or \`require\` your converter?\n\nIf you haven't written a converter yet, register a converter for this:\n\n${fromName}.defineConverterTo(${toName}, doc => {\n  // ❤️ Write your converter here!\n  return doc;\n});`
    );
  }

  return converter;
}

export default class Document {
  static contentType: string;
  static schema: Array<AnnotationConstructor<any, any>> = [];

  static defineConverterTo(
    to: typeof Document,
    converter: (doc: Document) => Document
  ) {
    // We may have multiple / conflicting versions of
    // @atjson/document. To allow this, we need to
    // register converters on the global to ensure
    // that they can be shared across versions of the library.
    let exports = (typeof window !== 'undefined' ? window : global) as any;

    let converters = exports.__atjson_converters__;
    if (converters == null) {
      converters = exports.__atjson_converters__ = {};
    }

    if (converters[this.contentType] == null) {
      converters[this.contentType] = {};
    }

    if (!(to.prototype instanceof Document)) {
      throw new Error(
        `📦 We've detected that you have multiple versions of \`@atjson/document\` installed— ${to.name} doesn't extend the same Document class as ${this.name}.\nThis may be because @atjson/document is being installed as a sub-dependency of an npm package and as a top-level package, and their versions don't match. It could also be that your build includes two versions of @atjson/document.`
      );
    }
    converters[this.contentType][to.contentType] = converter;
  }

  content: string;
  readonly contentType: string;
  annotations: Array<Annotation<any>>;
  changeListeners: Array<() => void>;

  private pendingChangeEvent: any;

  constructor(options: {
    content: string;
    annotations: Array<AnnotationJSON | Annotation<any>>;
  }) {
    let DocumentClass = this.constructor as typeof Document;
    this.contentType = DocumentClass.contentType;
    this.changeListeners = [];
    this.content = options.content;
    this.annotations = options.annotations.map(annotation =>
      this.createAnnotation(annotation)
    );
  }

  /**
   * I'm on a plane; I'm not sure the best approach to cross-platform event
   * listeners and don't have internet access at the moment, so I'm just going
   * to quickly roll my own here. To be updated.
   */
  addEventListener(eventName: string, func: () => void): void {
    if (eventName !== 'change') {
      throw new Error('Unsupported event. `change` is the only constant.');
    }
    this.changeListeners.push(func);
  }

  /*
  removeEventListener(eventName: string, func: Function): void {
    throw new Error('Unimplemented.');
  }
  */

  /**
   * Annotations must be explicitly allowed unless they
   * are added to the annotations array directly- this is
   * acceptable, but side-affects created by queries will
   * not be called.
   */
  addAnnotations(
    ...annotations: Array<Annotation<any> | AnnotationJSON>
  ): void {
    this.annotations.push(
      ...annotations.map(annotation => this.createAnnotation(annotation))
    );
    this.triggerChange();
  }

  /**
   *
   * A simple example of this is transforming a document parsed from
   * an HTML document into a common format:
   *
   * html.where({ type: 'h1' }).set({ type: 'heading', attributes: { level: 1 }});
   *
   * When the attribute for `h1` is added to the document, it will
   * be swapped out for a `heading` with a level of 1.
   *
   * Other options available are renaming variables:
   *
   * html.where({ type: 'img' }).set({ 'attributes.src': 'attributes.url' });
   *
   * tk: join documentation
   */
  where(
    filter: { [key: string]: any } | ((annotation: Annotation<any>) => boolean)
  ) {
    return this.all().where(filter);
  }

  all() {
    return new AnnotationCollection(this, this.annotations);
  }

  removeAnnotation(annotation: Annotation<any>): Annotation<any> | void {
    let index = this.annotations.indexOf(annotation);
    if (index > -1) {
      this.triggerChange();
      return this.annotations.splice(index, 1)[0];
    }
  }

  replaceAnnotation(
    annotation: Annotation<any>,
    ...newAnnotations: Array<AnnotationJSON | Annotation<any>>
  ): Array<Annotation<any>> {
    let index = this.annotations.indexOf(annotation);
    if (index > -1) {
      let annotations = newAnnotations.map(newAnnotation =>
        this.createAnnotation(newAnnotation)
      );
      this.annotations.splice(index, 1, ...annotations);
      return annotations;
    }

    this.triggerChange();
    return [];
  }

  insertText(
    start: number,
    text: string,
    behaviour: AdjacentBoundaryBehaviour = AdjacentBoundaryBehaviour.default
  ) {
    if (start < 0 || start > this.content.length) {
      throw new Error('Invalid position.');
    }

    let insertion = new Insertion(start, text, behaviour);
    try {
      for (let i = this.annotations.length - 1; i >= 0; i--) {
        let annotation = this.annotations[i];
        annotation.handleChange(insertion);
      }

      this.content =
        this.content.slice(0, start) + text + this.content.slice(start);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error('Failed to insert text', e);
    }

    /*
        if (text.indexOf('\n') > -1) {
      let prevEnd: number;
      for (let j = this.annotations.length - 1; j >= 0; j--) {
        a = this.annotations[j];

        // This doesn't affect us.
        if (a.type !== 'block') continue;
        if (a.end < position) continue;
        if (position < a.start) continue;

        // First adjust the end of the current paragraph.
        prevEnd = a.end;
        a.end = position + 1;

        // And now add a new paragraph.
        this.addAnnotations({
          type: 'paragraph',
          display: 'block',
          start: position + 1,
          end: prevEnd
        });
      }
    }
    */
    this.triggerChange();
  }

  deleteText(
    start: number,
    end: number,
    behaviour: AdjacentBoundaryBehaviour = AdjacentBoundaryBehaviour.default
  ) {
    // This should really not just truncate annotations, but rather tombstone
    // the modified annotations as an atjson sub-document inside the annotation
    // that's being used to delete stuff.
    let deletion = new Deletion(start, end, behaviour);
    try {
      for (let i = this.annotations.length - 1; i >= 0; i--) {
        let annotation = this.annotations[i];
        annotation.handleChange(deletion);
      }
      this.content = this.content.slice(0, start) + this.content.slice(end);
    } catch (e) {
      // tslint:disable-next-line:no-console
      console.error('Failed to delete text', e);
    }

    /* to be moved to block annotation
      let potentialMergeAnnotations = { type: annotations[] }
      for (const type in potentialMergeAnnotations) {
        let annotations = potentialMergeAnnotations[type];
        annotations = annotations.sort((j, k) => j.start - k.start);
        for (let l = annotations.length - 1; l > 0; l--) {
          if (annotations[l - 1].end === annotations[l].start) { // && annotations[i-1].attributes.toJSON() === annotations[i].attributes.toJSON()) {
            annotations[l - 1].end = annotations[l].end;
            this.removeAnnotation(annotations[l]);
          }
        }
        */

    this.triggerChange();
  }

  /**
   * Slices return part of a document from the parent document.
   */
  slice(start: number, end: number): Document {
    let DocumentClass = this.constructor as typeof Document;
    let slicedAnnotations = this.where(a => {
      if (start < a.start) {
        return end > a.start;
      } else {
        return a.end > start;
      }
    });

    let doc = new DocumentClass({
      content: this.content,
      annotations: slicedAnnotations.map(annotation => annotation.clone())
    });
    doc.deleteText(end, doc.content.length);
    doc.deleteText(0, start);

    return doc;
  }

  convertTo<To extends typeof Document>(to: To): InstanceType<To> | never {
    let DocumentClass = this.constructor as typeof Document;
    let converter = getConverterFor(DocumentClass, to);

    class ConversionDocument extends DocumentClass {
      static schema = DocumentClass.schema.concat(to.schema);
      convertTo<Other extends typeof Document>(other: Other): never {
        throw new Error(
          `🚨 Don't nest converters! Instead, import \`getConverterFor\` and get the converter that way!\n\nimport { getConverterFor } from '@atjson/document';\n\n${
            DocumentClass.name
          }.defineConverterTo(${
            to.name
          }, doc => {\n  let convert${other.name.replace(
            'Source',
            ''
          )} = getConverterFor(${other.name}, ${
            to.name
          });\n  return convert${other.name.replace('Source', '')}(doc);\n});`
        );
      }
    }

    let convertedDoc = new ConversionDocument({
      content: this.content,
      annotations: this.where({}).sort().annotations
    });

    let result = converter(convertedDoc);
    return new to({
      content: result.content,
      annotations: result.where({}).sort().annotations
    }) as InstanceType<To>;
  }

  toJSON() {
    let DocumentClass = this.constructor as typeof Document;
    let schema = DocumentClass.schema;

    return {
      content: this.content,
      contentType: this.contentType,
      annotations: this.where({})
        .sort()
        .toJSON(),
      schema: schema.map(
        AnnotationClass =>
          `-${AnnotationClass.vendorPrefix}-${AnnotationClass.type}`
      )
    };
  }

  clone(): Document {
    let DocumentClass = this.constructor as typeof Document;
    return new DocumentClass({
      content: this.content,
      annotations: this.annotations.map(annotation => annotation.clone())
    });
  }

  match(
    regex: RegExp,
    start?: number,
    end?: number
  ): Array<{ start: number; end: number; matches: string[] }> {
    let content = this.content.slice(start, end);
    let offset = start || 0;
    let matches = [];

    let match;
    do {
      match = regex.exec(content);
      if (match) {
        matches.push({
          start: offset + match.index,
          end: offset + match.index + match[0].length,
          matches: match.slice()
        });
      }
    } while (regex.global && match);

    return matches;
  }

  private createAnnotation(
    annotation: Annotation<any> | AnnotationJSON
  ): Annotation<any> {
    let DocumentClass = this.constructor as typeof Document;
    let schema = [...DocumentClass.schema, ParseAnnotation];

    if (annotation instanceof UnknownAnnotation) {
      let KnownAnnotation = schema.find(AnnotationClass => {
        return (
          annotation.attributes.type ===
          `-${AnnotationClass.vendorPrefix}-${AnnotationClass.type}`
        );
      });

      if (KnownAnnotation) {
        return KnownAnnotation.hydrate(annotation.toJSON());
      }
      return annotation;
    } else if (annotation instanceof Annotation) {
      let AnnotationClass = annotation.constructor as AnnotationConstructor<
        any,
        any
      >;
      if (schema.indexOf(AnnotationClass) === -1) {
        let json = annotation.toJSON();
        return new UnknownAnnotation({
          id: json.id,
          start: json.start,
          end: json.end,
          attributes: {
            type: json.type,
            attributes: json.attributes
          }
        });
      }
      return annotation;
    } else {
      let ConcreteAnnotation = schema.find(AnnotationClass => {
        let fullyQualifiedType = `-${AnnotationClass.vendorPrefix}-${AnnotationClass.type}`;
        return annotation.type === fullyQualifiedType;
      });

      if (ConcreteAnnotation) {
        return ConcreteAnnotation.hydrate(annotation);
      } else {
        return new UnknownAnnotation({
          id: annotation.id,
          start: annotation.start,
          end: annotation.end,
          attributes: {
            type: annotation.type,
            attributes: annotation.attributes
          }
        });
      }
    }
  }

  /**
   * This is really coarse, just enough to allow different code in the editor to detect
   * changes in the document without handling that change management separately.
   *
   * Eventually it should be possible to handle this transactionally, but for
   * now we batch all changes enacted within one cycle of the event loop and
   * fire the change event only once. n.b that we don't send any information
   * about the changes here yet, but that's not to say we couldn't, but rather
   * it's not clear right now what the best approach would be so it's left
   * undefined.
   */
  private triggerChange() {
    if (this.pendingChangeEvent) return;
    this.pendingChangeEvent = setTimeout(() => {
      this.changeListeners.forEach(l => l());
      delete this.pendingChangeEvent;
    }, 0);
  }
}
