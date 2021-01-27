declare namespace NodeJS {
  export interface ProcessEnv {
    API_ENVIRONMENT_FILE: string;

    NODE_ENV: 'development' | 'production';

    PORT: string;
    MORGAN_LEVEL: string;
    SIGNATURE: string;
  }
}
