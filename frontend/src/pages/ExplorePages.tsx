import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, ExternalLink, Plus, Search, Sparkles, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Product, ProductFact, ProductGuide, UserProduct } from '../lib/types'
import { Button, EmptyState, ErrorState, Loading, PageHeading, ProductGlyph, Screen, SknMark, StickyActionBar, TopBar } from '../components/ui'

export function ExplorePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const products = useInfiniteQuery({
    queryKey: ['product-pages', deferredQuery],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.products(deferredQuery, pageParam, 24),
    getNextPageParam: lastPage => lastPage.hasMore ? lastPage.nextCursor : undefined,
  })
  const productItems = products.data?.pages.flatMap(page => page.items) || []
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = products
  const openRecommendationChat = () => navigate(startChatPath('RECOMMEND', '내가 좋아했던 사용감과 아쉬웠던 경험을 바탕으로 다음에 탐색할 제품 후보를 찾아줘.'))
  const contextualProduct = productItems.find(product => product.personalRecordCount > 0) || productItems[0]
  const hasPersonalContext = Boolean(contextualProduct?.personalRecordCount)
  const searching = query.trim() !== deferredQuery
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '240px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])
  return <Screen>
    <TopBar title="탐색" right={<Link to="/my-products" className="whitespace-nowrap text-xs font-semibold text-muted">내 화장품</Link>}/>
    <div className="px-5 pt-6">
      <PageHeading title="다음에 써볼 제품" description={<>인기 순위보다, 이전에 남긴 내 경험과<br/>비교하며 탐색해요.</>}/>
      <div className="sticky top-[calc(64px+env(safe-area-inset-top))] z-10 -mx-1 mt-5 bg-paper/95 px-1 py-3 backdrop-blur"><label className="flex h-12 items-center gap-3 rounded-2xl border border-line bg-white px-4 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft"><Search size={19} className="text-muted"/><input value={query} onChange={e => setQuery(e.target.value)} aria-label="제품 검색" enterKeyHint="search" autoComplete="off" placeholder="브랜드 또는 제품명" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>{searching && <span aria-label="검색 중" className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"/>}{query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="grid size-9 place-items-center rounded-full hover:bg-soft"><X size={17} className="text-muted"/></button>}</label></div>
      {!deferredQuery && contextualProduct && <section className="mb-7"><h2 className="text-sm font-bold">{hasPersonalContext ? '내 기록에서 다시 볼 제품' : '제품 정보부터 둘러보기'}</h2><div className="mt-3 grid grid-cols-2 gap-3"><Link to={`/products/${contextualProduct.id}`} className="rounded-[22px] border border-line bg-white p-4 transition hover:border-[#cfd4cc] active:scale-[.99]"><ProductGlyph category={contextualProduct.category} src={contextualProduct.imageUrl}/><p className="mt-3 text-[10px] font-semibold text-muted">{contextualProduct.brand}</p><h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5">{contextualProduct.name}</h3><p className="mt-2 text-[10px] font-bold text-accent">{hasPersonalContext ? `내 기록 ${contextualProduct.personalRecordCount}건과 비교` : '제품 정보 살펴보기'}</p></Link><button type="button" onClick={openRecommendationChat} className="rounded-[22px] border border-[#d9ddff] bg-[#f8f8ff] p-4 text-left transition hover:border-[#bfc6f5] active:scale-[.99]"><div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Sparkles size={20}/></div><p className="mt-4 text-[10px] font-semibold text-accent">SKN AI</p><h3 className="mt-1 text-sm font-bold leading-5">내 경험에서<br/>다음 제품 찾기</h3><p className="mt-2 text-[10px] text-muted">근거가 부족하면 그대로 알려드려요</p></button></div></section>}
      <h2 className="mb-3 text-[15px] font-medium">{deferredQuery ? '검색 결과' : '전체 제품'}</h2>
      {products.isPending ? <Loading/> : products.isError && !productItems.length ? <ErrorState message={products.error.message} onRetry={() => products.refetch()}/> : productItems.length ? <><div className="space-y-2">{productItems.map(product => <ProductRow key={product.id} product={product}/>)}</div><div ref={loadMoreRef} className="grid min-h-24 place-items-center pb-4" aria-live="polite">{isFetchingNextPage ? <div className="flex items-center gap-2 text-xs text-muted"><span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"/>제품 더 불러오는 중</div> : products.isFetchNextPageError ? <button type="button" onClick={() => fetchNextPage()} className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold">다시 불러오기</button> : !hasNextPage ? <p className="text-[11px] text-muted">{deferredQuery ? '검색된 제품을 모두 봤어요.' : '모든 제품을 봤어요.'}</p> : null}</div></> : <EmptyState icon={<Search/>} title="검색 결과가 없어요" body="브랜드나 제품명을 다시 확인해주세요." action={deferredQuery ? <Button variant="secondary" onClick={() => setQuery('')}>전체 제품 보기</Button> : undefined}/>}
    </div>
  </Screen>
}

function ProductRow({ product }: { product: Product }) {
  const details = [product.category, product.volume].filter(Boolean).join(' · ')
  return <Link to={`/products/${product.id}`} className="flex items-center rounded-[20px] border border-line bg-white p-3 transition hover:border-[#cfd4cc] active:scale-[.99]"><ProductGlyph category={product.category} src={product.imageUrl}/><div className="min-w-0 flex-1 pr-1"><div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><span>{product.brand}</span>{product.verified && <BadgeCheck size={13} className="text-accent"/>}</div><h2 className="mt-1 truncate text-[15px] font-bold tracking-[-.02em]">{product.name}</h2>{details && <p className="mt-1 text-xs text-muted">{details}</p>}{product.personalRecordCount > 0 ? <p className="mt-2 inline-flex rounded-full bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">내 비교 기록 {product.personalRecordCount}건</p> : product.owned ? <p className="mt-2 text-[10px] font-bold text-muted">내 화장품에 있음</p> : null}</div><ChevronRight size={18} className="text-muted"/></Link>
}

export function ProductPage() {
  const { id } = useParams()
  const productId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [added, setAdded] = useState(false)
  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId), enabled: Number.isFinite(productId) })
  const add = useMutation({
    mutationFn: () => api.addProduct(productId),
    onSuccess: () => {
      setAdded(true)
      queryClient.invalidateQueries({ queryKey: ['product-pages'] })
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['user-products'] })
      queryClient.invalidateQueries({ queryKey: ['home'] })
    },
  })
  if (!Number.isSafeInteger(productId) || productId < 1) return <Screen nav={false}><TopBar title="제품" back/><ErrorState message="제품 주소를 확인해주세요."/></Screen>
  if (product.isPending) return <Screen nav={false}><TopBar title="제품" back/><Loading/></Screen>
  if (product.isError) return <Screen nav={false}><TopBar title="제품" back/><ErrorState message={product.error.message} onRetry={() => product.refetch()}/></Screen>
  const data = product.data
  const guide = data.guide
  const owned = data.owned || added
  const texture = guide?.highlights.find(highlight => highlight.title === '제형')?.detail
    ?.replace(/\s*제형으로 등록된 제품이에요\.?$/, '')
    .trim()
  const overviewItems = guide ? [
    { label: '제품 유형', value: data.category },
    { label: '제형', value: texture },
    { label: '루틴 단계', value: guide.routineStep?.trim() },
    { label: '사용 방식', value: guide.usageType?.trim() },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value)) : []
  const hasUsage = Boolean(guide?.usageTiming?.length || guide?.usageInstructions?.length)
  const openProductChat = () => navigate(startChatPath(
    'PRODUCT',
    data.personalRecordCount > 0
      ? '이 제품을 지금 내 기록과 비교해줘.'
      : '이 제품을 확인된 정보와 현재 루틴을 바탕으로 같이 살펴봐줘.',
    { productId },
  ))
  return <Screen nav={false} className="bg-white pb-44">
    <CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate('/explore')}/>
    <div className="pb-8">
      <ProductHero product={data}/>
      <div className="px-5">
        {guide?.summary?.trim() && <GuideSummary guide={guide} productName={data.name}/>}
        {overviewItems.length > 0 && <ProductOverview items={overviewItems}/>}
        {guide && guide.highlights && guide.highlights.length > 0 && <ProductFeatures highlights={guide.highlights}/>}
        {guide && hasUsage && <UsageGuide guide={guide}/>} 
        {data.facts.length > 0 && <VerifiedFacts facts={data.facts}/>}
        <div className="py-8"><ProductAiAction product={data} onClick={openProductChat}/></div>
      </div>
    </div>
    <StickyActionBar className="px-4 pb-4 pt-3">
      {added && <p className="mb-2 text-center text-[11px] font-semibold text-[#52722d]">내 화장품에 담았어요. 현재 루틴은 바뀌지 않아요.</p>}
      {add.error && <p className="mb-2 text-center text-[11px] font-semibold leading-5 text-danger">{add.error.message}</p>}
      {owned ? <div className="grid grid-cols-2 gap-2.5"><Button className="rounded-full border-0 bg-[#edf3ff]" variant="secondary" onClick={() => navigate('/my-products')}>내 화장품</Button><Button className="rounded-full bg-black" onClick={openProductChat}>{data.personalRecordCount > 0 ? '내 기록 비교' : 'AI에게 묻기'}</Button></div> : <div className="grid grid-cols-2 gap-2.5">
        <Button className="rounded-full border-0 bg-[#edf3ff]" variant="secondary" onClick={openProductChat} aria-label="AI에게 이 제품 물어보기">AI에게 묻기</Button>
        <Button className="rounded-full bg-black" disabled={add.isPending} onClick={() => add.mutate()}>{add.isPending ? '추가하는 중…' : '내 화장품 추가'}</Button>
      </div>}
    </StickyActionBar>
  </Screen>
}

