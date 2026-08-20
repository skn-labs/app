import { useDeferredValue, useEffect, useReducer, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, Check, ChevronRight, Clock3, ExternalLink, Globe2, History, Layers3, MessageCircle, PackageSearch, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { api } from '../lib/api'
import type { Conversation, ExperienceRecord, Message, Pattern, Product, Routine, WebSource } from '../lib/types'
import { BrandIdentity } from '../components/BrandIdentity'
import { ExperienceStatusGroup } from '../components/ExperienceStatusBadge'
import { AiBadge, AppHeader, AssetMotion, Button, Card, ErrorState, Loading, ProductGlyph, Screen, Skeleton } from '../components/ui'
import { startChatPath } from '../lib/chat'

const INITIAL_PROMPTS = [
  { label: '제품 추천', text: '내 사용 경험을 바탕으로 다음에 살펴볼 제품 후보를 찾아줘.', mode: 'RECOMMEND' },
  { label: '제품 검색', text: '제품 검색', mode: 'PRODUCT' },
  { label: '피부가 불편해졌어요', text: '피부가 불편해졌어요.', mode: 'RESCUE' },
]
const CHAT_MODES = new Set(['GENERAL', 'PRODUCT', 'RECOMMEND', 'PATTERN', 'RESCUE'])

// 이미 타이핑 애니메이션을 마친 메시지 id. 세션 동안 유지해 재방문·리렌더 시 다시 흐르지 않게 한다.
const streamedMessageIds = new Set<number>()

function parseServerTime(value: string) {
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

// 방금 도착한 답변만 타이핑한다. 과거 대화 기록을 열 때는 즉시 전체를 보여준다.
function isFreshMessage(createdAt: string) {
  const time = parseServerTime(createdAt)
  if (time === null) return true
  const age = Date.now() - time
  return age < 120_000 && age > -600_000
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

// 서버가 완성된 답변을 한 번에 주므로, 위에서부터 또르르 나오는 느낌은 클라이언트에서 점진 공개로 만든다.
function useTypewriter(text: string, active: boolean, onDone?: () => void, onReveal?: () => void) {
  const [count, setCount] = useState(() => (active ? 0 : text.length))
  const onDoneRef = useRef(onDone); onDoneRef.current = onDone
  const onRevealRef = useRef(onReveal); onRevealRef.current = onReveal
  useEffect(() => {
    if (!active) { setCount(text.length); return }
    if (!text.length || prefersReducedMotion()) { setCount(text.length); onDoneRef.current?.(); return }
    setCount(0)
    const total = text.length
    const duration = Math.min(650 + total * 8.5, 3600)
    const easeOut = (progress: number) => 1 - (1 - progress) * (1 - progress)
    let raf = 0
    let start = 0
    const frame = (now: number) => {
      if (!start) start = now
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.max(1, Math.round(easeOut(progress) * total)))
      onRevealRef.current?.()
      if (progress < 1) raf = requestAnimationFrame(frame)
      else onDoneRef.current?.()
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [text, active])
  return text.slice(0, active ? count : text.length)
}

export function AiLandingPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const submit = (value: string, mode = 'GENERAL') => { const prompt = value.trim(); if (prompt) navigate(startChatPath(mode, prompt)) }
  const selectStarter = (label: string) => { if (label === '제품 검색') { navigate('/ai/search'); return } const item = INITIAL_PROMPTS.find(prompt => prompt.label === label); if (item) submit(item.text, item.mode) }
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfcff]">
    <AiHeader/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-6">
      <div className="flex min-h-full flex-col items-center justify-center pb-2 text-center">
        <AiLandingVisual/>
        <h1 className="-mt-1 w-full text-[clamp(22px,6.5vw,27px)] font-[550] leading-[1.22] tracking-[-.032em] text-[#171816]"><span className="block whitespace-nowrap">SKN AI와 함께</span><span className="block whitespace-nowrap">내 기록에서 다음을 찾아봐요</span></h1>
        <p className="supporting-copy mx-auto mt-3 max-w-[330px] !leading-[1.5]">제품 정보와 내가 남긴 기록을 함께 살펴봐요.<br/>적합성을 단정하지 않고, 다음에 확인할 점을 정리해요.</p>
        <StarterSuggestions suggestions={INITIAL_PROMPTS.map(item => item.label)} onSelect={selectStarter}/>
      </div>
    </div>
    <Composer value={text} onChange={setText} onSubmit={submit} pending={false} placeholder="제품이나 내 사용 경험을 물어보세요"/>
  </Screen>
}

export function ProductSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const products = useQuery({
    queryKey: ['ai-product-search', deferredQuery],
    queryFn: () => api.products(deferredQuery, null, 12),
  })
  const selectProduct = (product: Product) => navigate(startChatPath('PRODUCT', `${product.brand} ${product.name}을 내 기록과 비교해줘.`, { productId: product.id }))
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfcff]">
    <AiHeader onBack={() => navigate('/ai')}/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-5">
      <p className="text-xs font-medium text-[#68708a]">제품 비교 시작하기</p>
      <h1 className="page-title mt-2">어떤 제품이 궁금한가요?</h1>
      <p className="mt-2 text-sm leading-5 text-[#7c8087]">정확한 제품과 버전을 고르면 현재 루틴·과거 경험과 함께 살펴봐요.</p>
      <label className="mt-6 flex h-[58px] items-center gap-3 rounded-[19px] border border-[#dce4f4] bg-[#f7f9fd] px-4 focus-within:border-[#91a8e8] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#eaf0ff]"><Search size={20} className="shrink-0 text-[#6d7582]"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="브랜드 또는 제품명" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#a4a9b0]"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기" className="grid size-8 place-items-center rounded-full bg-white text-[#777d85]"><X size={15}/></button>}</label>
      <section className="mt-7" aria-live="polite"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-medium text-[#646a72]">{deferredQuery ? `'${deferredQuery}' 검색 결과` : '내 화장품을 먼저 보여드려요'}</p>{products.data && <span className="text-xs text-[#9a9fa5]">{products.data.items.length}개</span>}</div>{products.isPending ? <ProductResultsSkeleton/> : products.isError ? <div className="rounded-[20px] bg-[#fff5f5] p-5 text-center"><p className="text-sm font-medium">제품을 불러오지 못했어요</p><button type="button" onClick={() => products.refetch()} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-danger"><RefreshCw size={14}/>다시 불러오기</button></div> : products.data?.items.length ? <div className="space-y-2.5">{products.data.items.map(product => <ProductSearchResult key={product.id} product={product} onSelect={() => selectProduct(product)}/>)}</div> : <div className="rounded-[22px] bg-[#f7f8fa] px-5 py-10 text-center"><PackageSearch className="mx-auto text-[#9ba1aa]"/><p className="mt-3 text-sm font-medium">일치하는 제품이 없어요</p><p className="mt-1 text-xs leading-5 text-[#858a91]">제품명의 일부나 브랜드명으로 다시 찾아보세요.</p></div>}</section>
    </div>
  </Screen>
}

export function ChatStartPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const started = useRef(false)
  const requestId = useRef(crypto.randomUUID())
  const requestedMode = params.get('mode') || 'GENERAL'
  const mode = CHAT_MODES.has(requestedMode) ? requestedMode : 'GENERAL'
  const prompt = params.get('prompt')?.trim() || '내 화장품 경험을 같이 봐줘.'
  const productId = Number(params.get('productId')) || undefined
  const experienceId = Number(params.get('experienceId')) || undefined
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId!), enabled: Boolean(productId) })
  const create = useMutation({
    mutationFn: () => api.createConversation(mode, prompt, { productId, experienceId }, requestId.current),
    onSuccess: value => {
      queryClient.setQueryData(['conversation', value.id], value)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      navigate(`/ai/${value.id}`, { replace: true })
    },
  })
  const startConversation = create.mutate
  useEffect(() => {
    if (started.current) return
    started.current = true
    startConversation()
  }, [startConversation])

  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfcff]">
    <AiHeader onBack={() => navigate('/ai')}/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-5">
      {productId && product.isPending && <ProductContextSkeleton/>}
      {product.data && <ProductContextCard product={product.data}/>} 
      <UserMessage text={shortPromptLabel(prompt, mode)}/>
      {!create.isError && <ThinkingPanel product={Boolean(productId)} recommend={mode === 'RECOMMEND'}/>}
      {create.isError && <RetryCard message={create.error.message} onRetry={() => create.mutate()}/>}
    </div>
    <Composer value="" onChange={() => {}} onSubmit={() => {}} pending placeholder="첫 답변을 준비하고 있어요…"/>
  </Screen>
}

