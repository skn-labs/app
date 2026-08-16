import { useDeferredValue, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, BadgeCheck, BookOpen, Check, ChevronRight, Clock3, ExternalLink, Globe2, History, Layers3, MessageCircle, PackageSearch, Plus, RefreshCw, Search, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { api } from '../lib/api'
import type { Conversation, ExperienceRecord, Pattern, Product, Routine, WebSource } from '../lib/types'
import { AiBadge, AppHeader, AssetMotion, Button, Card, ErrorState, ProductGlyph, Screen } from '../components/ui'
import { startChatPath } from '../lib/chat'

const INITIAL_PROMPTS = [
  { label: '제품 추천', text: '내 사용 경험을 바탕으로 다음에 살펴볼 제품 후보를 찾아줘.', mode: 'RECOMMEND' },
  { label: '제품 검색', text: '제품 검색', mode: 'PRODUCT' },
  { label: '피부가 불편해졌어요', text: '피부가 불편해졌어요.', mode: 'RESCUE' },
]
const CHAT_MODES = new Set(['GENERAL', 'PRODUCT', 'RECOMMEND', 'PATTERN', 'RESCUE'])

export function AiLandingPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const submit = (value: string, mode = 'GENERAL') => { const prompt = value.trim(); if (prompt) navigate(startChatPath(mode, prompt)) }
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
    <AiHeader/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-9 pb-8 pt-10">
      <AiMotion size="hero"/>
      <h1 className="page-title mt-7">무엇이 궁금하신가요?</h1>
      <p className="supporting-copy mt-3 max-w-[320px]">AI는 제품의 적합성을 판정하지 않아요.<br/>나의 취향과 제품 정보를 바탕으로 다음 선택을 도와드려요.</p>
    </div>
    <Composer value={text} onChange={setText} onSubmit={submit} pending={false} suggestions={INITIAL_PROMPTS.map(item => item.label)} onSuggestion={label => { if (label === '제품 검색') { navigate('/ai/search'); return } const item = INITIAL_PROMPTS.find(prompt => prompt.label === label); if (item) submit(item.text, item.mode) }} placeholder="내 화장품 경험에 대해서 물어보세요"/>
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
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
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

  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
    <AiHeader onBack={() => navigate('/ai')}/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-5">
      {productId && product.isPending && <ProductContextSkeleton/>}
      {product.data && <ProductContextCard product={product.data}/>} 
      <UserMessage text={shortPromptLabel(prompt, mode)}/>
      {!create.isError && <ThinkingPanel product={Boolean(productId)} recommend={mode === 'RECOMMEND'}/>}
      {create.isError && <RetryCard message={create.error.message} onRetry={() => create.mutate()}/>}
    </div>
    <Composer value="" onChange={() => {}} onSubmit={() => {}} pending suggestions={[]} placeholder="첫 답변을 준비하고 있어요…"/>
  </Screen>
}

