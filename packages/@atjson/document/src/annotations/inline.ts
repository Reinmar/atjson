import Annotation from '../annotation';

export default abstract class InlineAnnotation<
  Attributes = {}
> extends Annotation<Attributes> {
  get rank() {
    return 100;
  }
}