export function ChatPage() {
  const { id } = useParams(); const conversationId = Number(id)
  const validConversationId = Number.isSafeInteger(conversationId) && conversationId > 0
  const navigate = useNavigate(); const queryClient = useQueryClient(); const bottomRef = useRef<HTMLDivElement>(null); const scrollRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [pendingMessage, setPendingMessage] = useState<{ text: string; requestId: string } | null>(null)
  const [openEvidence, setOpenEvidence] = useState<{ refs: string[]; webSources: WebSource[] } | null>(null)
  const conversation = useQuery({ queryKey: ['conversation', conversationId], queryFn: () => api.conversation(conversationId), enabled: validConversationId })
  // 렌더에서 파생: 방금 도착한 마지막 답변만 타이핑 대상. 상태로 두면 답변이 붙는 프레임과 타이핑 시작 사이에 전체가 번쩍 보이므로 계산으로 처리한다.
  const lastMessage = conversation.data?.messages.at(-1)
  const streamingId = lastMessage && lastMessage.role === 'ASSISTANT' && isFreshMessage(lastMessage.createdAt) && !streamedMessageIds.has(lastMessage.id) ? lastMessage.id : null
  const [, markStreamed] = useReducer((tick: number) => tick + 1, 0) // 타이핑 완료를 반영해 근거·추천·다음 질문을 드러낸다.
  const endStream = (messageId: number) => { streamedMessageIds.add(messageId); markStreamed() }
  // 타이핑 중에는 프레임마다 조금씩 늘어나므로 즉시 붙여도 부드럽다.
  const followStream = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight }
  // 맨 아래로 아주 부드럽고 천천히 감속하며 이동. 추천 제품이 늦게 로드돼 높이가 늘어나도 매 프레임 목표를 다시 잡아 훅 튀지 않는다.
  const followRaf = useRef<number | null>(null)
  const smoothFollowToBottom = () => {
    const el = scrollRef.current
    if (!el) return
    if (prefersReducedMotion()) { el.scrollTop = el.scrollHeight; return }
    if (followRaf.current) cancelAnimationFrame(followRaf.current)
    let start = 0
    let owned = el.scrollTop
    const followWindow = 2000
    const step = (now: number) => {
      if (!start) start = now
      if (Math.abs(el.scrollTop - owned) > 4) { followRaf.current = null; return } // 사용자가 직접 스크롤하면 멈춰 방해하지 않는다.
      const target = el.scrollHeight - el.clientHeight
      el.scrollTop += (target - el.scrollTop) * 0.05 // 천천히 감속
      owned = el.scrollTop
      followRaf.current = now - start < followWindow ? requestAnimationFrame(step) : null
    }
    followRaf.current = requestAnimationFrame(step)
  }
  // 답변이 끝나면 근거·시간은 바로, 추천 제품·다음 질문은 잠시 뜸 들였다가 스스륵 드러낸다.
  const [extrasReady, setExtrasReady] = useState(() => streamingId === null) // 타이핑으로 시작하면 첫 프레임부터 추가 요소를 숨겨 깜빡임을 막는다.
  const prevStreamingId = useRef<number | null>(streamingId)
  useEffect(() => {
    const was = prevStreamingId.current
    prevStreamingId.current = streamingId
    if (streamingId !== null) { setExtrasReady(false); return } // 타이핑 중에는 감춘다.
    if (was === null) { setExtrasReady(true); return } // 과거 대화 등 스트리밍이 없던 경우는 즉시 노출.
    setExtrasReady(false)
    const timer = setTimeout(() => { setExtrasReady(true); smoothFollowToBottom() }, 800) // 고의적인 뜸.
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingId])
  useEffect(() => () => { if (followRaf.current) cancelAnimationFrame(followRaf.current) }, [])
  const productId = conversation.data?.productId
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId!), enabled: Boolean(productId) })
  const send = useMutation({ mutationFn: (message: { text: string; requestId: string }) => api.sendMessage(conversationId, message.text, message.requestId), onSuccess: value => { queryClient.setQueryData(['conversation', conversationId], value); queryClient.invalidateQueries({ queryKey: ['conversations'] }); setPendingMessage(null) } })
  const apply = useMutation({ mutationFn: () => api.applyRescue(conversationId), onSuccess: value => { queryClient.invalidateQueries(); navigate(`/experiences/${value.id}`) } })
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [conversation.data?.messages.length, send.isPending])
  if (!validConversationId) return <Screen nav={false}><AiHeader onBack={() => navigate('/ai')}/><ErrorState message="대화 주소를 확인해주세요."/></Screen>
  if (conversation.isPending) return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfcff]"><AiHeader onBack={() => navigate('/ai')}/><Loading variant="chat" label="대화를 불러오는 중" className="flex-1"/></Screen>
  if (conversation.isError) return <Screen nav={false}><AiHeader onBack={() => navigate('/ai')}/><ErrorState message={conversation.error.message} onRetry={() => conversation.refetch()}/></Screen>
  const data = conversation.data
  const submit = (value: string) => { const message = value.trim(); if (message && !send.isPending) { const request = { text: message, requestId: crypto.randomUUID() }; setText(''); setPendingMessage(request); send.mutate(request) } }
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfcff]">
    <AiHeader onBack={() => navigate('/ai')}/>
    <div ref={scrollRef} className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
      {product.data && <ProductContextCard product={product.data}/>}
      <div className="space-y-5">{data.messages.map(message => message.role === 'USER' ? <UserMessage key={message.id} text={message.content} createdAt={message.createdAt}/> : <AssistantMessage key={message.id} message={message} recommend={data.mode === 'RECOMMEND'} streaming={message.id === streamingId} showProducts={message.id === lastMessage?.id ? extrasReady : true} onStreamEnd={() => endStream(message.id)} onReveal={followStream} onEvidence={() => setOpenEvidence({ refs: message.evidenceRefs, webSources: message.webSources || [] })}/>)}{pendingMessage && <UserMessage text={pendingMessage.text} pending/>}{send.isPending && <ThinkingPanel compact product={Boolean(productId)} recommend={data.mode === 'RECOMMEND'}/>}</div>

      {data.rescuePlan && extrasReady && <RescuePlanCard conversation={data} onApply={() => apply.mutate()} pending={apply.isPending}/>}
      {apply.isError && <p role="alert" className="mt-3 rounded-xl bg-[#fff5f5] p-3 text-xs leading-5 text-danger">{apply.error.message}</p>}
      {send.error && pendingMessage && <RetryCard message="메시지를 보내지 못했어요. 입력한 내용은 이 화면에 남아 있어요." onRetry={() => send.mutate(pendingMessage)}/>}
      {!send.isPending && !pendingMessage && extrasReady && <FollowUpQuestions suggestions={data.quickReplies} onSelect={submit}/>}
      <div ref={bottomRef}/>
    </div>
    <Composer value={text} onChange={setText} onSubmit={submit} pending={send.isPending} placeholder={data.mode === 'RESCUE' ? '지금 상태를 평소 말하듯 적어주세요' : '제품이나 내 사용 경험을 물어보세요'}/>
    {openEvidence && <EvidenceSheet refs={openEvidence.refs} webSources={openEvidence.webSources} onClose={() => setOpenEvidence(null)}/>}
  </Screen>
}

