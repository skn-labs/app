import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, PackageOpen, Search, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, uid } from '../lib/api'
import type { Auth, Preference, Product } from '../lib/types'
import { BrandMark, BrandMotion, Button, ErrorState, Loading, ProductGlyph, Screen } from '../components/ui'

type EntryChoice = 'PRODUCT' | 'ROUTINE' | 'EXPLORE'
type Draft = { version: number; step: number; selected: number[]; entryChoice: EntryChoice | null; focusProductId: number | null; preference: Preference }

/** ONB-01. 선택지는 제품 라벨이 아니라 사용감 표현이며, 고르지 않아도 통과한다. */
const TEXTURE_LIKES = ['가벼운', '촉촉한', '산뜻한', '쫀쫀한', '윤기 있는', '보송한'] as const
const TEXTURE_AVOIDS = ['끈적임', '답답함', '따가움', '강한 향', '무거운 잔여감'] as const
const EMPTY_PREFERENCE: Preference = { likes: [], avoids: [], note: '' }

export function OnboardingPage({ auth }: { auth: Auth }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draftKey = `skn:onboarding:${auth.userId}`
  const draft = useMemo(() => readDraft(draftKey), [draftKey])
  const [step, setStep] = useState(draft.step)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number[]>(draft.selected)
  const [entryChoice, setEntryChoice] = useState<EntryChoice | null>(draft.entryChoice)
  const [focusProductId, setFocusProductId] = useState<number | null>(draft.focusProductId)
  const [preference, setPreference] = useState<Preference>(draft.preference)
  const [selectionError, setSelectionError] = useState('')
  const [finishTo, setFinishTo] = useState<string | null>(null)
  const products = useQuery({ queryKey: ['onboarding-products', query], queryFn: () => api.products(query, null, 40) })
  const selectedProductQueries = useQueries({ queries: selected.map(id => ({ queryKey: ['product', id], queryFn: () => api.product(id) })) })
  const selectedProducts = selectedProductQueries.flatMap(result => result.data ? [result.data] : [])

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify({ version: 3, step, selected, entryChoice, focusProductId, preference }))
  }, [draftKey, step, selected, entryChoice, focusProductId, preference])

  const complete = useMutation({
    mutationFn: (choice: EntryChoice) => api.completeOnboarding({
      productIds: selected,
      entryChoice: choice,
      focusProductId: choice === 'PRODUCT' ? (focusProductId || selected[0]) : undefined,
      // ONB-01. 하나도 고르지 않았으면 아예 보내지 않는다(건너뛴 것과 비운 것을 구분).
      preferences: hasPreference(preference) ? preference : undefined,
      clientRequestId: uid(),
    }),
    onSuccess: (result, choice) => {
      localStorage.removeItem(draftKey)
      queryClient.setQueryData(['auth'], result.user)
      queryClient.invalidateQueries()
      // 바로 옮기지 않고 완료 모션을 한 번 보여준 뒤 이동한다.
      setFinishTo(result.experience ? `/experiences/${result.experience.id}`
        : choice === 'ROUTINE' ? '/routine/edit' : '/explore')
    },
  })

  const toggleProduct = (id: number) => {
    setSelectionError('')
    setSelected(value => {
      if (value.includes(id)) {
        if (focusProductId === id) setFocusProductId(null)
        return value.filter(item => item !== id)
      }
      if (value.length >= 8) {
        setSelectionError('처음에는 8개까지 고를 수 있어요.')
        return value
      }
      return [...value, id]
    })
  }

  const goToChoice = () => {
    const suggested: EntryChoice = selected.length > 1 ? 'ROUTINE' : selected.length === 1 ? 'PRODUCT' : 'EXPLORE'
    setEntryChoice(suggested)
    setFocusProductId(selected[0] || null)
    setStep(2)
  }

  const beginIntroduction = () => {
    if (!entryChoice) return
    setStep(3)
  }

  const skipInput = () => {
    setEntryChoice('EXPLORE')
    setStep(4)
  }

  if (finishTo) return <Screen nav={false} className="relative flex flex-col overflow-hidden bg-white">
    <CompleteStep onDone={() => navigate(finishTo, { replace: true })}/>
  </Screen>

  return <Screen nav={false} className="relative flex flex-col overflow-hidden bg-white">
    {step === 0 ? <WelcomeStep displayName={auth.displayName} onStart={() => setStep(1)} onPreview={skipInput}/> : step < 4 ? <>
      <InputHeader step={step - 1} onBack={() => setStep(value => value - 1)} onSkip={skipInput}/>
      {step === 1 && <ProductStep query={query} onQuery={setQuery} products={products.data?.items || []} loading={products.isPending} error={products.isError ? products.error.message : ''} selected={selected} onToggle={toggleProduct} selectionError={selectionError} onNext={goToChoice}/>} 
      {step === 2 && <StartStep products={selectedProducts} choice={entryChoice} focusProductId={focusProductId} onChoice={setEntryChoice} onFocus={setFocusProductId} onContinue={beginIntroduction}/>} 
      {step === 3 && <PreferenceStep preference={preference} onChange={setPreference} onNext={() => setStep(4)}/>} 
    </> : <StoryOnboarding
      index={step - 4}
      onBack={() => setStep(value => value - 1)}
      onNext={() => step < 6 ? setStep(value => value + 1) : complete.mutate(entryChoice || 'EXPLORE')}
      onSkip={() => complete.mutate(entryChoice || 'EXPLORE')}
      pending={complete.isPending}
      error={complete.error?.message}
    />}
  </Screen>
}