export function ChatPage() {
  const { id } = useParams(); const conversationId = Number(id)
  const validConversationId = Number.isSafeInteger(conversationId) && conversationId > 0
  const navigate = useNavigate(); const queryClient = useQueryClient(); const bottomRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [pendingMessage, setPendingMessage] = useState<{ text: string; requestId: string } | null>(null)
  const [openEvidence, setOpenEvidence] = useState<{ refs: string[]; webSources: WebSource[] } | null>(null)
  const conversation = useQuery({ queryKey: ['conversation', conversationId], queryFn: () => api.conversation(conversationId), enabled: validConversationId })
  const productId = conversation.data?.productId
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId!), enabled: Boolean(productId) })
  const send = useMutation({ mutationFn: (message: { text: string; requestId: string }) => api.sendMessage(conversationId, message.text, message.requestId), onSuccess: value => { queryClient.setQueryData(['conversation', conversationId], value); queryClient.invalidateQueries({ queryKey: ['conversations'] }); setPendingMessage(null) } })
  const apply = useMutation({ mutationFn: () => api.applyRescue(conversationId), onSuccess: value => { queryClient.invalidateQueries(); navigate(`/experiences/${value.id}`) } })
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [conversation.data?.messages.length, send.isPending])
  if (!validConversationId) return <Screen nav={false}><AiHeader onBack={() => navigate('/ai')}/><ErrorState message="대화 주소를 확인해주세요."/></Screen>
  if (conversation.isPending) return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-white"><AiHeader onBack={() => navigate('/ai')}/><div className="grid flex-1 place-items-center"><AiMotion size="loading"/><span className="mt-3 text-xs text-[#7f858c]">대화를 불러오는 중…</span></div></Screen>
  if (conversation.isError) return <Screen nav={false}><AiHeader onBack={() => navigate('/ai')}/><ErrorState message={conversation.error.message} onRetry={() => conversation.refetch()}/></Screen>
  const data = conversation.data
  const submit = (value: string) => { const message = value.trim(); if (message && !send.isPending) { const request = { text: message, requestId: crypto.randomUUID() }; setText(''); setPendingMessage(request); send.mutate(request) } }
  return <Screen nav={false} className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
    <AiHeader onBack={() => navigate('/ai')}/>
    <div className="hide-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
      {product.data && <ProductContextCard product={product.data}/>} 
      <div className="space-y-5">{data.messages.map(message => message.role === 'USER' ? <UserMessage key={message.id} text={message.content} createdAt={message.createdAt}/> : <AssistantMessage key={message.id} message={message} recommend={data.mode === 'RECOMMEND'} onEvidence={() => setOpenEvidence({ refs: message.evidenceRefs, webSources: message.webSources || [] })}/>)}{pendingMessage && <UserMessage text={pendingMessage.text} pending/>}{send.isPending && <ThinkingPanel compact product={Boolean(productId)} recommend={data.mode === 'RECOMMEND'}/>}</div>

      {data.rescuePlan && <RescuePlanCard conversation={data} onApply={() => apply.mutate()} pending={apply.isPending}/>} 
      {apply.isError && <p role="alert" className="mt-3 rounded-xl bg-[#fff5f5] p-3 text-xs leading-5 text-danger">{apply.error.message}</p>}
      {send.error && pendingMessage && <RetryCard message="메시지를 보내지 못했어요. 입력한 내용은 이 화면에 남아 있어요." onRetry={() => send.mutate(pendingMessage)}/>}
      <div ref={bottomRef}/>
    </div>
    <Composer value={text} onChange={setText} onSubmit={submit} pending={send.isPending} suggestions={data.quickReplies} placeholder={data.mode === 'RESCUE' ? '지금 상태를 평소 말하듯 적어주세요' : '내 화장품 경험에 대해서 물어보세요'}/>
    {openEvidence && <EvidenceSheet refs={openEvidence.refs} webSources={openEvidence.webSources} onClose={() => setOpenEvidence(null)}/>}
  </Screen>
}

