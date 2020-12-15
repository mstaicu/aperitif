/**
 * https://github.com/TypeStrong/ts-node#help-my-types-are-missing
 */
declare namespace Express {
  /**
   * Interface merging
   * https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces
   */
  interface Request {
    user: {
      id: number;
    };
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    PORT: string;
    MORGAN_LEVEL: string;
    SIGNATURE: string;
  }
}
