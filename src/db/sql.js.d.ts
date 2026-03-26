declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }

  interface Database {
    run(sql: string, params?: unknown[]): void
    exec(sql: string, params?: unknown[]): QueryExecResult[]
    export(): Uint8Array
    close(): void
  }

  interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string
    wasmBinary?: Uint8Array | ArrayBuffer
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>
  export type { Database, QueryExecResult, SqlJsStatic }
}

declare module 'sql.js/dist/sql-wasm-browser.js' {
  import initSqlJs, { type Database, type QueryExecResult, type SqlJsStatic } from 'sql.js'

  export default initSqlJs
  export type { Database, QueryExecResult, SqlJsStatic }
}