function StarterSuggestions({ suggestions, onSelect }: { suggestions: string[]; onSelect: (value: string) => void }) {
  return <div className="mt-6 flex max-w-[330px] flex-wrap justify-center gap-2" aria-label="AI 대화 시작 제안">{suggestions.map(suggestion => {
    const caution = isCautionSuggestion(suggestion)
    return <button type="button" key={suggestion} onClick={() => onSelect(suggestion)} className={`min-h-10 rounded-full border px-4 py-2 text-xs font-medium tracking-[-.01em] transition active:scale-[.98] ${caution ? 'border-[#efdad7] bg-[#fffafa] text-[#a55252]' : 'border-[#dce6f1] bg-white text-[#52647c]'}`}>{suggestion}</button>
  })}</div>
}

function FollowUpQuestions({ suggestions, onSelect }: { suggestions: string[]; onSelect: (value: string) => void }) {
  if (!suggestions.length) return null
  return <section className="skn-stream-in mb-1 mt-7" aria-label="이어지는 질문">
    <p className="px-1 text-xs font-semibold tracking-[-.01em] text-[#596b82]">이어지는 질문</p>
    <div className="mt-2 divide-y divide-[#e5ebf2] border-y border-[#e5ebf2]">{suggestions.slice(0, 3).map(suggestion => {
      const caution = isCautionSuggestion(suggestion)
      return <button type="button" key={suggestion} onClick={() => onSelect(suggestion)} className={`flex min-h-[50px] w-full items-center gap-3 py-3 text-left transition active:bg-[#f2f6fb] ${caution ? 'text-[#a55252]' : 'text-[#33445a]'}`}><span className="min-w-0 flex-1 text-[13px] font-medium leading-5 tracking-[-.012em]">{suggestion}</span><Plus size={17} strokeWidth={1.8} className="shrink-0 opacity-55"/></button>
    })}</div>
  </section>
}

function Composer({ value, onChange, onSubmit, pending, placeholder }: { value: string; onChange: (value: string) => void; onSubmit: (value: string) => void; pending: boolean; placeholder: string }) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(value) }
  useEffect(() => { const input = inputRef.current; if (!input) return; input.style.height = '0px'; input.style.height = `${Math.min(input.scrollHeight, 112)}px` }, [value])
  return <div className="safe-bottom z-30 shrink-0 px-5 pb-3 pt-3">
    <form onSubmit={submit} className="flex items-end gap-2 rounded-[22px] border border-[#d4e5f6] bg-[#edf6ff] p-1.5 pl-4 shadow-[0_8px_28px_rgba(82,117,161,.08)] transition focus-within:border-[#a9c8e8] focus-within:bg-[#f5f9ff] focus-within:ring-4 focus-within:ring-[#dcecff]/70"><textarea ref={inputRef} disabled={pending} rows={1} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(value) } }} placeholder={placeholder} aria-label="AI에게 메시지 보내기" className="max-h-28 min-h-12 flex-1 resize-none overflow-y-auto bg-transparent py-3 text-base leading-6 text-[#1e2b3d] outline-none placeholder:text-[#8499b3] disabled:cursor-wait"/><button type="submit" disabled={pending || !value.trim()} aria-label="보내기" className="grid size-12 shrink-0 place-items-center text-[#607ea8] transition active:scale-95 disabled:text-[#b6c6da]"><Send size={20} strokeWidth={2}/></button></form>
  </div>
}

function AiHeader({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: api.conversations, enabled: historyOpen })
  const historyButton = <button type="button" onClick={() => setHistoryOpen(true)} aria-label="AI 대화 기록 열기" aria-haspopup="dialog" aria-expanded={historyOpen} className="grid size-11 place-items-center rounded-full text-[#273247] transition hover:bg-[#eef2f8] active:scale-95"><History size={20} strokeWidth={1.9}/></button>
  return <>
    <AppHeader back onBack={onBack || (() => navigate('/'))} profile={false} sticky right={historyButton}/>
    {historyOpen && <AiHistory conversations={conversations.data || []} loading={conversations.isPending} error={conversations.error?.message} onRetry={() => conversations.refetch()} onClose={() => setHistoryOpen(false)}/>}
  </>
}

