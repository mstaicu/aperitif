/**
 * Basically, TypeScript has two kind of module types declaration:
 * "local" (normal modules) and ambient (global).
 * The second kind allows to write global modules declaration
 * that are merged with existing modules declaration. What are the differences between this files?
 * d.ts files are treated as an ambient module declarations only if they don't have any imports.
 * If you provide an import line, it's now treated as a normal module file, not the global one,
 * so augmenting modules definitions doesn't work.
 *
 * From TS 2.9 we are able to import types into global modules declaration using import() syntax
 */

declare namespace Express {
  export interface Request {
    user: import('../auth').UserSession;
  }
}
