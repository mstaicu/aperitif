declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    PORT: string;
    MORGAN_LEVEL: string;
    SIGNATURE: string;
  }
}