function AiHistory({ conversations, loading, error, onRetry, onClose }: { conversations: Conversation[]; loading: boolean; error?: string; onRetry: () => void; onClose: () => void }) {
  const navigate = useNavigate()
  const dialog = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.current?.focus({ preventScroll: true })
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current() }
    window.addEventListener('keydown', closeOnEscape)
    return () => { window.removeEventListener('keydown', closeOnEscape); previousFocus?.focus({ preventScroll: true }) }
  }, [])
  const startNew = () => { onClose(); navigate('/ai') }
  return <div className="skn-sheet-backdrop fixed inset-0 z-50 flex justify-center bg-[#111827]/30 backdrop-blur-[3px]" onPointerDown={onClose}>
    <div className="flex h-full w-full max-w-[430px] justify-end overflow-hidden">
      <aside ref={dialog} role="dialog" aria-modal="true" aria-labelledby="history-title" tabIndex={-1} className="safe-bottom flex h-full w-[89%] max-w-[360px] animate-slide-in flex-col overflow-hidden rounded-l-[28px] border-l border-white/80 bg-[#fbfcfe] shadow-[-22px_0_64px_rgba(22,30,45,.18)] outline-none" onPointerDown={event => event.stopPropagation()}>
        <header className="safe-top shrink-0 border-b border-[#e9edf3] bg-white/95">
          <div className="flex items-center justify-between gap-4 px-5 pb-5 pt-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[.09em] text-[#71809a]">SKN AI</p>
              <h2 id="history-title" className="mt-1 text-[26px] font-semibold leading-tight tracking-[-.04em] text-[#151b26]">대화 기록</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="대화 기록 닫기" className="grid size-11 shrink-0 place-items-center rounded-full border border-[#e7ebf1] bg-[#f7f9fc] text-[#596273] transition hover:border-[#d6dde8] hover:bg-white active:scale-95"><X size={18} strokeWidth={1.9}/></button>
          </div>
        </header>

        <div className="shrink-0 px-5 pt-5">
          <button type="button" onClick={startNew} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111722] text-sm font-semibold tracking-[-.015em] text-white shadow-[0_8px_20px_rgba(17,23,34,.16)] transition hover:bg-black active:scale-[.985]"><Plus size={18} strokeWidth={2}/>새 대화 시작</button>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-7 pt-5" aria-live="polite">
          {loading ? <div className="space-y-2.5" role="status" aria-label="대화 기록을 불러오는 중">{[0, 1, 2, 3].map(index => <div key={index} className="flex items-center gap-3 rounded-[20px] border border-[#e6eaf0] px-3.5 py-3.5"><Skeleton className="size-10 shrink-0 rounded-[14px]"/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><Skeleton className={index % 2 ? 'h-3.5 w-28 rounded-full' : 'h-3.5 w-36 rounded-full'}/><Skeleton className="h-2.5 w-10 rounded-full"/></div><Skeleton className="mt-2 h-3 w-4/5 rounded-full"/></div></div>)}</div>
            : error ? <div className="rounded-[22px] border border-[#f1d9d9] bg-[#fff8f8] px-5 py-8 text-center"><p className="text-xs leading-5 text-danger">{error}</p><button type="button" onClick={onRetry} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full border border-[#efcece] bg-white px-4 text-xs font-semibold text-[#9c4545] transition active:scale-95"><RefreshCw size={14}/>다시 불러오기</button></div>
              : conversations.length ? <section aria-label={`저장된 AI 대화 ${conversations.length}개`}>
                <p className="mb-3 text-[11px] font-semibold tracking-[.06em] text-[#8a93a2]">최근 대화 {conversations.length}</p>
                <div className="space-y-2.5">{conversations.map(item => <Link key={item.id} to={`/ai/${item.id}`} className="group flex items-center gap-3 rounded-[20px] border border-[#e6eaf0] bg-white px-3.5 py-3.5 shadow-[0_4px_14px_rgba(42,56,82,.045)] transition hover:border-[#d3dbe8] hover:shadow-[0_7px_18px_rgba(42,56,82,.08)] active:scale-[.985]" onClick={onClose}>
                  <div className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#eef3fc] text-[#5d6f91] transition group-hover:bg-[#e7eefb]"><MessageCircle size={17} strokeWidth={1.9}/></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold tracking-[-.015em] text-[#202735]">{titleFor(item)}</p><span className="shrink-0 text-[10px] font-medium text-[#9aa1ad]">{historyTime(item)}</span></div>
                    <p className="mt-1 truncate text-[11px] leading-4 text-[#7d8490]">{item.messages.at(-1)?.content}</p>
                    <span className="mt-2 inline-flex rounded-full bg-[#f0f4fb] px-2 py-1 text-[10px] font-semibold leading-none text-[#66789a]">{modeLabel(item.mode)}</span>
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-[#a9b2c0] transition group-hover:translate-x-0.5"/>
                </Link>)}</div>
              </section>
                : <div className="rounded-[24px] border border-[#e6eaf0] bg-white px-5 py-12 text-center shadow-[0_4px_14px_rgba(42,56,82,.04)]"><div className="mx-auto grid size-12 place-items-center rounded-[17px] bg-[#eef3fc] text-[#7484a1]"><MessageCircle size={20}/></div><p className="mt-4 text-sm font-semibold text-[#252c38]">아직 대화가 없어요</p><p className="mt-2 text-xs leading-5 text-[#858d99]">제품이나 루틴에 대해 물어보면<br/>여기에서 다시 이어볼 수 있어요.</p></div>}
        </div>
      </aside>
    </div>
  </div>
}

function AiMotion({ size }: { size: 'hero' | 'loading' | 'tiny' }) {
  const dimensions = size === 'hero' ? 'size-[124px] rounded-full' : size === 'loading' ? 'size-[64px]' : 'size-11'
  return <AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" loop className={dimensions}/>
}

function AiLandingVisual() {
  return <div className="ai-landing-visual" aria-hidden="true">
    <div className="ai-landing-halo"/>
    <div className="ai-landing-waves">
      <svg className="ai-landing-wave-track ai-landing-wave-fill" viewBox="0 0 920 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ai-wave-fill" x1="0" y1="70" x2="0" y2="220" gradientUnits="userSpaceOnUse"><stop stopColor="#e9f1fc" stopOpacity=".46"/><stop offset="1" stopColor="#f8faff" stopOpacity="0"/></linearGradient>
        </defs>
        <path d="M0 128C58 82 172 82 230 128C288 174 402 174 460 128C518 82 632 82 690 128C748 174 862 174 920 128V220H0V128Z" fill="url(#ai-wave-fill)"/>
      </svg>
      <svg className="ai-landing-wave-track ai-landing-wave-one" viewBox="0 0 920 220" fill="none" preserveAspectRatio="none">
        <path d="M0 128C58 82 172 82 230 128C288 174 402 174 460 128C518 82 632 82 690 128C748 174 862 174 920 128" stroke="#b8ccec" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <svg className="ai-landing-wave-track ai-landing-wave-two" viewBox="0 0 920 220" fill="none" preserveAspectRatio="none">
        <path d="M0 151C92 113 155 113 230 151C305 189 368 189 460 151C552 113 615 113 690 151C765 189 828 189 920 151" stroke="#c8d8f1" strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <svg className="ai-landing-wave-track ai-landing-wave-three" viewBox="0 0 920 220" fill="none" preserveAspectRatio="none">
        <path d="M0 101C72 65 158 65 230 101C302 137 388 137 460 101C532 65 618 65 690 101C762 137 848 137 920 101" stroke="#c3d1e6" strokeWidth=".9" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </svg>
    </div>
    <div className="ai-landing-orb"><AiMotion size="hero"/></div>
  </div>
}

function ThinkingPanel({ compact = false, product = false, recommend = false }: { compact?: boolean; product?: boolean; recommend?: boolean }) {
  const text = product ? '제품 정보와 내 기록을 연결하고 있어요' : recommend ? '관련 경험과 제품 후보를 함께 살펴보고 있어요' : '내 기록에서 관련된 경험을 찾고 있어요'
  return <div className={`${compact ? 'py-1' : 'mt-5'} flex items-center gap-3`} aria-live="polite"><AiMotion size={compact ? 'tiny' : 'loading'}/><div><p className="text-xs font-medium text-[#65758c]">{text}</p><div className="mt-2 w-fit rounded-full border border-[#dce8f5] bg-[#eef5fd] px-3 py-2"><TypingDots/></div></div></div>
}

function TypingDots() {
  return <span className="flex gap-1.5" aria-label="AI 답변 작성 중"><span className="size-1.5 animate-bounce rounded-full bg-[#839bbc]"/><span className="size-1.5 animate-bounce rounded-full bg-[#839bbc] [animation-delay:120ms]"/><span className="size-1.5 animate-bounce rounded-full bg-[#839bbc] [animation-delay:240ms]"/></span>
}

function UserMessage({ text, createdAt, pending = false }: { text: string; createdAt?: string; pending?: boolean }) {
  return <div className="flex flex-col items-end"><div className="w-fit max-w-[84%] rounded-[20px] border border-[#cfe0ff] bg-white px-4 py-2.5 text-sm leading-6 text-black"><MessageContent text={text}/></div><span className="mt-1.5 px-1 text-xs text-[#a0a5ac]">{pending ? '보내는 중…' : createdAt ? messageTime(createdAt) : ''}</span></div>
}

function AssistantMessage({ message, recommend, streaming = false, showProducts = true, onStreamEnd, onReveal, onEvidence }: { message: Message; recommend: boolean; streaming?: boolean; showProducts?: boolean; onStreamEnd?: () => void; onReveal?: () => void; onEvidence: () => void }) {
  const [done, setDone] = useState(!streaming)
  // 다른 답변이 새로 타이핑을 시작해 이 답변이 중단되면(스트리밍 해제) 근거·시간이 끝까지 감춰지지 않도록 완료 처리한다.
  useEffect(() => { if (!streaming) setDone(true) }, [streaming])
  const revealed = useTypewriter(message.content, streaming && !done, () => { setDone(true); onStreamEnd?.() }, onReveal)
  const hasEvidence = message.evidenceRefs.length > 0 || (message.webSources?.length ?? 0) > 0
  return <article className="w-full">
    <div className="mb-2 flex items-center gap-2 px-1"><span className="grid size-7 place-items-center rounded-full border border-[#dce7f4] bg-white"><img src="/skn-assets/skn-mark.png" alt="" className="h-3.5 w-auto"/></span><span className="text-[11px] font-semibold tracking-[.04em] text-[#617592]">SKN AI</span></div>
    <div className="w-fit max-w-[94%] rounded-[8px_22px_22px_22px] border border-[#dce8f5] bg-[linear-gradient(145deg,#f2f7fd_0%,#f8fbff_100%)] px-4 py-4 text-[#1d2a3b] shadow-[0_8px_24px_rgba(68,91,124,.055)]"><MessageContent text={revealed} markdown caret={!done}/>{done && message.status === 'FALLBACK' && <div className="skn-stream-in mt-4 flex items-start gap-2 border-t border-[#dbe6f2] pt-4 text-xs leading-5 text-[#718198]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#6e88ac]"/>외부 AI 연결 없이 저장된 내 데이터로 답했어요.</div>}{done && hasEvidence && <div className="skn-stream-in"><EvidenceSummary refs={message.evidenceRefs} webSources={message.webSources || []} onOpen={onEvidence}/></div>}</div>
    {done && <span className="skn-stream-in mt-1.5 block px-1 text-xs text-[#a0a9b5]">{messageTime(message.createdAt)}</span>}{done && recommend && showProducts && <RecommendedProductLinks refs={message.evidenceRefs}/>}
  </article>
}

function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-5 rounded-[18px] border border-[#f1d8d8] bg-[#fff7f7] p-4 text-xs leading-5 text-[#9a4848]"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 font-medium"><RefreshCw size={14}/>같은 메시지 다시 보내기</button></div>
}

function ProductSearchResult({ product, onSelect }: { product: Product; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 rounded-[20px] border border-[#cfe0ff] bg-white p-3 text-left transition hover:border-[#a9c6f3] active:scale-[.99]"><ProductGlyph category={product.category} src={product.imageUrl} size="sm"/><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-1.5"><BrandIdentity name={product.brand} logoUrl={product.brandLogoUrl} size="xs" className="min-w-0" nameClassName="text-[#6f88b2]"/><span className="shrink-0 text-xs text-[#8b94a1]">· {product.category}</span>{product.owned && <span className="shrink-0 rounded-full border border-[#cfe0ff] px-1.5 py-0.5 text-xs font-medium text-[#667da3]">내 화장품</span>}</span><span className="mt-1 block truncate text-sm font-medium tracking-[-.02em]">{product.name}</span><span className="mt-1 block text-xs text-[#737880]">{product.volume}{product.versionLabel ? ` · ${product.versionLabel} 버전` : ''}{product.personalRecordCount ? ` · 내 경험 ${product.personalRecordCount}건` : ''}</span></span><ChevronRight size={17} className="shrink-0 text-[#737880]"/></button>
}

function ProductResultsSkeleton() {
  return <div className="space-y-2.5" role="status" aria-label="제품 검색 결과 불러오는 중">{[1, 2, 3].map(item => <div key={item} className="flex items-center gap-3 rounded-[20px] border border-[#edf0f3] p-3"><Skeleton className="h-14 w-12 rounded-2xl"/><div className="flex-1"><Skeleton className="h-2.5 w-20 rounded-full"/><Skeleton className="mt-2 h-3.5 w-4/5 rounded-full"/><Skeleton className="mt-2 h-2.5 w-28 rounded-full"/></div></div>)}</div>
}

function messageTime(value: string) {
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function historyTime(item: Conversation) {
  const value = item.messages.at(-1)?.createdAt
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'))
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(date)
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(date)
}

function modeLabel(mode: Conversation['mode']) {
  if (mode === 'PRODUCT') return '제품 비교'
  if (mode === 'RECOMMEND') return '제품 탐색'
  if (mode === 'PATTERN') return '내 패턴'
  if (mode === 'RESCUE') return '불편함 확인'
  return '일반 대화'
}

function shortPromptLabel(prompt: string, mode: string) {
  if (mode === 'RECOMMEND') return '제품 추천'
  if (mode === 'PRODUCT') return '제품 검색'
  return prompt
}

function isCautionSuggestion(value: string) {
  const compact = value.replace(/\s/g, '')
  if (compact.includes('않아요') || compact.includes('아니에요')) return false
  return compact.includes('불편') || compact.includes('빠르게심해') || compact.includes('악화') || compact.includes('따가')
}

function ProductContextCard({ product }: { product: Product }) {
  return <section className="mb-5 overflow-hidden rounded-[22px] border border-[#cdddf3] bg-[linear-gradient(135deg,#f5f8ff_0%,#fff_72%)]">
    <div className="flex items-center gap-4 p-4"><div className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-white"><ProductGlyph category={product.category} size="sm" src={product.imageUrl}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">선택한 제품</span><span className="text-xs text-muted">{product.category}</span></div><BrandIdentity name={product.brand} logoUrl={product.brandLogoUrl} size="xs" className="mt-2 max-w-full"/><h2 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5">{product.name}</h2><p className="mt-1 text-xs text-muted">{product.volume}</p></div></div>
    <div className="border-t border-[#e2e8f3] bg-white/65 px-4 py-2.5 text-xs font-medium text-accent">SKN AI에게 이 제품을 내 기록과 비교해달라고 요청했어요.</div>
  </section>
}

function ProductContextSkeleton() {
  return <section className="mb-5 flex items-center gap-4 rounded-[22px] border border-[#cdddf3] bg-[#f5f8ff] p-4" role="status" aria-label="선택한 제품 불러오는 중">
    <Skeleton className="size-[72px] shrink-0 rounded-2xl"/><div className="min-w-0 flex-1"><Skeleton className="h-5 w-20 rounded-full"/><Skeleton className="mt-3 h-3 w-24 rounded-full"/><Skeleton className="mt-2 h-4 w-full rounded-full"/><Skeleton className="mt-2 h-3 w-16 rounded-full"/></div>
  </section>
}

function RescuePlanCard({ conversation, onApply, pending }: { conversation: Conversation; onApply: () => void; pending: boolean }) {
  const plan = conversation.rescuePlan!
  if (plan.status === 'BLOCKED') return <Card className="mt-7 border-[#f1d1d1] bg-[#fff8f8]"><p className="text-sm font-semibold text-danger">제품 분석을 멈췄어요</p><p className="mt-2 text-xs leading-5 text-muted">{plan.rationale}</p></Card>
  if (plan.status === 'APPLIED') return <Card className="mt-7 border-[#d6e9ac] bg-[#f8fde9]"><div className="flex items-center gap-2 text-sm font-semibold"><Check size={18}/>새 루틴으로 적용했어요</div><p className="mt-2 text-xs text-muted">이번 루틴은 독립된 새 사용 경험으로 기록됩니다.</p></Card>
  return <Card className="mt-7 border-[#cdddf3] bg-[#f5f8ff]"><AiBadge/><p className="mt-3 text-lg font-semibold tracking-[-.02em]">{plan.title}</p><p className="mt-2 text-xs leading-5 text-muted">{plan.rationale}</p>{plan.removeProductName && <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-xs font-semibold text-muted">먼저 빼고 확인</p><p className="mt-1 text-sm font-medium">{plan.removeProductName}</p></div><ArrowRight size={17} className="text-accent"/></div>}<Button disabled={pending} onClick={onApply} className="mt-4 w-full">{pending ? '루틴 만드는 중…' : '이 루틴으로 시작'}</Button><p className="mt-2 text-center text-xs text-muted">적용하기 전에는 현재 루틴을 바꾸지 않아요.</p></Card>
}

function titleFor(item: Conversation) {
  if (item.mode === 'RESCUE') return '불편함 확인'
  if (item.mode === 'PRODUCT') return '제품 비교'
  if (item.mode === 'RECOMMEND') return '다음 제품 탐색'
  if (item.mode === 'PATTERN') return '내 패턴 해석'
  return item.messages.find(message => message.role === 'USER')?.content || '새 AI 대화'
}

function MessageContent({ text, markdown = false, caret = false }: { text: string; markdown?: boolean; caret?: boolean }) {
  if (!markdown) return <p className="whitespace-pre-wrap">{text}</p>
  // 타이핑 중에는 마지막 블록을 inline으로 만들어 커서가 마지막 글자 바로 뒤에 붙게 한다.
  return <div className={`min-w-0 text-sm leading-6 text-ink${caret ? ' [&>*:last-child]:mb-0 [&>*:last-child]:inline' : ''}`}>
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold tracking-[-.025em] first:mt-0">{children}</h2>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold tracking-[-.025em] first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold tracking-[-.015em] first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
        ul: ({ children }) => <ul className="mb-3 ml-1 list-disc space-y-1.5 pl-5 marker:text-accent last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-1 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-accent last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5 leading-6">{children}</li>,
        blockquote: ({ children }) => <blockquote className="my-3 rounded-r-xl border-l-3 border-accent bg-accent-soft px-3 py-2 text-muted">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" aria-label={`출처 ${String(children)} 새 창에서 열기`} className="mx-0.5 inline-flex min-w-5 -translate-y-px items-center justify-center rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-semibold leading-4 text-accent no-underline ring-1 ring-inset ring-[#cdddf3]">{children}</a>,
        hr: () => <hr className="my-4 border-line"/>,
        table: ({ children }) => <div className="my-3 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-72 border-collapse text-xs">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-line bg-soft px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top last:border-b-0">{children}</td>,
        code: ({ children }) => <code className="rounded bg-soft px-1.5 py-0.5 text-xs font-medium">{children}</code>,
      }}
    >{text}</ReactMarkdown>
    {caret && <span className="skn-caret ml-0.5 inline-block h-4 w-[7px] translate-y-[3px] rounded-[2px] bg-[#7c93b8] align-baseline" aria-hidden="true"/>}
  </div>
}

function EvidenceSummary({ refs, webSources, onOpen }: { refs: string[]; webSources: WebSource[]; onOpen: () => void }) {
  const counts = refs.reduce<Record<string, number>>((all, ref) => {
    const label = ref.startsWith('PT-') ? '패턴' : ref.startsWith('P-') ? '제품 정보' : ref.startsWith('R-') ? '루틴' : '내 경험'
    all[label] = (all[label] || 0) + 1
    return all
  }, {})
  const labels = [...(webSources.length ? [`외부 출처 ${webSources.length}`] : []), ...Object.entries(counts).map(([label, count]) => `${label} ${count}`)]
  return <button type="button" onClick={onOpen} aria-haspopup="dialog" className="mt-4 flex w-full items-center gap-3 border-t border-[#dbe6f2] pt-3.5 text-left transition active:opacity-60"><span className="shrink-0 text-xs font-semibold text-[#435d80]">답변 근거</span><span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium text-[#7b8ca2]">{labels.join(' · ')}</span><ChevronRight size={15} className="shrink-0 text-[#758ba8]"/></button>
}

function RecommendedProductLinks({ refs }: { refs: string[] }) {
  const productIds = [...new Set(refs
    .filter(ref => ref.startsWith('P-') && !ref.startsWith('PT-'))
    .map(ref => Number(ref.slice(2)))
    .filter(Number.isFinite))].slice(0, 3)
  const products = useQueries({ queries: productIds.map(id => ({ queryKey: ['product', id], queryFn: () => api.product(id) })) })
  if (!productIds.length) return null
  if (products.some(result => result.isPending)) return <div className="skn-soft-in -mx-5 mt-4" role="status" aria-label="추천 제품 불러오는 중"><div className="hide-scrollbar flex gap-3 overflow-hidden px-5">{productIds.map(id => <Skeleton key={id} className="h-[232px] w-[184px] shrink-0 rounded-[24px]"/>)}</div></div>
  const loaded = products.flatMap(result => result.data ? [result.data] : [])
  if (!loaded.length) return null
  return <section className="-mx-5 mt-5" aria-label="AI 답변에 나온 제품">
    <div className="skn-soft-in mb-2.5 flex items-center justify-between px-5"><p className="text-xs font-semibold tracking-[-.01em] text-[#465a76]">답변에 나온 제품</p><span className="text-[11px] font-medium text-[#8a99ad]">{loaded.length}개</span></div>
    <div className="hide-scrollbar flex snap-x snap-mandatory scroll-pl-5 gap-3 overflow-x-auto px-5 pb-3">{loaded.map((product, index) => <Link key={product.id} to={`/products/${product.id}`} style={{ animationDelay: `${120 + index * 130}ms` }} className="skn-soft-in group w-[184px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-[#dbe7f4] bg-white shadow-[0_9px_25px_rgba(57,79,111,.07)] transition active:scale-[.985]">
      <div className="relative grid h-[148px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#f0f6fd_60%,#e9f2fc_100%)]"><span className="absolute left-3 top-3 rounded-full border border-white/90 bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-[#6d819e] backdrop-blur">{product.category}</span><span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white/85 text-[#607a9f] shadow-sm"><ChevronRight size={14}/></span><span className="translate-y-2 scale-[.68]"><ProductGlyph category={product.category} src={product.imageUrl} size="lg"/></span></div>
      <div className="min-h-[88px] border-t border-[#e6edf5] px-3.5 py-3"><BrandIdentity name={product.brand} logoUrl={product.brandLogoUrl} size="xs" className="max-w-full" nameClassName="text-[#71829a]"/><span className="mt-1.5 line-clamp-2 block text-sm font-semibold leading-5 tracking-[-.02em] text-[#1e2a3a]">{product.name}</span></div>
    </Link>)}</div>
  </section>
}

function EvidenceSheet({ refs, webSources, onClose }: { refs: string[]; webSources: WebSource[]; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const uniqueRefs = [...new Set(refs)]
  const needsProducts = uniqueRefs.some(ref => ref.startsWith('P-') && !ref.startsWith('PT-'))
  const needsRoutines = uniqueRefs.some(ref => ref.startsWith('R-'))
  const needsRecords = uniqueRefs.some(ref => ref.startsWith('E-'))
  const needsPatterns = uniqueRefs.some(ref => ref.startsWith('PT-'))
  const productIds = uniqueRefs.filter(ref => ref.startsWith('P-') && !ref.startsWith('PT-')).map(ref => Number(ref.slice(2))).filter(Number.isFinite)
  const productQueries = useQueries({ queries: productIds.map(id => ({ queryKey: ['product', id], queryFn: () => api.product(id) })) })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, enabled: needsRoutines, retry: false })
  const baseline = useQuery({ queryKey: ['baseline-routine'], queryFn: api.baselineRoutine, enabled: needsRoutines, retry: false })
  const records = useQuery({ queryKey: ['records'], queryFn: api.records, enabled: needsRecords })
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: api.patterns, enabled: needsPatterns })
  const loadedProducts = productQueries.flatMap(result => result.data ? [result.data] : [])
  const loading = (needsProducts && productQueries.some(result => result.isPending)) || ((current.isPending || baseline.isPending) && needsRoutines) || (records.isPending && needsRecords) || (patterns.isPending && needsPatterns)
  const evidence = uniqueRefs.map(ref => resolveEvidence(ref, loadedProducts, [current.data, baseline.data].filter(Boolean) as Routine[], records.data || [], patterns.data || []))

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.current?.focus({ preventScroll: true })
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current() }
    window.addEventListener('keydown', closeOnEscape)
    return () => { window.removeEventListener('keydown', closeOnEscape); previousFocus?.focus({ preventScroll: true }) }
  }, [])

  return <div className="skn-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-0 backdrop-blur-[2px]" onPointerDown={onClose}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="evidence-title" tabIndex={-1} className="skn-sheet-surface safe-bottom flex max-h-[82dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[30px] bg-paper shadow-[0_-18px_60px_rgba(23,24,22,.18)] outline-none" onPointerDown={event => event.stopPropagation()}>
      <div className="shrink-0 px-5 pb-4 pt-3"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d9dcd6]"/><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-accent">ANSWER SOURCES</p><h2 id="evidence-title" className="mt-1 text-2xl font-semibold tracking-[-.035em]">이 답변에 쓴 근거</h2><p className="mt-2 text-xs leading-5 text-muted">웹에서 확인한 자료와 내 기록을 분리해서 보여줘요.</p></div><button type="button" onClick={onClose} aria-label="근거 닫기" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-muted shadow-sm"><X size={19}/></button></div></div>
      <div className="overflow-y-auto border-t border-line px-5 py-5">
        {webSources.length > 0 && <section><p className="mb-3 text-xs font-semibold text-muted">웹에서 확인한 자료</p><div className="space-y-3">{webSources.map(source => <WebSourceCard key={source.ref} source={source}/>)}</div></section>}
        {loading ? <div className="min-h-44 space-y-3 py-3" role="status" aria-label="답변 근거를 불러오는 중"><Skeleton className="h-20 rounded-[20px]"/><Skeleton className="h-20 rounded-[20px]"/></div> : evidence.length > 0 && <section className={webSources.length ? 'mt-6' : ''}><p className="mb-3 text-xs font-semibold text-muted">내 데이터</p><div className="space-y-3">{evidence.map(item => <EvidenceCard key={item.ref} item={item}/>)}</div></section>}
        <div className="mt-5 rounded-2xl bg-soft p-4 text-xs leading-5 text-muted"><b className="text-ink">근거를 읽는 법</b><br/>P1은 제품 공식정보, P2는 공공기관, P3는 연구 자료, P4는 보조 자료예요. 연결된 자료는 적합성이나 원인을 증명하지 않아요.</div>
      </div>
    </section>
  </div>
}