const EMPTY_DRAFT: Draft = { version: 3, step: 0, selected: [], entryChoice: null, focusProductId: null, preference: EMPTY_PREFERENCE }

const hasPreference = (value: Preference) => value.likes.length > 0 || value.avoids.length > 0 || value.note.trim().length > 0

function readDraft(key: string): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as Partial<Draft>
    if (value.version !== 3) return EMPTY_DRAFT
    return {
      version: 3,
      step: typeof value.step === 'number' && value.step >= 0 && value.step <= 6 ? value.step : 0,
      selected: Array.isArray(value.selected) ? value.selected.filter(item => Number.isInteger(item)).slice(0, 8) : [],
      entryChoice: value.entryChoice === 'PRODUCT' || value.entryChoice === 'ROUTINE' || value.entryChoice === 'EXPLORE' ? value.entryChoice : null,
      focusProductId: typeof value.focusProductId === 'number' ? value.focusProductId : null,
      preference: readPreference(value.preference),
    }
  } catch {
    return EMPTY_DRAFT
  }
}

function readPreference(value: Preference | undefined): Preference {
  if (!value) return EMPTY_PREFERENCE
  const list = (items: unknown, allowed: readonly string[]) => Array.isArray(items)
    ? items.filter((item): item is string => typeof item === 'string' && allowed.includes(item))
    : []
  return {
    likes: list(value.likes, TEXTURE_LIKES),
    avoids: list(value.avoids, TEXTURE_AVOIDS),
    note: typeof value.note === 'string' ? value.note.slice(0, 300) : '',
  }
}

function WelcomeStep({ displayName, onStart, onPreview }: { displayName: string; onStart: () => void; onPreview: () => void }) {
  return <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_37%,#f3f4ff_0%,#fbfcf8_42%,#fff_78%)]">
    <header className="z-10 shrink-0 px-6 pt-7"><BrandMark compact/></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-7">
      <div className="animate-rise pt-9 text-center">
        <p className="text-sm font-bold text-accent">반가워요, {displayName}</p>
        <h1 className="mt-3 text-[32px] font-bold leading-[1.2] tracking-[-.055em]">오늘부터 화장품을<br/>써본 만큼 나를 알아가요.</h1>
        <p className="mx-auto mt-4 max-w-[330px] text-[15px] leading-7 text-muted">기억 속에 흩어지던 사용 경험을<br/>SKN이 대신 이어둘게요.</p>
      </div>

      <WelcomeArtwork/>

      <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-line bg-white/85 px-4 py-2.5 text-[11px] font-semibold text-muted shadow-sm backdrop-blur"><Check size={14} className="text-accent"/>과거 기록 없이 지금 쓰는 제품부터</div>
    </div>
    <div className="safe-bottom z-10 shrink-0 border-t border-line/80 bg-white/92 p-4 backdrop-blur-xl"><Button onClick={onStart} className="w-full">내 SKN 시작하기<ArrowRight size={18}/></Button><button onClick={onPreview} className="mx-auto mt-3 block py-1 text-xs font-semibold text-muted">먼저 서비스 흐름 둘러보기</button></div>
  </div>
}

