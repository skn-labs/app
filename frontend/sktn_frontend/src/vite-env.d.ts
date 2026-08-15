/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_KAKAO_JS_KEY?: string
  readonly VITE_KAKAO_REDIRECT_URI?: string
  readonly VITE_APPLE_CLIENT_ID?: string
  readonly VITE_APPLE_REDIRECT_URI?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
