import { Display } from './schema';

export default interface Annotation {
  id?: string | number;
  type: string;
  display?: Display;
  start: number;
  end: number;

  attributes?: { [key: string]: any };

  transform?: (
    annotation: Annotation,
    content: string,
    position: number,
    length: number,
    preserveAdjacentBoundaries: boolean) => void;
}