function WelcomeArtwork() {
  return <div className="relative mx-auto mt-8 w-full max-w-[350px]" aria-hidden="true"><svg viewBox="0 0 360 245" className="block h-auto w-full">
    <defs><linearGradient id="welcome-orb-a" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dfe4ff" stopOpacity=".95"/><stop offset="1" stopColor="#f0f5de" stopOpacity=".78"/></linearGradient><linearGradient id="welcome-orb-b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e8ecff"/></linearGradient><filter id="welcome-shadow"><feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#283023" floodOpacity=".12"/></filter></defs>
    <circle cx="180" cy="120" r="102" fill="url(#welcome-orb-a)" className="onboard-pulse"/>
    <circle cx="67" cy="61" r="17" fill="#dff5a7" fillOpacity=".88" className="onboard-float onboard-delay-1"/><circle cx="302" cy="78" r="11" fill="#bfc7ff" fillOpacity=".8" className="onboard-float onboard-delay-2"/><circle cx="304" cy="188" r="22" fill="#fff" stroke="#e1e4de" className="onboard-float"/>
    <g filter="url(#welcome-shadow)" className="onboard-float"><rect x="86" y="38" width="188" height="162" rx="36" fill="url(#welcome-orb-b)" stroke="#fff" strokeWidth="2"/><circle cx="180" cy="100" r="35" fill="#171816"/><path d="M163 112V86l17 19 17-19v26" fill="none" stroke="#dff5a7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><text x="180" y="157" textAnchor="middle" fontSize="13" fontWeight="800" fill="#171816">나의 스킨케어 경험</text><text x="180" y="176" textAnchor="middle" fontSize="9" fontWeight="600" fill="#73766f">USE · REMEMBER · CONNECT</text></g>
    <path d="M64 159 C94 216 142 228 183 218 C231 207 265 221 300 176" fill="none" stroke="#5365f5" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 7" className="onboard-draw"/>
    <circle cx="64" cy="159" r="5" fill="#5365f5"/><circle cx="181" cy="218" r="5" fill="#5365f5"/><circle cx="300" cy="176" r="5" fill="#5365f5"/>
  </svg></div>
}

function InputHeader({ step, onBack, onSkip }: { step: number; onBack?: () => void; onSkip: () => void }) {
  return <header className="z-10 shrink-0 bg-white px-5 pb-4 pt-5">
    <div className="flex h-10 items-center justify-between">
      {onBack ? <button onClick={onBack} aria-label="이전 단계" className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-soft"><ArrowLeft size={21}/></button> : <BrandMark compact/>}
      <span className="text-[11px] font-bold tracking-[.08em] text-muted">맞춤 설정</span>
      <button onClick={onSkip} className="-mr-2 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-soft">나중에</button>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2">{[0, 1, 2].map(index => <span key={index} className={`h-1 rounded-full transition-colors ${index <= step ? 'bg-ink' : 'bg-line'}`}/>)}</div>
  </header>
}

function ProductStep({ query, onQuery, products, loading, error, selected, onToggle, selectionError, onNext }: { query: string; onQuery: (value: string) => void; products: Product[]; loading: boolean; error: string; selected: number[]; onToggle: (id: number) => void; selectionError: string; onNext: () => void }) {
  return <div className="flex min-h-0 flex-1 flex-col animate-rise">
    <div className="shrink-0 px-5 pt-4"><p className="text-xs font-bold text-accent">설정 1 / 3</p><h1 className="mt-2 text-[27px] font-bold leading-9 tracking-[-.045em]">지금 쓰는 화장품을<br/>골라주세요</h1><p className="mt-2 text-sm leading-6 text-muted">모두 등록할 필요 없어요. 기억나는 것부터 최대 8개만 골라요.</p>
      <label className="mt-5 flex h-12 items-center gap-3 rounded-2xl border border-line bg-soft px-4 focus-within:border-ink"><Search size={18} className="text-muted"/><input autoFocus value={query} onChange={event => onQuery(event.target.value)} placeholder="브랜드 또는 제품명" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{query && <button onClick={() => onQuery('')} aria-label="검색어 지우기"><X size={17} className="text-muted"/></button>}</label>
      <div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold text-muted">{selected.length ? `${selected.length}개 선택됨` : '아직 선택하지 않았어요'}</span>{selected.length > 0 && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">내 화장품에 추가</span>}</div>
    </div>
    <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-4">
      {loading ? <Loading label="화장품 불러오는 중"/> : error ? <ErrorState message={error}/> : <div className="space-y-2">{products.map(product => <ProductChoice key={product.id} product={product} selected={selected.includes(product.id)} onClick={() => onToggle(product.id)}/>)}</div>}
      {selectionError && <p role="alert" className="mt-3 text-xs font-semibold text-danger">{selectionError}</p>}
    </div>
    <div className="safe-bottom shrink-0 border-t border-line bg-white p-4"><Button onClick={onNext} className="w-full">{selected.length ? `${selected.length}개 선택하고 계속` : '제품은 나중에 등록'}<ArrowRight size={17}/></Button></div>
  </div>
}