function ProductHero({ product }: { product: Product }) {
  const meta = [product.volume, product.versionLabel ? `${product.versionLabel} 버전` : undefined].filter(Boolean)
  return <section>
    <div className="relative mx-[18px] flex h-[208px] items-center justify-center overflow-hidden rounded-[20px] border border-[#cfe0ff] bg-[#fbfcff]">
      {product.imageUrl ? <><img src={product.imageUrl} alt="" className="absolute left-[116px] top-[30px] h-[122px] w-auto object-contain opacity-90"/><img src={product.imageUrl} alt={`${product.brand} ${product.name}`} className="relative ml-12 h-[180px] w-auto object-contain"/></> : <ProductGlyph category={product.category} size="lg"/>}
    </div>
    <div className="px-[30px] pb-6 pt-5">
      <div className="text-[12px] text-[#777]"><span>{product.brand} {product.category}</span></div>
      <h1 className="mt-2 text-[31px] font-semibold leading-[1.18] tracking-[-.055em]">{product.name}</h1>
      {(meta.length > 0 || product.verified) && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-medium text-black">{meta.map(item => <span key={item}>{item}</span>)}{product.verified && <span className="sr-only">제품 버전 확인됨</span>}</div>}
    </div>
  </section>
}

function GuideSummary({ guide, productName }: { guide: ProductGuide; productName: string }) {
  const aiGenerated = guide.origin === 'AI_GENERATED'
  const summary = withoutRepeatedProductName(guide.summary, productName)
  return <section aria-labelledby="guide-summary-title" className="rounded-[20px] border border-[#cfe0ff] px-4 py-4">
    <div className="flex items-center gap-1.5 text-[14px] font-medium text-black"><Sparkles size={18} className="text-[#9ec1ff]"/><span>{aiGenerated ? 'SKN AI 제품 요약' : 'SKN 제품 요약'}</span></div>
    <h2 id="guide-summary-title" className="sr-only">이 제품이 무엇인지</h2>
    <p className="mt-3 pl-2 text-[14px] leading-6 tracking-[-.02em]">・ {summary}</p>
  </section>
}

function withoutRepeatedProductName(summary: string, productName: string) {
  const trimmed = summary.trim()
  if (!trimmed.startsWith(productName)) return trimmed
  const remainder = trimmed.slice(productName.length)
  if (!/^\s*[:：\-–—]/.test(remainder)) return trimmed
  return remainder.replace(/^\s*[:：\-–—]\s*/, '').trim()
}

function ProductOverview({ items }: { items: { label: string; value: string }[] }) {
  return <section aria-labelledby="product-overview-title" className="border-t border-line py-7">
    <h2 id="product-overview-title" className="text-[18px] font-bold tracking-[-.03em]">기본 정보</h2>
    <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-[20px] border border-line bg-[#fafbf8]">
      {items.map(({ label, value }, index) => <div key={label} className={`min-w-0 p-4 ${index % 2 === 0 ? 'border-r border-line' : ''} ${index < 2 && items.length > 2 ? 'border-b border-line' : ''}`}>
        <dt className="text-[10px] font-bold text-muted">{label}</dt>
        <dd className="mt-1.5 text-[14px] font-semibold leading-5 tracking-[-.02em]">{value}</dd>
      </div>)}
    </dl>
  </section>
}

function ProductFeatures({ highlights }: { highlights: ProductGuide['highlights'] }) {
  return <section aria-labelledby="product-features-title" className="border-t border-line py-7">
    <h2 id="product-features-title" className="text-[18px] font-bold tracking-[-.03em]">제품 특징</h2>
    <div className="mt-4 divide-y divide-line rounded-[20px] border border-line bg-white px-4">
      {highlights.map((highlight, index) => <div key={`${highlight.title}-${index}`} className="grid grid-cols-[88px_1fr] gap-3 py-4">
        <p className="text-[11px] font-bold leading-5 text-muted">{highlight.title}</p>
        <p className="text-[13px] font-semibold leading-5 tracking-[-.01em]">{highlight.detail}</p>
      </div>)}
    </div>
  </section>
}

function UsageGuide({ guide }: { guide: ProductGuide }) {
  const timings = guide.usageTiming.filter(Boolean)
  const instructions = guide.usageInstructions.filter(Boolean)
  return <section aria-labelledby="usage-guide-title" className="border-t border-line py-7">
    <div className="flex items-center justify-between gap-3"><h2 id="usage-guide-title" className="text-[18px] font-bold tracking-[-.03em]">사용 방법</h2>{timings.length > 0 && <div className="flex gap-1.5">{timings.map(timing => <span key={timing} className="rounded-full bg-accent-soft px-2.5 py-1.5 text-[10px] font-bold text-accent">{timing}</span>)}</div>}</div>
    {instructions.length > 0 && <ol className="mt-5 space-y-4">{instructions.map((instruction, index) => <li key={`${instruction}-${index}`} className="flex gap-3.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{index + 1}</span><p className="pt-0.5 text-[14px] leading-6">{instruction}</p></li>)}</ol>}
  </section>
}

function VerifiedFacts({ facts }: { facts: ProductFact[] }) {
  return <section aria-labelledby="verified-facts-title" className="border-t border-line py-7">
    <div className="flex items-center justify-between gap-4"><h2 id="verified-facts-title" className="text-[18px] font-bold tracking-[-.03em]">출처에서 확인한 정보</h2><span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#52722d]"><BadgeCheck size={13}/>{facts.length}건</span></div>
    <div className="mt-4 divide-y divide-line border-y border-line">{facts.map((fact, index) => <article key={`${fact.type}-${fact.text}-${index}`} className="py-4">
      <p className="text-[10px] font-bold text-[#66833e]">{factTypeLabel(fact.type)}</p><p className="mt-1.5 text-[13px] font-semibold leading-5">{fact.text}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-[10px] text-muted"><a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-semibold underline decoration-line underline-offset-2"><span className="truncate">{fact.sourceLabel}</span><ExternalLink size={11} className="shrink-0"/></a><span className="shrink-0">{formatProductDate(fact.checkedAt)} 확인</span></div>
    </article>)}</div>
  </section>
}

function ProductAiAction({ product, onClick }: { product: Product; onClick: () => void }) {
  const hasRecords = product.personalRecordCount > 0
  return <button type="button" onClick={onClick} aria-labelledby="product-ai-title" className="flex w-full items-center gap-4 rounded-[22px] border border-[#dfe1ff] bg-[linear-gradient(135deg,#f1f2ff_0%,#fafaff_100%)] p-4 text-left transition active:scale-[.99]">
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_rgba(83,101,245,.22)]"><Sparkles size={19}/></span>
    <span className="min-w-0 flex-1"><span className="text-[10px] font-bold text-accent">SKN AI</span><span id="product-ai-title" className="mt-1 block text-[15px] font-bold leading-5 tracking-[-.02em]">{hasRecords ? `내 경험 ${product.personalRecordCount}건과 비교하기` : '내 루틴에서 이 제품 물어보기'}</span><span className="mt-1 block text-[11px] leading-4 text-muted">제품 정보와 내 기록을 구분해서 답해요.</span></span>
    <ArrowRight size={18} className="shrink-0 text-accent"/>
  </button>
}

function factTypeLabel(type: string) {
  const labels: Record<string, string> = {
    DIRECTIONS: '사용 방법',
    TEXTURE: '제형·사용감',
    LABEL_CLAIM: '제품 표시 정보',
    CAUTION: '사용 시 주의',
    SUN_PROTECTION: '자외선 차단 표시',
    INGREDIENT_LABEL: '성분 표시',
    CERTIFICATION: '인증 정보',
  }
  return labels[type] || '확인된 제품 정보'
}

function formatProductDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10).replaceAll('-', '.')
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

export function ShelfPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'ALL' | 'ROUTINE' | 'UNUSED'>('ALL')
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const routineIds = new Set(current.data?.items.map(item => item.userProductId) || [])
  const filtered = products.data?.filter(item => filter === 'ALL' || (filter === 'ROUTINE' ? routineIds.has(item.id) : !routineIds.has(item.id) && !(item.product?.personalRecordCount)))
  const unusedCount = products.data?.filter(item => !routineIds.has(item.id) && !item.product?.personalRecordCount).length || 0
  const currentError = current.error instanceof ApiError && current.error.status === 404 ? null : current.error
  if (products.isPending || current.isPending) return <Screen><CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate('/explore')}/><Loading label="내 화장품을 정리하는 중"/></Screen>
  if (products.isError || currentError) return <Screen><CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate('/explore')}/><ErrorState message={(products.error || currentError)?.message || '내 화장품을 불러오지 못했어요.'} onRetry={() => { products.refetch(); current.refetch() }}/></Screen>
  return <Screen className="bg-white">
    <CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate('/explore')}/>
    <div className="px-5 pb-8"><PageHeading title="내가 가진 화장품" description="루틴에 넣을 제품을 고를 수 있어요."/>
      {!!products.data?.length && <div className="hide-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1">{([['ALL',`전체 ${products.data.length}`],['ROUTINE',`현재 루틴 ${routineIds.size}`],['UNUSED',`아직 안 써봄 ${unusedCount}`]] as const).map(([value,label]) => <button type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-medium ${filter === value ? 'border-black bg-black text-white' : 'border-[#cfe0ff] bg-white text-[#5f7396]'}`}>{label}</button>)}</div>}
      {products.data?.length ? filtered?.length ? <div className="mt-4 grid grid-cols-2 gap-3">{filtered.map(item => <ShelfCard key={item.id} item={item} inRoutine={routineIds.has(item.id)} onStart={() => {
        if (item.product) navigate(`/products/${item.product.id}`)
        else navigate('/routine/edit')
      }}/>)}</div> : <ShelfEmpty filter={filter} onAdd={() => navigate('/explore')}/> : <ShelfEmpty filter="ALL" onAdd={() => navigate('/explore')}/>}
    </div>
  </Screen>
}

function ShelfCard({ item, inRoutine, onStart }: { item: UserProduct; inRoutine: boolean; onStart: () => void }) {
  const product = item.product
  const name = product?.name || item.customName || '이름 없는 제품'
  return <button type="button" onClick={onStart} aria-label={`${name} 상세 보기`} className="min-h-[198px] rounded-[20px] border border-[#cfe0ff] bg-[#fcfdff] px-3 pb-3 pt-3 text-left transition hover:border-[#a9c6f3] active:scale-[.99]"><p className="truncate text-[10px] text-[#737880]">{product?.brand || item.customBrand || '브랜드 미입력'} {product?.category || item.customCategory}</p><h2 className="mt-1 truncate text-[13px] font-semibold leading-5">・ {name}</h2><div className="mt-2 grid h-[96px] place-items-center rounded-[15px] border border-dashed border-[#d8e6ff] bg-white">{product?.imageUrl ? <img src={product.imageUrl} alt="" className="h-[88px] w-auto object-contain"/> : <ProductGlyph category={product?.category || item.customCategory} size="sm"/>}</div><p className="mt-2 text-[10px] font-medium text-[#5f7396]">{inRoutine ? '현재 루틴' : product?.personalRecordCount ? `연결된 경험 ${product.personalRecordCount}건` : '아직 안 써봄'} <ArrowRight className="inline" size={11}/></p></button>
}

function ShelfEmpty({ filter, onAdd }: { filter: 'ALL' | 'ROUTINE' | 'UNUSED'; onAdd: () => void }) {
  const title = filter === 'ROUTINE' ? '현재 루틴에 제품이 없어요' : filter === 'UNUSED' ? '아직 사용 전인 제품이 없어요' : '아직 추가한 화장품이 없어요'
  const body = filter === 'ROUTINE' ? '루틴에서 실제 사용하는 제품을 추가해보세요.' : filter === 'UNUSED' ? '새로 추가한 제품은 현재 루틴에\n넣기 전까지 여기에 보여요.' : '탐색에서 제품을 찾아 내 화장품에 추가해주세요.'
  return <div className="pt-24 text-center"><button type="button" onClick={onAdd} aria-label="탐색에서 화장품 추가하기" className="relative mx-auto block rounded-full"><img src="/skn-assets/ai-drop.png" alt="" className="size-[190px] object-contain"/><span aria-hidden="true" className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl shadow-md">+</span></button><h2 className="mt-5 text-[22px] font-medium tracking-[-.035em]">{title}</h2><p className="mt-3 whitespace-pre-line text-[14px] leading-5 text-[#8c8c8c]">{body}</p></div>
}

function CatalogHeader({ onBack, onAdd }: { onBack: () => void; onAdd: () => void }) {
  return <header className="safe-top sticky top-0 z-30 grid min-h-[72px] shrink-0 grid-cols-3 items-center bg-white/95 px-5 backdrop-blur-xl"><button type="button" onClick={onBack} aria-label="뒤로" className="-ml-2 grid size-11 place-items-center justify-self-start rounded-full transition hover:bg-soft active:scale-95"><ChevronLeft size={24}/></button><SknMark className="h-10 w-10 justify-self-center"/><button type="button" onClick={onAdd} aria-label="화장품 추가" className="grid size-11 place-items-center justify-self-end rounded-full border border-line bg-white shadow-[0_3px_12px_rgba(0,0,0,.06)] transition hover:bg-soft active:scale-95"><Plus size={21}/></button></header>
}
