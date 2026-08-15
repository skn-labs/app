import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

type State = { failed: boolean }

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return <main className="grid h-dvh place-items-center bg-white px-7 text-center text-ink">
      <div>
        <img src="/skn-assets/skn-mark.png" alt="SKN" className="mx-auto h-12 w-auto"/>
        <h1 className="mt-7 text-xl font-medium tracking-[-.03em]">화면을 이어서 열지 못했어요</h1>
        <p className="mx-auto mt-3 max-w-72 text-sm leading-6 text-muted">작성 중인 서버 기록은 그대로 보존됩니다. 화면을 새로 불러와 다시 이어주세요.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-7 min-h-12 rounded-full bg-ink px-7 text-sm font-medium text-white">다시 불러오기</button>
      </div>
    </main>
  }
}
