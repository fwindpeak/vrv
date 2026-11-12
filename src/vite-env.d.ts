/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_DEPLOY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