function Composer({ value, onChange, onSubmit, pending, suggestions, placeholder, onSuggestion }: { value: string; onChange: (value: string) => void; onSubmit: (value: string) => void; pending: boolean; suggestions: string[]; placeholder: string; onSuggestion?: (value: string) => void }) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(value) }
  useEffect(() => { const input = inputRef.current; if (!input) return; input.style.height = '0px'; input.style.height = `${Math.min(input.scrollHeight, 112)}px` }, [value])
  return <div className="safe-bottom z-30 shrink-0 bg-white/95 px-5 pb-3 pt-3 backdrop-blur-xl">
    {!!suggestions.length && <div className="hide-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-0.5">{suggestions.slice(0, 3).map(suggestion => {
      const caution = isCautionSuggestion(suggestion)
      return <button type="button" key={suggestion} disabled={pending} onClick={() => (onSuggestion || onSubmit)(suggestion)} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-[.98] disabled:opacity-50 ${caution ? 'border-[#efcaca] bg-white text-[#b44d4d]' : 'border-[#cfe0ff] bg-white text-black'}`}>{caution && <AlertCircle size={13}/>}<span>{suggestion}</span></button>
    })}</div>}
    <form onSubmit={submit} className="field-control flex items-end gap-2 rounded-[21px] p-1.5 pl-5"><textarea ref={inputRef} disabled={pending} rows={1} value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(value) } }} placeholder={placeholder} aria-label="AI에게 메시지 보내기" className="max-h-28 min-h-12 flex-1 resize-none overflow-y-auto bg-transparent py-3 text-sm leading-5 outline-none disabled:cursor-wait"/><button type="submit" disabled={pending || !value.trim()} aria-label="보내기" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black shadow-sm transition active:scale-95 disabled:bg-transparent disabled:opacity-35 disabled:shadow-none"><Send size={21} strokeWidth={1.8}/></button></form>
  </div>
}

function AiHeader({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const [historyOpen, setHistoryOpen] = useState(false)
  const conversations = useQuery({ queryKey: ['conversations'], queryFn: api.conversations, enabled: historyOpen })
  const historyButton = <button type="button" onClick={() => setHistoryOpen(true)} aria-label="AI 대화 기록 열기" aria-haspopup="dialog" aria-expanded={historyOpen} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#dfe4ee] bg-white px-3.5 text-[13px] font-bold tracking-[-.015em] text-[#273247] shadow-[0_3px_10px_rgba(31,46,75,.06)] transition hover:border-[#cbd5e5] hover:bg-[#f7f9fd] active:scale-95"><History size={16} strokeWidth={2}/><span>기록</span></button>
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
  return <div className="fixed inset-0 z-50 flex justify-center bg-black/25 backdrop-blur-[2px]" onPointerDown={onClose}><div className="flex h-full w-full max-w-[430px] justify-end"><aside ref={dialog} role="dialog" aria-modal="true" aria-labelledby="history-title" tabIndex={-1} className="safe-bottom flex h-full w-[88%] max-w-[360px] animate-slide-in flex-col bg-white shadow-[-18px_0_55px_rgba(22,30,45,.16)] outline-none" onPointerDown={event => event.stopPropagation()}><div className="safe-top flex items-center justify-between border-b border-[#eef0f3] px-5 pb-4"><div><p className="text-xs font-medium text-[#778096]">SKN AI</p><h2 id="history-title" className="mt-0.5 text-2xl font-medium tracking-[-.04em]">최근 대화</h2></div><button type="button" onClick={onClose} aria-label="최근 대화 닫기" className="grid size-11 place-items-center rounded-full bg-[#f5f7fa]"><X size={18}/></button></div><div className="px-4 pt-4"><button type="button" onClick={startNew} className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-black text-sm font-medium text-white"><Plus size={17}/>새 대화 시작</button></div><div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-3">{loading ? <div className="grid min-h-56 place-items-center"><AiMotion size="tiny"/></div> : error ? <div className="mt-6 rounded-[18px] bg-[#fff5f5] p-4 text-center"><p className="text-xs leading-5 text-danger">{error}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1 text-xs font-medium"><RefreshCw size={13}/>다시 불러오기</button></div> : conversations.length ? <div className="space-y-1">{conversations.map(item => <Link key={item.id} to={`/ai/${item.id}`} className="flex items-center gap-3 rounded-[18px] p-3.5 transition hover:bg-[#f4f6f9] active:scale-[.99]" onClick={onClose}><div className="grid size-9 shrink-0 place-items-center rounded-[13px] bg-[#f0f4fc] text-[#62709a]"><MessageCircle size={17}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium">{titleFor(item)}</p><span className="shrink-0 text-xs text-[#a1a6ad]">{historyTime(item)}</span></div><p className="mt-1 truncate text-xs text-[#848a92]">{item.messages.at(-1)?.content}</p><p className="mt-1.5 text-xs font-medium text-[#7985a4]">{modeLabel(item.mode)}</p></div></Link>)}</div> : <div className="px-4 py-16 text-center"><MessageCircle className="mx-auto text-[#b7bdc6]"/><p className="mt-4 text-sm font-medium">아직 대화가 없어요</p><p className="mt-1 text-xs leading-5 text-[#8b9199]">제품이나 루틴에 대해 물어보면<br/>여기에서 다시 이어볼 수 있어요.</p></div>}</div></aside></div></div>
}

function AiMotion({ size }: { size: 'hero' | 'loading' | 'tiny' }) {
  const dimensions = size === 'hero' ? 'size-[72px]' : size === 'loading' ? 'size-[64px]' : 'size-11'
  return <AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" loop className={dimensions}/>
}

function ThinkingPanel({ compact = false, product = false, recommend = false }: { compact?: boolean; product?: boolean; recommend?: boolean }) {
  const text = product ? '제품 정보와 내 기록을 연결하고 있어요' : recommend ? '관련 경험과 제품 후보를 함께 살펴보고 있어요' : '내 기록에서 관련된 경험을 찾고 있어요'
  return <div className={`${compact ? 'py-1' : 'mt-5'} flex items-center gap-3`} aria-live="polite"><AiMotion size={compact ? 'tiny' : 'loading'}/><div><p className="text-xs font-medium text-[#666]">{text}</p><div className="mt-2 w-fit rounded-full bg-[#5b5b5b] px-3 py-2"><TypingDots/></div></div></div>
}

function TypingDots() {
  return <span className="flex gap-1.5" aria-label="AI 답변 작성 중"><span className="size-1.5 animate-bounce rounded-full bg-white/60"/><span className="size-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:120ms]"/><span className="size-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:240ms]"/></span>
}

function UserMessage({ text, createdAt, pending = false }: { text: string; createdAt?: string; pending?: boolean }) {
  return <div className="flex flex-col items-end"><div className="w-fit max-w-[84%] rounded-[20px] border border-[#cfe0ff] bg-white px-4 py-2.5 text-sm leading-6 text-black"><MessageContent text={text}/></div><span className="mt-1.5 px-1 text-xs text-[#a0a5ac]">{pending ? '보내는 중…' : createdAt ? messageTime(createdAt) : ''}</span></div>
}

function AssistantMessage({ message, recommend, onEvidence }: { message: Conversation['messages'][number]; recommend: boolean; onEvidence: () => void }) {
  const hasEvidence = message.evidenceRefs.length > 0 || (message.webSources?.length ?? 0) > 0
  return <article className="w-full"><div className="w-fit max-w-[82%] rounded-[20px] bg-black px-4 py-3.5 text-sm leading-6 text-white"><MessageContent text={message.content} markdown inverse/>{message.status === 'FALLBACK' && <div className="mt-3 flex items-start gap-2 border-t border-white/15 pt-3 text-xs leading-4 text-white/60"><ShieldCheck size={13} className="mt-0.5 shrink-0"/>외부 AI 연결 없이 저장된 내 데이터로 답했어요.</div>}</div><span className="mt-1.5 block px-1 text-xs text-[#a0a5ac]">{messageTime(message.createdAt)}</span>{recommend && <RecommendedProductLinks refs={message.evidenceRefs}/>} {hasEvidence && <EvidenceSummary refs={message.evidenceRefs} webSources={message.webSources || []} onOpen={onEvidence}/>}</article>
}

function RetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-5 rounded-[18px] border border-[#f1d8d8] bg-[#fff7f7] p-4 text-xs leading-5 text-[#9a4848]"><p>{message}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 font-medium"><RefreshCw size={14}/>같은 메시지 다시 보내기</button></div>
}

function ProductSearchResult({ product, onSelect }: { product: Product; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 rounded-[20px] border border-[#cfe0ff] bg-white p-3 text-left transition hover:border-[#a9c6f3] active:scale-[.99]"><ProductGlyph category={product.category} src={product.imageUrl} size="sm"/><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-xs font-medium text-[#6f88b2]">{product.brand} · {product.category}</span>{product.owned && <span className="shrink-0 rounded-full border border-[#cfe0ff] px-1.5 py-0.5 text-xs font-medium text-[#667da3]">내 화장품</span>}</span><span className="mt-1 block truncate text-sm font-medium tracking-[-.02em]">{product.name}</span><span className="mt-1 block text-xs text-[#737880]">{product.volume}{product.versionLabel ? ` · ${product.versionLabel} 버전` : ''}{product.personalRecordCount ? ` · 내 경험 ${product.personalRecordCount}건` : ''}</span></span><ChevronRight size={17} className="shrink-0 text-[#737880]"/></button>
}

function ProductResultsSkeleton() {
  return <div className="space-y-2.5" aria-label="제품 검색 결과 불러오는 중">{[1, 2, 3].map(item => <div key={item} className="flex animate-pulse items-center gap-3 rounded-[20px] border border-[#edf0f3] p-3"><div className="h-14 w-12 rounded-2xl bg-[#f0f2f5]"/><div className="flex-1"><div className="h-2.5 w-20 rounded bg-[#eceff2]"/><div className="mt-2 h-3.5 w-4/5 rounded bg-[#e7eaee]"/><div className="mt-2 h-2.5 w-28 rounded bg-[#f0f2f5]"/></div></div>)}</div>
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
  return <section className="mb-5 overflow-hidden rounded-[22px] border border-[#d9ddff] bg-[linear-gradient(135deg,#f8f8ff_0%,#fff_72%)]">
    <div className="flex items-center gap-4 p-4"><div className="grid size-[72px] shrink-0 place-items-center rounded-2xl bg-white"><ProductGlyph category={product.category} size="sm" src={product.imageUrl}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">선택한 제품</span><span className="text-xs text-muted">{product.category}</span></div><p className="mt-2 truncate text-xs font-medium text-muted">{product.brand}</p><h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5">{product.name}</h2><p className="mt-1 text-xs text-muted">{product.volume}</p></div></div>
    <div className="border-t border-[#e5e6f5] bg-white/65 px-4 py-2.5 text-xs font-medium text-accent">SKN AI에게 이 제품을 내 기록과 비교해달라고 요청했어요.</div>
  </section>
}

function ProductContextSkeleton() {
  return <section className="mb-5 flex animate-pulse items-center gap-4 rounded-[22px] border border-[#d9ddff] bg-[#f8f8ff] p-4" aria-label="선택한 제품 불러오는 중">
    <div className="size-[72px] shrink-0 rounded-2xl bg-[#e9eafb]"/><div className="min-w-0 flex-1"><div className="h-5 w-20 rounded-full bg-[#e2e4f7]"/><div className="mt-3 h-3 w-24 rounded bg-[#e3e4e1]"/><div className="mt-2 h-4 w-full rounded bg-[#dedfef]"/><div className="mt-2 h-3 w-16 rounded bg-[#e3e4e1]"/></div>
  </section>
}

function RescuePlanCard({ conversation, onApply, pending }: { conversation: Conversation; onApply: () => void; pending: boolean }) {
  const plan = conversation.rescuePlan!
  if (plan.status === 'BLOCKED') return <Card className="mt-7 border-[#f1d1d1] bg-[#fff8f8]"><p className="text-sm font-semibold text-danger">제품 분석을 멈췄어요</p><p className="mt-2 text-xs leading-5 text-muted">{plan.rationale}</p></Card>
  if (plan.status === 'APPLIED') return <Card className="mt-7 border-[#d6e9ac] bg-[#f8fde9]"><div className="flex items-center gap-2 text-sm font-semibold"><Check size={18}/>새 루틴으로 적용했어요</div><p className="mt-2 text-xs text-muted">이번 루틴은 독립된 새 사용 경험으로 기록됩니다.</p></Card>
  return <Card className="mt-7 border-[#d9ddff] bg-[#f8f8ff]"><AiBadge/><p className="mt-3 text-lg font-semibold tracking-[-.02em]">{plan.title}</p><p className="mt-2 text-xs leading-5 text-muted">{plan.rationale}</p>{plan.removeProductName && <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3"><div><p className="text-xs font-semibold text-muted">먼저 빼고 확인</p><p className="mt-1 text-sm font-medium">{plan.removeProductName}</p></div><ArrowRight size={17} className="text-accent"/></div>}<Button disabled={pending} onClick={onApply} className="mt-4 w-full">{pending ? '루틴 만드는 중…' : '이 루틴으로 시작'}</Button><p className="mt-2 text-center text-xs text-muted">적용하기 전에는 현재 루틴을 바꾸지 않아요.</p></Card>
}

function titleFor(item: Conversation) {
  if (item.mode === 'RESCUE') return '불편함 확인'
  if (item.mode === 'PRODUCT') return '제품 비교'
  if (item.mode === 'RECOMMEND') return '다음 제품 탐색'
  if (item.mode === 'PATTERN') return '내 패턴 해석'
  return item.messages.find(message => message.role === 'USER')?.content || '새 AI 대화'
}

function MessageContent({ text, markdown = false, inverse = false }: { text: string; markdown?: boolean; inverse?: boolean }) {
  if (!markdown) return <p className="whitespace-pre-wrap">{text}</p>
  return <div className={inverse ? 'min-w-0 text-sm leading-6 text-white' : 'min-w-0 text-sm leading-6 text-ink'}>
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkGfm, remarkBreaks]}
      components={{
        h1: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold tracking-[-.025em] first:mt-0">{children}</h2>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 text-lg font-semibold tracking-[-.025em] first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold tracking-[-.015em] first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className={inverse ? 'font-semibold text-white' : 'font-semibold text-ink'}>{children}</strong>,
        ul: ({ children }) => <ul className="mb-3 ml-1 list-disc space-y-1.5 pl-5 marker:text-accent last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-1 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-accent last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5 leading-6">{children}</li>,
        blockquote: ({ children }) => <blockquote className={inverse ? 'my-3 border-l-2 border-white/50 pl-3 text-white/75' : 'my-3 rounded-r-xl border-l-3 border-accent bg-accent-soft px-3 py-2 text-muted'}>{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" aria-label={`출처 ${String(children)} 새 창에서 열기`} className="mx-0.5 inline-flex min-w-5 -translate-y-px items-center justify-center rounded-full bg-accent-soft px-1.5 py-0.5 text-xs font-semibold leading-4 text-accent no-underline ring-1 ring-inset ring-[#d9ddff]">{children}</a>,
        hr: () => <hr className="my-4 border-line"/>,
        table: ({ children }) => <div className="my-3 overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-72 border-collapse text-xs">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-line bg-soft px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top last:border-b-0">{children}</td>,
        code: ({ children }) => <code className="rounded bg-soft px-1.5 py-0.5 text-xs font-medium">{children}</code>,
      }}
    >{text}</ReactMarkdown>
  </div>
}

function EvidenceSummary({ refs, webSources, onOpen }: { refs: string[]; webSources: WebSource[]; onOpen: () => void }) {
  const counts = refs.reduce<Record<string, number>>((all, ref) => {
    const label = ref.startsWith('PT-') ? '패턴' : ref.startsWith('P-') ? '제품 정보' : ref.startsWith('R-') ? '루틴' : '내 경험'
    all[label] = (all[label] || 0) + 1
    return all
  }, {})
  const labels = [...(webSources.length ? [`외부 출처 ${webSources.length}`] : []), ...Object.entries(counts).map(([label, count]) => `${label} ${count}`)]
  return <button type="button" onClick={onOpen} aria-haspopup="dialog" className="mt-3 flex w-full items-center gap-1.5 rounded-xl bg-soft px-3 py-2.5 text-left text-xs font-medium text-muted transition active:bg-[#e9ebe5]"><BookOpen size={13} className="shrink-0 text-accent"/><span className="min-w-0 flex-1">근거 보기 · {labels.join(' · ')}</span><ChevronRight size={14} className="shrink-0"/></button>
}

function RecommendedProductLinks({ refs }: { refs: string[] }) {
  const productIds = [...new Set(refs
    .filter(ref => ref.startsWith('P-') && !ref.startsWith('PT-'))
    .map(ref => Number(ref.slice(2)))
    .filter(Number.isFinite))].slice(0, 3)
  const products = useQueries({ queries: productIds.map(id => ({ queryKey: ['product', id], queryFn: () => api.product(id) })) })
  if (!productIds.length) return null
  if (products.some(result => result.isPending)) return <div className="mt-4 space-y-2" aria-label="추천 제품 불러오는 중">{productIds.map(id => <div key={id} className="h-[74px] animate-pulse rounded-2xl border border-line bg-soft"/>)}</div>
  const loaded = products.flatMap(result => result.data ? [result.data] : [])
  if (!loaded.length) return null
  return <section className="-mx-5 mt-4" aria-label="AI 추천 제품">
    <div className="hide-scrollbar flex gap-2 overflow-x-auto px-5 pb-2">{loaded.map(product => <Link key={product.id} to={`/products/${product.id}`} className="w-[160px] shrink-0 rounded-[19px] border border-[#cfe0ff] bg-white p-2.5 transition active:scale-[.99]">
      <div className="grid h-[140px] place-items-center rounded-[15px] border border-[#deebff] bg-white"><ProductGlyph category={product.category} src={product.imageUrl} size="md"/></div>
      <span className="mt-2.5 block truncate text-xs text-[#6f88b2]">{product.brand}</span><span className="mt-1 block truncate text-sm font-medium text-black">{product.name}</span>
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

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-0 backdrop-blur-[2px]" onPointerDown={onClose}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="evidence-title" tabIndex={-1} className="safe-bottom flex max-h-[82dvh] w-full max-w-[430px] animate-rise flex-col overflow-hidden rounded-t-[30px] bg-paper shadow-[0_-18px_60px_rgba(23,24,22,.18)] outline-none" onPointerDown={event => event.stopPropagation()}>
      <div className="shrink-0 px-5 pb-4 pt-3"><div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d9dcd6]"/><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-accent">ANSWER SOURCES</p><h2 id="evidence-title" className="mt-1 text-2xl font-semibold tracking-[-.035em]">이 답변에 쓴 근거</h2><p className="mt-2 text-xs leading-5 text-muted">웹에서 확인한 자료와 내 기록을 분리해서 보여줘요.</p></div><button type="button" onClick={onClose} aria-label="근거 닫기" className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-muted shadow-sm"><X size={19}/></button></div></div>
      <div className="overflow-y-auto border-t border-line px-5 py-5">
        {webSources.length > 0 && <section><p className="mb-3 text-xs font-semibold text-muted">웹에서 확인한 자료</p><div className="space-y-3">{webSources.map(source => <WebSourceCard key={source.ref} source={source}/>)}</div></section>}
        {loading ? <div className="grid min-h-44 place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-line border-t-accent"/></div> : evidence.length > 0 && <section className={webSources.length ? 'mt-6' : ''}><p className="mb-3 text-xs font-semibold text-muted">내 데이터</p><div className="space-y-3">{evidence.map(item => <EvidenceCard key={item.ref} item={item}/>)}</div></section>}
        <div className="mt-5 rounded-2xl bg-soft p-4 text-xs leading-5 text-muted"><b className="text-ink">근거를 읽는 법</b><br/>P1은 제품 공식정보, P2는 공공기관, P3는 연구 자료, P4는 보조 자료예요. 연결된 자료는 적합성이나 원인을 증명하지 않아요.</div>
      </div>
    </section>
  </div>
}

function WebSourceCard({ source }: { source: WebSource }) {
  const tier = sourceTier(source.tier)
  let host = source.url
  try { host = new URL(source.url).hostname.replace(/^www\./, '') } catch { /* 서버가 이미 검증한 URL */ }
  return <a href={source.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-[20px] border border-[#dfe1f4] bg-[linear-gradient(135deg,#fafaff_0%,#fff_76%)] transition active:scale-[.99]">
    <div className="flex gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Globe2 size={18}/></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-[#d9ddff]">{source.ref.replace('S-', '')}</span><span className="text-xs font-semibold text-muted">{tier}</span></div><h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{source.title}</h3><p className="mt-1 truncate text-xs text-muted">{host}</p></div><ExternalLink size={16} className="mt-1 shrink-0 text-muted transition group-hover:text-accent"/></div>
  </a>
}

function sourceTier(tier: WebSource['tier']) {
  if (tier === 'P1') return 'P1 · 제품 공식정보'
  if (tier === 'P2') return 'P2 · 공공기관'
  if (tier === 'P3') return 'P3 · 연구 자료'
  return 'P4 · 보조 자료'
}

type ResolvedEvidence = { ref: string; kind: 'PRODUCT' | 'ROUTINE' | 'RECORD' | 'PATTERN' | 'UNKNOWN'; eyebrow: string; title: string; subtitle?: string; details: string[] }

function resolveEvidence(ref: string, products: Product[], routines: Routine[], records: ExperienceRecord[], patterns: Pattern[]): ResolvedEvidence {
  const id = Number(ref.split('-').at(-1))
  if (ref.startsWith('PT-')) {
    const pattern = patterns.find(item => item.id === id)
    return pattern ? { ref, kind: 'PATTERN', eyebrow: '연결된 패턴', title: pattern.title, subtitle: `지지 ${pattern.supportingCount}건 · 반대 ${pattern.contradictingCount}건`, details: [pattern.summary] } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('P-')) {
    const product = products.find(item => item.id === id)
    return product ? { ref, kind: 'PRODUCT', eyebrow: product.facts.length ? '출처에서 확인한 제품 정보' : '선택한 제품', title: product.name, subtitle: `${product.brand} · ${product.category}${product.volume ? ` · ${product.volume}` : ''}`, details: product.facts.map(fact => fact.text).slice(0, 5) } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('R-')) {
    const routine = routines.find(item => item.id === id)
    return routine ? { ref, kind: 'ROUTINE', eyebrow: '내가 등록한 루틴', title: routine.name, subtitle: `${routine.items.length}개 제품 · ${routine.status === 'ACTIVE' ? '현재 사용' : '비교 기준'}`, details: routine.items.map((item, index) => `${index + 1}. ${item.productName} · ${timeSlotLabel(item.timeSlot)} · ${item.frequency}`) } : unresolvedEvidence(ref)
  }
  if (ref.startsWith('E-')) {
    const record = records.find(item => item.id === id)
    return record ? { ref, kind: 'RECORD', eyebrow: '내가 남긴 사용 경험', title: record.productName, subtitle: `${sentimentText(record.sentiment)} · ${formatEvidenceDate(record.createdAt)}`, details: [record.note, record.tags.length ? `느낌: ${record.tags.join(', ')}` : '', record.discomfort === 'REPORTED' ? '피부 불편함을 함께 남김' : ''].filter(Boolean) } : unresolvedEvidence(ref)
  }
  return unresolvedEvidence(ref)
}

function unresolvedEvidence(ref: string): ResolvedEvidence {
  return { ref, kind: 'UNKNOWN', eyebrow: '연결된 근거', title: '상세 정보를 불러오지 못했어요', details: ['답변은 그대로 보존했어요. 잠시 후 다시 열어보세요.'] }
}

function EvidenceCard({ item }: { item: ResolvedEvidence }) {
  const icon = item.kind === 'PRODUCT' ? <BadgeCheck size={18}/> : item.kind === 'ROUTINE' ? <Layers3 size={18}/> : item.kind === 'RECORD' ? <Clock3 size={18}/> : <Sparkles size={18}/>
  return <article className="overflow-hidden rounded-[20px] border border-line bg-white"><div className="flex gap-3 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-accent">{item.eyebrow}</p><h3 className="mt-1 text-sm font-semibold leading-5">{item.title}</h3>{item.subtitle && <p className="mt-1 text-xs text-muted">{item.subtitle}</p>}</div></div>{item.details.length > 0 && <div className="border-t border-line bg-[#fcfcfa] px-4 py-3"><ul className="space-y-2">{item.details.map((detail, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-muted"><span className="mt-2 size-1 shrink-0 rounded-full bg-[#aeb2aa]"/><span>{detail}</span></li>)}</ul></div>}</article>
}

function timeSlotLabel(value: Routine['items'][number]['timeSlot']) { return value === 'MORNING' ? '아침' : value === 'EVENING' ? '저녁' : '아침·저녁' }
function sentimentText(value: ExperienceRecord['sentiment']) { return value === 'LIKED' ? '마음에 들었음' : value === 'DISAPPOINTED' ? '아쉬웠음' : '아직 모르겠음' }
function formatEvidenceDate(value: string) { const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z')); return Number.isNaN(date.getTime()) ? value.slice(0, 10) : new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date) }
