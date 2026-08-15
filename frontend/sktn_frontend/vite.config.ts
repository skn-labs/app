import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      /**
       * ★ 세션 쿠키 방식이라 프록시를 쓰는 게 가장 안전합니다.
       *
       * 프론트(5173)와 API(8080)가 다른 출처면 브라우저가 쿠키를 "서드파티"로 보고
       * SameSite=None; Secure 를 요구합니다. http://localhost 에서는 이걸 맞추기 까다로워요.
       * 프록시를 쓰면 브라우저 입장에서는 전부 localhost:5173 한 곳이라 그 문제가 사라집니다.
       *
       * 이때 .env 의 VITE_API_BASE_URL 은 비워둬야 합니다(같은 출처로 요청).
       */
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          // 쿠키의 Domain 속성을 지워 localhost:5173 에 그대로 저장되게 합니다.
          cookieDomainRewrite: '',
        },
      },
    },
  }
})