function WebSourceCard({ source }: { source: WebSource }) {
  const tier = sourceTier(source.tier)
  let host = source.url
  try { host = new URL(source.url).hostname.replace(/^www\./, '') } catch { /* 서버가 이미 검증한 URL */ }
  return <a href={source.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[20px] border border-[#dde4f0] bg-[linear-gradient(135deg,#fafaff_0%,#fff_76%)] transition active:scale-[.99]">
    <div className="flex gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Globe2 size={18}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-[#cdddf3]">{source.ref.replace('S-', '')}</span><span className="text-xs font-semibold text-muted">{tier}</span></div><h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{source.title}</h3><p className="mt-1 truncate text-xs text-muted">{host}</p></div><ExternalLink size={16} className="mt-1 shrink-0 text-muted transition group-hover:text-accent"/></div>
  </a>
}

function sourceTier(tier: WebSource['tier']) {
  if (tier === 'P1') return 'P1 · 제품 공식정보'
  if (tier === 'P2') return 'P2 · 공공기관'
  if (tier === 'P3') return 'P3 · 연구 자료'
  return 'P4 · 보조 자료'
}

type ResolvedEvidence = { ref: string; kind: 'PRODUCT' | 'ROUTINE' | 'RECORD' | 'PATTERN' | 'UNKNOWN'; eyebrow: string; title: string; subtitle?: string; brandName?: string; brandLogoUrl?: string | null; details: string[]; sentiment?: ExperienceRecord['sentiment']; discomfort?: ExperienceRecord['discomfort'] }

function resolveEvidence(ref: string, products: Product[], routines: Routine[], records: ExperienceRecord[], patterns: Pattern[]): ResolvedEvidence {
  const id = Number(ref.split('-').at(-1))
  if (ref.startsWith('PT-')) {
    const pattern = patterns.find(item => item.id === id)
    return pattern ? { ref, kind: 'PATTERN', eyebrow: '연결된 패턴', title: pattern.title, subtitle: `지지 ${pattern.supportingCount}건 · 반대 ${pattern.contradictingCount}건`, details: [pattern.summary] } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('P-')) {
    const product = products.find(item => item.id === id)
    return product ? { ref, kind: 'PRODUCT', eyebrow: product.facts.length ? '출처에서 확인한 제품 정보' : '선택한 제품', title: product.name, subtitle: `${product.category}${product.volume ? ` · ${product.volume}` : ''}`, brandName: product.brand, brandLogoUrl: product.brandLogoUrl, details: product.facts.map(fact => fact.text).slice(0, 5) } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('R-')) {
    const routine = routines.find(item => item.id === id)
    return routine ? { ref, kind: 'ROUTINE', eyebrow: '내가 등록한 루틴', title: routine.name, subtitle: `${routine.items.length}개 제품 · ${routine.status === 'CURRENT' ? '현재 사용' : '이전 루틴'}`, details: routine.items.map((item, index) => `${index + 1}. ${item.productName} · ${timeSlotLabel(item.timeSlot)} · ${item.frequency}`) } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('E-')) {
    const record = records.find(item => item.id === id)
    return record ? { ref, kind: 'RECORD', eyebrow: '내가 남긴 사용 경험', title: record.productName, subtitle: formatEvidenceDate(record.createdAt), details: [record.note, record.tags.length ? record.tags.join(' · ') : ''].filter(Boolean), sentiment: record.sentiment, discomfort: record.discomfort } : unresolvedEvidence(ref)
  }
  return unresolvedEvidence(ref)
}

function unresolvedEvidence(ref: string): ResolvedEvidence {
  return { ref, kind: 'UNKNOWN', eyebrow: '연결된 근거', title: '상세 정보를 불러오지 못했어요', details: ['답변은 그대로 보존했어요. 잠시 후 다시 열어보세요.'] }
}

function EvidenceCard({ item }: { item: ResolvedEvidence }) {
  const icon = item.kind === 'PRODUCT' ? <BadgeCheck size={18}/> : item.kind === 'ROUTINE' ? <Layers3 size={18}/> : item.kind === 'RECORD' ? <Clock3 size={18}/> : <Sparkles size={18}/>
  return <article className="overflow-hidden rounded-[20px] border border-line bg-white"><div className="flex gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-accent">{item.eyebrow}</p><h3 className="mt-1 text-sm font-semibold leading-5">{item.title}</h3>{item.sentiment && <ExperienceStatusGroup sentiment={item.sentiment} discomfort={item.discomfort} className="mt-2"/>}{item.brandName && <BrandIdentity name={item.brandName} logoUrl={item.brandLogoUrl} size="xs" className="mt-2 max-w-full"/>}{item.subtitle && <p className="mt-1.5 text-xs text-muted">{item.subtitle}</p>}</div></div>{item.details.length > 0 && <div className="divide-y divide-[#eceef1] border-t border-line bg-[#fcfcfa] px-4">{item.details.map((detail, index) => <p key={index} className="py-2.5 text-xs leading-5 text-muted">{detail}</p>)}</div>}</article>
}

function timeSlotLabel(value: Routine['items'][number]['timeSlot']) { return value === 'MORNING' ? '아침' : value === 'EVENING' ? '저녁' : '아침·저녁' }
function formatEvidenceDate(value: string) { const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
