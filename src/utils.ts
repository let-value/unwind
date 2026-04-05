import { dirname, resolve } from "node:path";

export function* walkUp(path: string) {
  for (path = resolve(path); path; ) {
    yield path;
    const pp = dirname(path);
    if (pp === path) {
      break;
    } else {
      path = pp;
    }
  }
}