function ProductChoice({ product, selected, onClick }: { product: Product; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-[18px] border p-3 text-left transition ${selected ? 'border-accent bg-accent-soft' : 'border-line bg-white'}`}><ProductGlyph category={product.category} size="sm" src={product.imageUrl}/><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-muted">{product.brand} · {product.category}</p><p className="mt-1 truncate text-sm font-bold">{product.name}</p></div><span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? 'border-accent bg-accent text-white' : 'border-[#cfd2cc] bg-white'}`}>{selected && <Check size={14}/>}</span></button>
}

function StartStep({ products, choice, focusProductId, onChoice, onFocus, onContinue }: { products: Product[]; choice: EntryChoice | null; focusProductId: number | null; onChoice: (choice: EntryChoice) => void; onFocus: (id: number) => void; onContinue: () => void }) {
  const options = [
    ...(products.length ? [{ value: 'PRODUCT' as const, icon: PackageOpen, title: '제품 하나부터 써보기', body: '선택한 제품의 사용 경험을 바로 시작해요.' }, { value: 'ROUTINE' as const, icon: BookOpen, title: '현재 루틴부터 만들기', body: '제품의 아침·저녁과 바르는 순서를 정해요.' }] : []),
    { value: 'EXPLORE' as const, icon: Search, title: '먼저 제품을 둘러보기', body: '제품 정보를 보고 궁금한 것부터 시작해요.' },
  ]
  return <div className="flex min-h-0 flex-1 flex-col animate-rise">
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
      <p className="text-xs font-bold text-accent">설정 2 / 3</p><h1 className="mt-2 text-[27px] font-bold leading-9 tracking-[-.045em]">어디서부터<br/>시작할까요?</h1><p className="mt-2 text-sm leading-6 text-muted">지금 필요한 것 하나만 고르면 나머지는 나중에 바꿔도 돼요.</p>
      <div className="mt-7 space-y-3">{options.map(({ value, icon: Icon, title, body }) => <button key={value} onClick={() => onChoice(value)} className={`flex w-full items-start gap-3 rounded-[20px] border p-4 text-left transition ${choice === value ? 'border-ink bg-soft shadow-sm' : 'border-line bg-white'}`}><div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${choice === value ? 'bg-ink text-white' : 'bg-soft text-muted'}`}><Icon size={18}/></div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div><span className={`mt-2 grid size-5 place-items-center rounded-full border ${choice === value ? 'border-ink bg-ink text-white' : 'border-[#cfd2cc]'}`}>{choice === value && <Check size={12}/>}</span></button>)}</div>
      {choice === 'PRODUCT' && products.length > 1 && <section className="mt-6"><p className="text-sm font-bold">먼저 써볼 제품</p><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{products.map(product => <button key={product.id} onClick={() => onFocus(product.id)} className={`min-w-[150px] rounded-2xl border p-3 text-left ${focusProductId === product.id ? 'border-accent bg-accent-soft' : 'border-line bg-white'}`}><p className="truncate text-[10px] text-muted">{product.brand}</p><p className="mt-1 line-clamp-2 text-xs font-bold leading-5">{product.name}</p></button>)}</div></section>}
    </div>
    <div className="safe-bottom shrink-0 border-t border-line bg-white p-4"><Button disabled={!choice} onClick={onContinue} className="w-full">다음<ChevronRight size={17}/></Button></div>
  </div>
}

/**
 * ONB-01. 사용감 선호는 **선택**이다.
 * 아무것도 고르지 않아도 다음으로 넘어가며, 그때는 서버로 보내지 않는다.
 * 피부 타입·연령·성별처럼 사람을 고정 분류하는 항목은 여기에 두지 않는다(ACC-03).
 */
function PreferenceStep({ preference, onChange, onNext }: { preference: Preference; onChange: (value: Preference) => void; onNext: () => void }) {
  const toggle = (key: 'likes' | 'avoids', value: string) => onChange({
    ...preference,
    [key]: preference[key].includes(value) ? preference[key].filter(item => item !== value) : [...preference[key], value],
  })
  const chosen = hasPreference(preference)

  return <div className="flex min-h-0 flex-1 flex-col animate-rise">
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
      <p className="text-xs font-bold text-accent">설정 3 / 3 · 선택</p>
      <h1 className="mt-2 text-[27px] font-bold leading-9 tracking-[-.045em]">선호하는 사용감이<br/>있으신가요?</h1>
      <p className="mt-2 text-sm leading-6 text-muted">몰라도 괜찮아요. 실제 기록이 쌓이기 전까지 참고만 하는 값이라 나중에 바꿀 수 있어요.</p>

      <section className="mt-7">
        <p className="text-sm font-bold">좋아하는 사용감</p>
        <div className="mt-3 flex flex-wrap gap-2">{TEXTURE_LIKES.map(value => <Chip key={value} label={value} selected={preference.likes.includes(value)} onClick={() => toggle('likes', value)}/>)}</div>
      </section>

      <section className="mt-6">
        <p className="text-sm font-bold">피하고 싶은 것</p>
        <div className="mt-3 flex flex-wrap gap-2">{TEXTURE_AVOIDS.map(value => <Chip key={value} label={value} selected={preference.avoids.includes(value)} onClick={() => toggle('avoids', value)}/>)}</div>
      </section>

      <section className="mt-6">
        <label className="block"><span className="text-sm font-bold">직접 적어두기</span>
          <textarea value={preference.note} maxLength={300} rows={3} onChange={event => onChange({ ...preference, note: event.target.value })}
            placeholder="예: 향이 강한 건 피하고 싶어요" className="mt-3 w-full resize-none rounded-2xl border border-line bg-soft p-4 text-sm leading-6 outline-none focus:border-ink"/>
        </label>
      </section>
    </div>
    <div className="safe-bottom shrink-0 border-t border-line bg-white p-4">
      <Button onClick={onNext} className="w-full">{chosen ? '저장하고 계속' : '잘 모르겠어요'}<ArrowRight size={17}/></Button>
    </div>
  </div>
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} aria-pressed={selected} className={`rounded-full border px-4 py-2 text-sm transition ${selected ? 'border-ink bg-ink font-semibold text-white' : 'border-line bg-white text-ink'}`}>{label}</button>
}

/** 온보딩 저장이 끝난 순간. 완료 모션을 한 번 보여주고 다음 화면으로 넘긴다. */
function CompleteStep({ onDone }: { onDone: () => void }) {
  const done = useRef(false)
  const latest = useRef(onDone)
  latest.current = onDone

  const finish = () => {
    if (done.current) return
    done.current = true
    latest.current()
  }

  useEffect(() => {
    // 모션이 끝나지 않는 환경에서도 멈추지 않도록 받쳐준다.
    const timer = setTimeout(() => {
      if (done.current) return
      done.current = true
      latest.current()
    }, 3600)
    return () => clearTimeout(timer)
  }, [])

  return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 text-center animate-rise">
    <BrandMotion name="check-motion" poster="/skn-assets/check-motion.png" alt="설정 완료" className="size-[220px] object-contain" onEnded={finish}/>
    <div>
      <h1 className="text-[24px] font-bold leading-8 tracking-[-.045em]">이제 시작할 준비가<br/>끝났어요.</h1>
      <p className="mt-3 text-sm text-muted">잠시 후 다음 화면으로 이동해요</p>
    </div>
    <button onClick={finish} className="text-xs font-semibold text-muted underline decoration-line underline-offset-4">바로 이동하기</button>
  </div>
}

function StoryOnboarding({ index, onBack, onNext, onSkip, pending, error }: { index: number; onBack: () => void; onNext: () => void; onSkip: () => void; pending: boolean; error?: string }) {
  const [sentiment, setSentiment] = useState<'LIKED' | 'UNSURE' | 'DISAPPOINTED'>('LIKED')
  const [connected, setConnected] = useState(false)
  const [compared, setCompared] = useState(false)
  const slides = [
    { eyebrow: 'DISCOVER → EXPERIENCE', title: '쓰는 순간부터\n내 경험이 시작돼요', body: '제품 하나 또는 실제 루틴을 시작하고, 기억이 선명할 때만 느낌을 남겨요.' },
    { eyebrow: 'RECORD → CONNECT', title: '짧은 기록이\n서로 연결돼요', body: '좋았던 점과 아쉬운 점이 다른 제품·조합의 기록과 만나 나의 반복되는 패턴이 보여요.' },
    { eyebrow: 'MY PATTERN → EXPLORE AGAIN', title: '다음 화장품에서\n다시 꺼내 써요', body: 'AI는 정답을 단정하지 않고, 제품 정보와 과거의 내 경험을 연결해 비교할 이유를 보여줘요.' },
  ]
  const slide = slides[index]
  return <div className="flex min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fbfcf8_0%,#fff_65%)]">
    <header className="z-10 shrink-0 px-5 pb-2 pt-5"><div className="flex h-10 items-center justify-between"><button onClick={onBack} aria-label="이전 소개" className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-soft"><ArrowLeft size={21}/></button><span className="text-[11px] font-bold tracking-[.08em] text-muted">SKN 사용 흐름</span><button disabled={pending} onClick={onSkip} className="-mr-2 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-soft">건너뛰기</button></div><div className="mt-4 flex justify-center gap-2">{slides.map((_, dot) => <span key={dot} className={`h-1.5 rounded-full transition-all duration-300 ${dot === index ? 'w-7 bg-ink' : 'w-1.5 bg-line'}`}/>)}</div></header>
    <div key={index} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 animate-rise">
      <div className="pt-6 text-center"><p className="text-[10px] font-black tracking-[.14em] text-accent">{slide.eyebrow}</p><h1 className="mt-3 whitespace-pre-line text-[27px] font-bold leading-[1.25] tracking-[-.05em]">{slide.title}</h1><p className="mx-auto mt-3 max-w-[340px] text-sm leading-6 text-muted">{slide.body}</p></div>
      <div className="mx-auto mt-5 max-w-[360px] overflow-hidden rounded-[30px] border border-line bg-[#f7f8f5] shadow-[0_20px_60px_rgba(25,31,22,.08)]">
        {index === 0 && <ExperienceGraphic sentiment={sentiment}/>} 
        {index === 1 && <ConnectGraphic connected={connected}/>} 
        {index === 2 && <ExploreAgainGraphic compared={compared}/>} 
      </div>
      {index === 0 && <div className="mt-4 grid grid-cols-3 gap-2">{([['LIKED','마음에 들어요'],['UNSURE','아직 모르겠어요'],['DISAPPOINTED','아쉬워요']] as const).map(([value, label]) => <button key={value} onClick={() => setSentiment(value)} className={`rounded-xl border px-2 py-2.5 text-[10px] font-bold transition ${sentiment === value ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted'}`}>{label}</button>)}</div>}
      {index === 1 && <button onClick={() => setConnected(value => !value)} className={`mx-auto mt-4 flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition ${connected ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink'}`}><Sparkles size={15}/>{connected ? '내 패턴으로 연결됐어요' : '세 경험 연결해보기'}</button>}
      {index === 2 && <button onClick={() => setCompared(value => !value)} className={`mx-auto mt-4 flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition ${compared ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-white text-ink'}`}><Sparkles size={15}/>{compared ? '내 기록과 비교했어요' : '내 기록으로 비교해보기'}</button>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0f0] p-3 text-xs leading-5 text-danger">{error}</p>}
    </div>
    <div className="safe-bottom shrink-0 border-t border-line bg-white/95 p-4 backdrop-blur"><Button disabled={pending} onClick={onNext} className="w-full">{pending ? '준비하는 중…' : index < 2 ? '다음' : 'SKN 시작하기'}<ArrowRight size={17}/></Button></div>
  </div>
}

function ExperienceGraphic({ sentiment }: { sentiment: 'LIKED' | 'UNSURE' | 'DISAPPOINTED' }) {
  const label = sentiment === 'LIKED' ? '마음에 들어요' : sentiment === 'UNSURE' ? '아직 모르겠어요' : '아쉬워요'
  const color = sentiment === 'LIKED' ? '#5365f5' : sentiment === 'UNSURE' ? '#72766f' : '#d65454'
  return <svg viewBox="0 0 360 260" className="block h-auto w-full" role="img" aria-label="화장품 사용 경험을 기록하는 과정">
    <defs><linearGradient id="exp-aura" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eef0ff"/><stop offset="1" stopColor="#e9f5cd"/></linearGradient><filter id="exp-shadow"><feDropShadow dx="0" dy="10" stdDeviation="12" floodOpacity=".12"/></filter></defs>
    <circle cx="90" cy="102" r="68" fill="url(#exp-aura)" className="onboard-pulse"/>
    <g className="onboard-float" filter="url(#exp-shadow)"><rect x="58" y="68" width="64" height="112" rx="18" fill="#fff" stroke="#dfe2dc"/><rect x="74" y="48" width="32" height="25" rx="8" fill="#20231f"/><rect x="72" y="98" width="36" height="29" rx="6" fill="#f2f4ef"/><text x="90" y="116" textAnchor="middle" fontSize="8" fontWeight="700" fill="#555a53">SKN</text></g>
    <path d="M132 130 C165 104 179 96 199 106" fill="none" stroke="#5365f5" strokeWidth="2.5" strokeLinecap="round" className="onboard-draw"/><circle cx="200" cy="106" r="4" fill="#5365f5" className="onboard-pop"/>
    <g filter="url(#exp-shadow)"><rect x="190" y="53" width="135" height="155" rx="22" fill="#fff" stroke="#dfe2dc"/><text x="211" y="79" fontSize="9" fontWeight="700" fill="#5365f5">오늘의 사용 경험</text><text x="211" y="102" fontSize="13" fontWeight="800" fill="#171816">써보니 어떠셨나요?</text><rect x="209" y="120" width="97" height="28" rx="14" fill={color}/><text x="257.5" y="138" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{label}</text><rect x="209" y="159" width="38" height="18" rx="9" fill="#f2f4ef"/><rect x="252" y="159" width="47" height="18" rx="9" fill="#f2f4ef"/><text x="228" y="171" textAnchor="middle" fontSize="7" fill="#73766f">가벼움</text><text x="275" y="171" textAnchor="middle" fontSize="7" fill="#73766f">밀림 없음</text></g>
  </svg>
}

function ConnectGraphic({ connected }: { connected: boolean }) {
  return <svg viewBox="0 0 360 260" className="block h-auto w-full" role="img" aria-label="여러 화장품 경험이 개인 패턴으로 연결되는 과정">
    <defs><filter id="connect-shadow"><feDropShadow dx="0" dy="8" stdDeviation="10" floodOpacity=".10"/></filter><linearGradient id="connect-core" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#5365f5"/><stop offset="1" stopColor="#7887ff"/></linearGradient></defs>
    <g className={connected ? 'opacity-100' : 'opacity-20'}><path d="M98 62 C150 63 173 90 208 119" fill="none" stroke="#5365f5" strokeWidth="2" className={connected ? 'onboard-draw' : ''}/><path d="M98 130 C150 130 170 130 208 130" fill="none" stroke="#5365f5" strokeWidth="2" className={connected ? 'onboard-draw onboard-delay-1' : ''}/><path d="M98 200 C150 193 175 166 208 141" fill="none" stroke="#5365f5" strokeWidth="2" className={connected ? 'onboard-draw onboard-delay-2' : ''}/></g>
    {[[30,34,'가벼움','세럼 A'],[30,102,'밀림 없음','선크림 B'],[30,172,'산뜻함','수딩젤 C']].map(([x,y,tag,name], index) => <g key={String(name)} filter="url(#connect-shadow)" className={`onboard-pop onboard-delay-${index}`}><rect x={Number(x)} y={Number(y)} width="96" height="56" rx="16" fill="#fff" stroke="#dfe2dc"/><circle cx={Number(x)+17} cy={Number(y)+18} r="7" fill={index === 1 ? '#dff5a7' : '#eef0ff'}/><text x={Number(x)+31} y={Number(y)+21} fontSize="8" fontWeight="700" fill="#171816">{name}</text><text x={Number(x)+14} y={Number(y)+42} fontSize="8" fontWeight="700" fill="#5365f5">#{tag}</text></g>)}
    <g filter="url(#connect-shadow)" className={connected ? 'onboard-pop' : ''}><circle cx="255" cy="130" r="58" fill={connected ? 'url(#connect-core)' : '#e7e9e3'}/><circle cx="255" cy="130" r="47" fill="#fff" fillOpacity=".96"/><text x="255" y="111" textAnchor="middle" fontSize="8" fontWeight="800" fill="#5365f5">내 패턴</text><text x="255" y="133" textAnchor="middle" fontSize="12" fontWeight="800" fill="#171816">아침엔 가벼운</text><text x="255" y="149" textAnchor="middle" fontSize="12" fontWeight="800" fill="#171816">마무리를 선호</text><text x="255" y="170" textAnchor="middle" fontSize="7" fill="#73766f">지지 3건 · 반대 1건</text></g>
  </svg>
}

function ExploreAgainGraphic({ compared }: { compared: boolean }) {
  return <svg viewBox="0 0 360 260" className="block h-auto w-full" role="img" aria-label="과거 경험을 다음 화장품 탐색에 활용하는 과정">
    <defs><filter id="again-shadow"><feDropShadow dx="0" dy="9" stdDeviation="11" floodOpacity=".11"/></filter><linearGradient id="again-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eef0ff"/><stop offset="1" stopColor="#f5f8ed"/></linearGradient></defs>
    <rect x="24" y="24" width="312" height="212" rx="28" fill="url(#again-bg)"/>
    <g filter="url(#again-shadow)" className="onboard-float"><rect x="47" y="70" width="82" height="125" rx="20" fill="#fff" stroke="#dfe2dc"/><rect x="68" y="50" width="40" height="29" rx="9" fill="#20231f"/><rect x="64" y="109" width="48" height="35" rx="7" fill="#f2f4ef"/><text x="88" y="130" textAnchor="middle" fontSize="8" fontWeight="800" fill="#555a53">NEW</text><text x="88" y="164" textAnchor="middle" fontSize="8" fontWeight="700" fill="#171816">새 세럼</text></g>
    <path d="M142 131 C166 107 174 103 194 111" fill="none" stroke="#5365f5" strokeWidth="2.5" className={compared ? 'onboard-draw' : ''}/><path d="M142 145 C166 166 177 169 194 159" fill="none" stroke="#9aa19a" strokeWidth="2" strokeDasharray="4 5" className={compared ? 'onboard-draw onboard-delay-1' : ''}/>
    <g filter="url(#again-shadow)"><rect x="190" y="54" width="128" height="154" rx="22" fill="#fff" stroke={compared ? '#5365f5' : '#dfe2dc'}/><circle cx="214" cy="80" r="12" fill="#eef0ff"/><path d="M210 80l3 3 6-7" fill="none" stroke="#5365f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><text x="234" y="83" fontSize="9" fontWeight="800" fill="#5365f5">SKN AI 비교</text>{compared ? <><text x="208" y="112" fontSize="11" fontWeight="800" fill="#171816">지금 살펴볼 이유</text><text x="208" y="135" fontSize="8" fill="#555a53">가벼운 제형 기록 2건과</text><text x="208" y="150" fontSize="8" fill="#555a53">비교할 수 있어요.</text><rect x="207" y="168" width="91" height="20" rx="10" fill="#eef0ff"/><text x="252.5" y="181" textAnchor="middle" fontSize="7" fontWeight="700" fill="#5365f5">내 경험 근거 2건</text></> : <><rect x="208" y="108" width="89" height="9" rx="4.5" fill="#eceee9"/><rect x="208" y="128" width="73" height="8" rx="4" fill="#eceee9"/><rect x="208" y="145" width="94" height="8" rx="4" fill="#eceee9"/><rect x="208" y="169" width="62" height="19" rx="9.5" fill="#f2f4ef"/><rect x="190" y="54" width="128" height="154" rx="22" fill="url(#again-bg)" opacity=".42" className="onboard-scan"/></>}</g>
    <path d="M104 218 C169 247 265 238 302 203" fill="none" stroke="#c7ccc4" strokeWidth="1.5" strokeDasharray="4 6"/><path d="M300 197l4 7-8 1" fill="none" stroke="#c7ccc4" strokeWidth="1.5"/>
  </svg>
}
