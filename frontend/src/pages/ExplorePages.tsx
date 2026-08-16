import { useDeferredValue, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, ChevronRight, Clock3, ExternalLink, FlaskConical, Plus, Search, Sparkles, X } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Experience, Product, ProductFact, ProductGuide, Routine, UserProduct } from '../lib/types'
import { AppHeader, BottomSheet, Button, ErrorState, FloatingAddButton, Loading, PageHeading, ProductGlyph, Screen, StickyActionBar, TopBar } from '../components/ui'

export function ExplorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customBrand, setCustomBrand] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('')
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
  const customAdd = useMutation({
    mutationFn: () => api.addCustomProduct(customBrand.trim(), customName.trim(), customCategory.trim()),
    onSuccess: item => {
      queryClient.invalidateQueries({ queryKey: ['user-products'] })
      queryClient.invalidateQueries({ queryKey: ['product-pages'] })
      queryClient.invalidateQueries({ queryKey: ['home'] })
      setCustomOpen(false)
      navigate(`/my-products/${item.id}`)
    },
  })
  const openCustomProduct = () => {
    setCustomName(query.trim())
    customAdd.reset()
    setCustomOpen(true)
  }
  const submitCustomProduct = (event: FormEvent) => {
    event.preventDefault()
    if (customName.trim()) customAdd.mutate()
  }
  const contextualProduct = productItems.find(product => product.personalRecordCount > 0) || productItems[0]
  const hasPersonalContext = Boolean(contextualProduct?.personalRecordCount)
  const searching = query.trim() !== deferredQuery
  const categoryOptions = ['클렌징', '토너', '세럼', '앰플', '크림', '선케어']
  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || !hasNextPage) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '240px 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (customOpen) return <Screen nav={false} className="pb-28">
    <AppHeader back onBack={() => { if (!customAdd.isPending) setCustomOpen(false) }} profile={false} notifications={false} sticky/>
    <form id="custom-product-form" onSubmit={submitCustomProduct} className="px-5 pb-8 pt-4">
      <PageHeading eyebrow="DIRECT ADD" title={<>목록에 없는<br/>화장품 등록</>} description="내가 확인한 이름과 유형만 저장하고, 카탈로그 제품 정보와는 구분해요."/>
      <div className="mt-7 rounded-[22px] bg-[#f4f7fc] p-5"><p className="text-sm font-medium">추가해도 루틴은 그대로예요.</p><p className="mt-1.5 text-xs leading-5 text-muted">등록을 마친 뒤 제품 상세를 확인하고, 원할 때 루틴 편집에서 실제 사용 조합에 넣을 수 있어요.</p></div>
      <div className="mt-8 space-y-6">
        <label className="block"><span className="mb-2 block text-sm font-medium">제품명 <span className="text-danger">필수</span></span><input autoFocus value={customName} onChange={event => setCustomName(event.target.value)} maxLength={160} placeholder="예: 시카 카밍 수딩젤" className="field-control h-[54px] w-full px-4 text-base"/></label>
        <label className="block"><span className="mb-2 block text-sm font-medium">브랜드 <span className="font-normal text-muted">선택</span></span><input value={customBrand} onChange={event => setCustomBrand(event.target.value)} maxLength={120} placeholder="브랜드 이름" className="field-control h-[54px] w-full px-4 text-base"/></label>
        <fieldset><legend className="text-sm font-medium">제품 유형 <span className="font-normal text-muted">선택</span></legend><div className="mt-3 flex flex-wrap gap-2">{categoryOptions.map(category => <button type="button" key={category} aria-pressed={customCategory === category} onClick={() => setCustomCategory(value => value === category ? '' : category)} className={`min-h-11 rounded-full border px-4 text-sm font-medium transition ${customCategory === category ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-black/25'}`}>{category}</button>)}</div><input value={customCategory} onChange={event => setCustomCategory(event.target.value)} maxLength={80} placeholder="목록에 없으면 직접 입력" className="field-control mt-3 h-[52px] w-full px-4 text-base"/></fieldset>
      </div>
      {customAdd.error && <p role="alert" className="mt-5 text-sm text-danger">{customAdd.error.message}</p>}
    </form>
    <StickyActionBar><Button type="submit" form="custom-product-form" disabled={!customName.trim() || customAdd.isPending} className="w-full">{customAdd.isPending ? '등록하는 중…' : '내 화장품에 등록'}</Button></StickyActionBar>
  </Screen>

  return <Screen nav={false}>
    <AppHeader back onBack={() => navigate(-1)} profile={false} sticky right={<Link to="/my-products" className="whitespace-nowrap rounded-full px-2 py-2 text-xs font-medium text-muted">My Lab</Link>}/>
    <div className="px-5 pb-8 pt-4">
      <PageHeading title="화장품 찾기" description="정확한 제품과 버전을 확인하고 내 화장품에 담아요."/>
      <div className="sticky top-[calc(64px+env(safe-area-inset-top))] z-10 -mx-1 mt-6 bg-paper/95 px-1 py-3 backdrop-blur"><label className="flex h-[58px] items-center gap-3 rounded-full bg-[#f3f6fa] px-5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-black"><input value={query} onChange={e => setQuery(e.target.value)} aria-label="제품 검색" enterKeyHint="search" autoComplete="off" placeholder="브랜드 또는 제품명" className="min-w-0 flex-1 bg-transparent text-base outline-none"/>{searching && <span aria-label="검색 중" className="size-4 animate-spin rounded-full border-2 border-line border-t-ink"/>}{query ? <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="grid size-9 place-items-center rounded-full bg-white"><X size={17} className="text-muted"/></button> : <Search size={22}/>}</label></div>
      {!deferredQuery && <div className="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">{categoryOptions.map(category => <button type="button" key={category} onClick={() => setQuery(category)} className="min-h-10 shrink-0 rounded-full bg-[#f2f2f2] px-4 text-sm text-black/65 transition hover:bg-black hover:text-white">{category}</button>)}</div>}
      {!deferredQuery && contextualProduct && <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-xs font-medium tracking-[.08em] text-[#7892bb]">FOR YOU</p><h2 className="mt-1 text-lg font-medium">{hasPersonalContext ? '내 기록에서 다시 보기' : '먼저 둘러볼 제품'}</h2></div></div><Link to={productPath(contextualProduct.id, returnTo)} className="group mt-4 flex min-h-[150px] overflow-hidden rounded-[26px] border border-[#d9e6ff] bg-[#f8fbff] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(68,96,145,.12)] active:scale-[.99]"><span className="grid w-[140px] shrink-0 place-items-center bg-white/70 p-3"><ProductGlyph category={contextualProduct.category} src={contextualProduct.imageUrl}/></span><span className="flex min-w-0 flex-1 flex-col p-4"><span className="text-xs text-[#7892bb]">{contextualProduct.brand} · {contextualProduct.category}</span><strong className="mt-2 line-clamp-2 text-lg font-medium leading-6">{contextualProduct.name}</strong><span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-[#5f7396]">{hasPersonalContext ? `내 기록 ${contextualProduct.personalRecordCount}건과 비교` : '제품 정보 살펴보기'}<ArrowRight size={14} className="transition group-hover:translate-x-0.5"/></span></span></Link></section>}
      <div className="mb-3 mt-10 flex items-center justify-between gap-3"><h2 className="text-lg font-medium">{deferredQuery ? `“${deferredQuery}” 검색 결과` : '전체 제품'}</h2>{!products.isPending && <span className="text-xs text-muted">{productItems.length}개{hasNextPage ? '+' : ''}</span>}</div>
      {products.isPending
        ? <Loading/>
        : products.isError && !productItems.length
          ? <ErrorState message={products.error.message} onRetry={() => products.refetch()}/>
          : productItems.length
            ? <><div className="space-y-2">{productItems.map(product => <ProductRow key={product.id} product={product} returnTo={returnTo}/>)}</div><div ref={loadMoreRef} className="grid min-h-24 place-items-center pb-4" aria-live="polite">{isFetchingNextPage ? <div className="flex items-center gap-2 text-xs text-muted"><span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent"/>제품 더 불러오는 중</div> : products.isFetchNextPageError ? <button type="button" onClick={() => fetchNextPage()} className="rounded-full border border-line bg-white px-4 py-2 text-xs font-medium">다시 불러오기</button> : !hasNextPage ? <p className="text-xs text-muted">{deferredQuery ? '검색된 제품을 모두 봤어요.' : '모든 제품을 봤어요.'}</p> : null}</div></>
            : <div className="rounded-[26px] bg-[#f6f8fb] px-5 py-10 text-center"><Search className="mx-auto text-[#7892bb]"/><h2 className="mt-4 text-xl font-medium">검색 결과가 없어요</h2><p className="mt-2 text-sm leading-6 text-muted">목록에 없는 제품이라면<br/>내가 확인한 이름으로 직접 등록할 수 있어요.</p><Button onClick={openCustomProduct} className="mt-6 w-full">이 이름으로 직접 등록</Button></div>}
      {!products.isPending && !products.isError && productItems.length > 0 && <button type="button" onClick={openCustomProduct} className="mb-5 mt-3 flex min-h-[72px] w-full items-center justify-between rounded-[20px] border border-dashed border-[#b9cceb] bg-[#fbfcff] px-4 text-left transition hover:border-[#7892bb] active:scale-[.99]"><span><span className="block text-sm font-medium">찾는 제품이 목록에 없나요?</span><span className="mt-1 block text-xs text-muted">이름과 유형으로 직접 등록</span></span><span className="grid size-10 place-items-center rounded-full bg-white text-[#5f7396] shadow-sm"><Plus size={18}/></span></button>}
    </div>
  </Screen>
}

function ProductRow({ product, returnTo }: { product: Product; returnTo?: string }) {
  const details = [product.category, product.volume].filter(Boolean).join(' · ')
  return <Link to={productPath(product.id, returnTo)} className="group flex min-h-[112px] items-center gap-4 rounded-[22px] border border-[#d9e6ff] bg-[#fbfdff] p-3 transition hover:-translate-y-0.5 hover:border-[#aac3ea] hover:shadow-[0_10px_25px_rgba(68,96,145,.09)] active:scale-[.99]"><span className="grid size-[84px] shrink-0 place-items-center rounded-[17px] bg-white">{product.imageUrl ? <img src={product.imageUrl} alt="" className="size-full object-contain p-2"/> : <ProductGlyph category={product.category} src={product.imageUrl} size="sm"/>}</span><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-xs font-medium text-[#7892bb]"><span className="truncate">{product.brand}</span>{product.verified && <BadgeCheck size={13} className="shrink-0"/>}</span><strong className="mt-1.5 block truncate text-base font-medium tracking-[-.02em]">{product.name}</strong>{details && <span className="mt-1 block text-xs text-muted">{details}</span>}{product.personalRecordCount > 0 ? <span className="mt-2 inline-flex rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">내 기록 {product.personalRecordCount}건</span> : product.owned ? <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-muted">내 화장품</span> : null}</span><ChevronRight size={18} className="shrink-0 text-[#7892bb] transition group-hover:translate-x-0.5"/></Link>
}

export function ProductPage() {
  const { id } = useParams()
  const productId = Number(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))
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
    <CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate(explorePath(returnTo))}/>
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
      {added && <p className="mb-2 text-center text-xs font-medium text-[#52722d]">내 화장품에 담았어요. 현재 루틴은 바뀌지 않아요.</p>}
      {add.error && <p className="mb-2 text-center text-xs font-medium leading-5 text-danger">{add.error.message}</p>}
      {owned ? <div className="grid grid-cols-2 gap-2.5"><Button className="rounded-full border-0 bg-[#edf3ff]" variant="secondary" onClick={() => navigate(returnTo || '/my-products')}>{returnTo ? '루틴 계속 편집' : '내 화장품'}</Button><Button className="rounded-full bg-black" onClick={openProductChat}>{data.personalRecordCount > 0 ? '내 기록 비교' : 'AI에게 묻기'}</Button></div> : <div className="grid grid-cols-2 gap-2.5">
        <Button className="rounded-full border-0 bg-[#edf3ff]" variant="secondary" onClick={openProductChat} aria-label="AI에게 이 제품 물어보기">AI에게 묻기</Button>
        <Button className="rounded-full bg-black" disabled={add.isPending} onClick={() => add.mutate()}>{add.isPending ? '추가하는 중…' : '내 화장품 추가'}</Button>
      </div>}
    </StickyActionBar>
  </Screen>
}

export function CustomProductPage() {
  const { id } = useParams()
  const userProductId = Number(id)
  const navigate = useNavigate()
  const item = useQuery({
    queryKey: ['user-product', userProductId],
    queryFn: () => api.userProduct(userProductId),
    enabled: Number.isSafeInteger(userProductId) && userProductId > 0,
  })
  useEffect(() => {
    if (item.data?.product) navigate(`/products/${item.data.product.id}`, { replace: true })
  }, [item.data?.product, navigate])
  if (!Number.isSafeInteger(userProductId) || userProductId < 1) return <Screen nav={false}><TopBar title="내 화장품" back/><ErrorState message="화장품 주소를 확인해주세요."/></Screen>
  if (item.isPending) return <Screen nav={false}><TopBar title="내 화장품" back/><Loading label="화장품을 불러오는 중"/></Screen>
  if (item.isError) return <Screen nav={false}><TopBar title="내 화장품" back/><ErrorState message={item.error.message} onRetry={() => item.refetch()}/></Screen>
  if (item.data.product) return <Screen nav={false}><TopBar title="내 화장품" back/><Loading label="제품 상세로 이동하는 중"/></Screen>

  const data = item.data
  const name = data.product?.name || data.customName || '이름 없는 제품'
  const brand = data.product?.brand || data.customBrand || '브랜드 미입력'
  const category = data.product?.category || data.customCategory || '제품 유형 미입력'
  const askAi = () => navigate(startChatPath('GENERAL', `내가 직접 등록한 “${name}”의 사용 맥락을 정리해줘. 확인된 카탈로그 정보가 없으니 제품 사실을 추측하지 말고, 내가 남긴 기록과 현재 루틴만 구분해서 살펴봐줘.`))

  return <Screen nav={false} className="bg-white pb-40">
    <CatalogHeader onBack={() => navigate(-1)} onAdd={() => navigate('/explore')}/>
    <div className="px-5 pb-8 pt-3">
      <section className="overflow-hidden rounded-[24px] border border-[#cfe0ff] bg-[#fbfcff]">
        <div className="grid h-[230px] place-items-center border-b border-[#e1ebff] bg-white/75"><ProductGlyph category={category} size="lg"/></div>
        <div className="px-5 pb-6 pt-5"><p className="text-xs font-medium text-[#737880]">{brand} · {category}</p><h1 className="mt-2 text-3xl font-medium leading-[1.18] tracking-[-.05em]">{name}</h1><div className="mt-4 flex flex-wrap gap-2">{data.inCurrentRoutine && <span className="rounded-full bg-[#eef4e9] px-3 py-1.5 text-xs font-medium text-[#657253]">현재 루틴</span>}<span className="rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-medium text-[#5f7396]">경험 {data.personalRecordCount}건</span></div></div>
      </section>

      <section className="mt-6 rounded-[20px] border border-line bg-[#fafbf8] p-5" aria-labelledby="custom-product-info"><div className="flex items-center gap-2"><FlaskConical size={17} className="text-muted"/><h2 id="custom-product-info" className="text-base font-medium">직접 등록한 화장품</h2></div><p className="mt-3 text-xs leading-5 text-muted">이름·브랜드·제품 유형은 사용자가 입력한 내용이에요. 확인된 카탈로그 정보가 없어 성분, 효능, 사용법 같은 제품 사실은 표시하지 않아요.</p></section>

      <dl className="mt-6 divide-y divide-line border-y border-line"><div className="grid grid-cols-[92px_1fr] gap-3 py-4"><dt className="text-xs text-muted">브랜드</dt><dd className="text-sm font-medium">{brand}</dd></div><div className="grid grid-cols-[92px_1fr] gap-3 py-4"><dt className="text-xs text-muted">제품 유형</dt><dd className="text-sm font-medium">{category}</dd></div><div className="grid grid-cols-[92px_1fr] gap-3 py-4"><dt className="text-xs text-muted">등록일</dt><dd className="text-sm font-medium">{formatProductDate(data.addedAt)}</dd></div></dl>
    </div>
    <StickyActionBar className="px-4 pb-4 pt-3"><div className="grid grid-cols-2 gap-2.5"><Button variant="secondary" className="rounded-full border-0 bg-[#edf3ff]" onClick={() => navigate('/routine/edit')}>{data.inCurrentRoutine ? '루틴 확인' : '루틴에 넣기'}</Button><Button className="rounded-full bg-black" onClick={askAi}>AI에게 묻기</Button></div></StickyActionBar>
  </Screen>
}

function safeReturnTo(value: string | null) {
  return value === '/routine/edit' ? value : undefined
}

function explorePath(returnTo?: string) {
  return returnTo ? `/explore?returnTo=${encodeURIComponent(returnTo)}` : '/explore'
}

function productPath(productId: number, returnTo?: string) {
  return returnTo ? `/products/${productId}?returnTo=${encodeURIComponent(returnTo)}` : `/products/${productId}`
}

function ProductHero({ product }: { product: Product }) {
  const meta = [product.volume, product.versionLabel ? `${product.versionLabel} 버전` : undefined].filter(Boolean)
  return <section>
    <div className="relative mx-[18px] flex h-[208px] items-center justify-center overflow-hidden rounded-[20px] border border-[#cfe0ff] bg-[#fbfcff]">
      {product.imageUrl ? <><img src={product.imageUrl} alt="" className="absolute left-[116px] top-[30px] h-[122px] w-auto object-contain opacity-90"/><img src={product.imageUrl} alt={`${product.brand} ${product.name}`} className="relative ml-12 h-[180px] w-auto object-contain"/></> : <ProductGlyph category={product.category} size="lg"/>}
    </div>
    <div className="px-[30px] pb-6 pt-5">
      <div className="text-xs text-[#777]"><span>{product.brand} {product.category}</span></div>
      <h1 className="mt-2 text-3xl font-medium leading-[1.18] tracking-[-.055em]">{product.name}</h1>
      {(meta.length > 0 || product.verified) && <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-black">{meta.map(item => <span key={item}>{item}</span>)}{product.verified && <span className="sr-only">제품 버전 확인됨</span>}</div>}
    </div>
  </section>
}

function GuideSummary({ guide, productName }: { guide: ProductGuide; productName: string }) {
  const aiGenerated = guide.origin === 'AI_GENERATED'
  const summary = withoutRepeatedProductName(guide.summary, productName)
  return <section aria-labelledby="guide-summary-title" className="rounded-[20px] border border-[#cfe0ff] px-4 py-4">
    <div className="flex items-center gap-1.5 text-sm font-medium text-black"><Sparkles size={18} className="text-[#9ec1ff]"/><span>{aiGenerated ? 'SKN AI 제품 요약' : 'SKN 제품 요약'}</span></div>
    <h2 id="guide-summary-title" className="sr-only">이 제품이 무엇인지</h2>
    <p className="mt-3 pl-2 text-sm leading-6 tracking-[-.02em]">・ {summary}</p>
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
    <h2 id="product-overview-title" className="text-lg font-semibold tracking-[-.03em]">기본 정보</h2>
    <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-[20px] border border-line bg-[#fafbf8]">
      {items.map(({ label, value }, index) => <div key={label} className={`min-w-0 p-4 ${index % 2 === 0 ? 'border-r border-line' : ''} ${index < 2 && items.length > 2 ? 'border-b border-line' : ''}`}>
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="mt-1.5 text-sm font-medium leading-5 tracking-[-.02em]">{value}</dd>
      </div>)}
    </dl>
  </section>
}

function ProductFeatures({ highlights }: { highlights: ProductGuide['highlights'] }) {
  return <section aria-labelledby="product-features-title" className="border-t border-line py-7">
    <h2 id="product-features-title" className="text-lg font-semibold tracking-[-.03em]">제품 특징</h2>
    <div className="mt-4 divide-y divide-line rounded-[20px] border border-line bg-white px-4">
      {highlights.map((highlight, index) => <div key={`${highlight.title}-${index}`} className="grid grid-cols-[88px_1fr] gap-3 py-4">
        <p className="text-xs font-semibold leading-5 text-muted">{highlight.title}</p>
        <p className="text-sm font-medium leading-5 tracking-[-.01em]">{highlight.detail}</p>
      </div>)}
    </div>
  </section>
}

function UsageGuide({ guide }: { guide: ProductGuide }) {
  const timings = guide.usageTiming.filter(Boolean)
  const instructions = guide.usageInstructions.filter(Boolean)
  return <section aria-labelledby="usage-guide-title" className="border-t border-line py-7">
    <div className="flex items-center justify-between gap-3"><h2 id="usage-guide-title" className="text-lg font-semibold tracking-[-.03em]">사용 방법</h2>{timings.length > 0 && <div className="flex gap-1.5">{timings.map(timing => <span key={timing} className="rounded-full bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent">{timing}</span>)}</div>}</div>
    {instructions.length > 0 && <ol className="mt-5 space-y-4">{instructions.map((instruction, index) => <li key={`${instruction}-${index}`} className="flex gap-3.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">{index + 1}</span><p className="pt-0.5 text-sm leading-6">{instruction}</p></li>)}</ol>}
  </section>
}

function VerifiedFacts({ facts }: { facts: ProductFact[] }) {
  return <section aria-labelledby="verified-facts-title" className="border-t border-line py-7">
    <div className="flex items-center justify-between gap-4"><h2 id="verified-facts-title" className="text-lg font-semibold tracking-[-.03em]">출처에서 확인한 정보</h2><span className="inline-flex items-center gap-1 text-xs font-semibold text-[#52722d]"><BadgeCheck size={13}/>{facts.length}건</span></div>
    <div className="mt-4 divide-y divide-line border-y border-line">{facts.map((fact, index) => <article key={`${fact.type}-${fact.text}-${index}`} className="py-4">
      <p className="text-xs font-semibold text-[#66833e]">{factTypeLabel(fact.type)}</p><p className="mt-1.5 text-sm font-medium leading-5">{fact.text}</p>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-muted"><a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium underline decoration-line underline-offset-2"><span className="truncate">{fact.sourceLabel}</span><ExternalLink size={11} className="shrink-0"/></a><span className="shrink-0">{formatProductDate(fact.checkedAt)} 확인</span></div>
    </article>)}</div>
  </section>
}

function ProductAiAction({ product, onClick }: { product: Product; onClick: () => void }) {
  const hasRecords = product.personalRecordCount > 0
  return <button type="button" onClick={onClick} aria-labelledby="product-ai-title" className="flex w-full items-center gap-4 rounded-[22px] border border-[#dfe1ff] bg-[linear-gradient(135deg,#f1f2ff_0%,#fafaff_100%)] p-4 text-left transition active:scale-[.99]">
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_rgba(83,101,245,.22)]"><Sparkles size={19}/></span>
    <span className="min-w-0 flex-1"><span className="text-xs font-semibold text-accent">SKN AI</span><span id="product-ai-title" className="mt-1 block text-base font-semibold leading-5 tracking-[-.02em]">{hasRecords ? `내 경험 ${product.personalRecordCount}건과 비교하기` : '내 루틴에서 이 제품 물어보기'}</span><span className="mt-1 block text-xs leading-4 text-muted">제품 정보와 내 기록을 구분해서 답해요.</span></span>
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
  const [filter, setFilter] = useState<'ALL' | 'ROUTINE' | 'RECORDED' | 'UNUSED'>('ALL')
  const [addOpen, setAddOpen] = useState(false)
  const products = useQuery({ queryKey: ['user-products'], queryFn: api.userProducts })
  const current = useQuery({ queryKey: ['current-routine'], queryFn: api.currentRoutine, retry: false })
  const home = useQuery({ queryKey: ['home'], queryFn: api.home })
  const currentRoutineCount = products.data?.filter(item => item.inCurrentRoutine).length || 0
  const recordedCount = products.data?.filter(item => item.personalRecordCount > 0).length || 0
  const unusedCount = products.data?.filter(item => !item.inCurrentRoutine && item.personalRecordCount === 0).length || 0
  const currentError = current.error instanceof ApiError && current.error.status === 404 ? null : current.error
  if (products.isPending || current.isPending || home.isPending) return <Screen><CatalogHeader/><Loading label="My Lab을 정리하는 중"/></Screen>
  if (products.isError || currentError || home.error) return <Screen><CatalogHeader/><ErrorState message={(products.error || currentError || home.error)?.message || 'My Lab을 불러오지 못했어요.'} onRetry={() => { products.refetch(); current.refetch(); home.refetch() }}/></Screen>
  const routineProducts = products.data.filter(item => item.inCurrentRoutine)
  const recordedProducts = products.data.filter(item => !item.inCurrentRoutine && item.personalRecordCount > 0)
  const unusedProducts = products.data.filter(item => !item.inCurrentRoutine && item.personalRecordCount === 0)
  const groups = filter === 'ALL'
    ? [
        { key: 'ROUTINE', title: '현재 루틴에서 쓰는 중', description: '실제 사용 조합에 들어 있는 화장품', items: routineProducts },
        { key: 'RECORDED', title: '경험이 연결된 화장품', description: '지난 기록을 다시 비교할 수 있는 제품', items: recordedProducts },
        { key: 'UNUSED', title: '아직 사용 전', description: '루틴에 넣기 전 보관 중인 화장품', items: unusedProducts },
      ].filter(group => group.items.length > 0)
    : [{
        key: filter,
        title: filter === 'ROUTINE' ? '현재 루틴에서 쓰는 중' : filter === 'RECORDED' ? '경험이 연결된 화장품' : '아직 사용 전',
        description: filter === 'ROUTINE' ? '실제 사용 조합에 들어 있는 화장품' : filter === 'RECORDED' ? '하나 이상의 경험 기록이 연결된 제품' : '루틴에 넣기 전 보관 중인 화장품',
        items: filter === 'ROUTINE' ? routineProducts : filter === 'RECORDED' ? products.data.filter(item => item.personalRecordCount > 0) : unusedProducts,
      }]
  const openRecommendationChat = () => {
    setAddOpen(false)
    navigate(startChatPath('RECOMMEND', '내가 좋아했던 사용감과 아쉬웠던 경험을 바탕으로 다음에 탐색할 제품 후보를 찾아줘.'))
  }
  const openProductSearch = () => {
    setAddOpen(false)
    navigate('/explore')
  }
  const shelfContent = products.data.length
    ? groups[0]?.items.length
      ? <div className="mt-9 space-y-10">{groups.map(group => <section key={group.key} aria-labelledby={`shelf-group-${group.key}`}><div className="mb-4"><h2 id={`shelf-group-${group.key}`} className="text-lg font-medium">{group.title}</h2><p className="mt-1 text-xs text-muted">{group.description}</p></div><div className="grid grid-cols-2 gap-3">{group.items.map(item => <ShelfCard key={item.id} item={item} onStart={() => { if (item.product) navigate(`/products/${item.product.id}`); else navigate(`/my-products/${item.id}`) }}/>)}</div></section>)}</div>
      : <ShelfEmpty filter={filter} onAdd={() => setAddOpen(true)}/>
    : <ShelfEmpty filter="ALL" onAdd={() => setAddOpen(true)}/>
  return <>
    <Screen className="bg-white">
    <CatalogHeader/>
    <div className="px-5 pb-8"><PageHeading title="내가 가진 화장품" description="보유 제품을 실제 사용 맥락과 경험에 따라 나눠서 봐요."/>
      {!!products.data.length && <section className="relative mt-7 overflow-hidden rounded-[28px] bg-black p-5 text-white shadow-[0_14px_38px_rgba(0,0,0,.16)]" aria-label={`내 화장품 ${products.data.length}개`}><div aria-hidden className="absolute -right-10 -top-14 size-44 rounded-full border border-white/15 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,.42),rgba(151,184,235,.13)_42%,transparent_70%)]"/><p className="relative text-xs font-medium text-white/50">MY COLLECTION</p><p className="relative mt-3 text-[28px] font-medium tracking-[-.04em]">{products.data.length}개의 화장품</p><div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-white/15 pt-4 text-center"><div><p className="text-lg font-medium">{currentRoutineCount}</p><p className="mt-1 text-xs text-white/45">루틴 사용</p></div><div><p className="text-lg font-medium">{recordedCount}</p><p className="mt-1 text-xs text-white/45">기록 연결</p></div><div><p className="text-lg font-medium">{unusedCount}</p><p className="mt-1 text-xs text-white/45">사용 전</p></div></div></section>}
      {!!products.data.length && <div className="hide-scrollbar -mx-5 mt-7 flex gap-2 overflow-x-auto px-5 pb-1">{([['ALL',`전체 ${products.data.length}`],['ROUTINE',`루틴 ${currentRoutineCount}`],['RECORDED',`기록 있음 ${recordedCount}`],['UNUSED',`사용 전 ${unusedCount}`]] as const).map(([value,label]) => <button type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)} className={`min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition ${filter === value ? 'bg-black text-white shadow-[0_6px_16px_rgba(0,0,0,.12)]' : 'bg-[#f2f4f7] text-black/55 hover:bg-[#e7ebf1]'}`}>{label}</button>)}</div>}
      {shelfContent}
      <LabContext experience={home.data.currentExperience} current={current.data} productCount={products.data.length}/>
    </div>
    <FloatingAddButton label="화장품 추가" onClick={() => setAddOpen(true)}/>
    </Screen>
    <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="새 화장품, 어떻게 찾을까요?">
      <p className="-mt-1 text-sm leading-6 text-[#747b86]">내가 남긴 경험에서 추천받거나, 원하는 제품을 직접 찾아보세요.</p>
      <div className="mt-5 space-y-3">
        <button type="button" onClick={openRecommendationChat} className="group relative flex min-h-[118px] w-full items-center gap-4 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#eaf1ff_0%,#f6f3ff_58%,#fff_100%)] px-5 text-left shadow-[inset_0_0_0_1px_rgba(90,119,170,.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(62,82,120,.12)] active:translate-y-0 active:scale-[.99]">
          <span aria-hidden className="absolute -right-7 -top-10 size-32 rounded-full border border-white/80 bg-white/30"/>
          <span className="relative grid size-12 shrink-0 place-items-center rounded-[17px] bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,.18)]"><Sparkles size={21}/></span>
          <span className="relative min-w-0 flex-1"><strong className="block text-[17px] font-semibold tracking-[-.025em]">AI에게 추천받기</strong><span className="mt-1.5 block text-xs leading-5 text-[#697387]">내 루틴과 경험을 근거로<br/>다음 탐색 후보를 함께 찾아요.</span></span>
          <ChevronRight size={20} className="relative shrink-0 text-[#7b8493] transition group-hover:translate-x-0.5"/>
        </button>
        <button type="button" onClick={openProductSearch} className="group flex min-h-[104px] w-full items-center gap-4 rounded-[24px] border border-black/[.065] bg-[#fafafa] px-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:bg-white hover:shadow-[0_10px_25px_rgba(0,0,0,.07)] active:translate-y-0 active:scale-[.99]">
          <span className="grid size-12 shrink-0 place-items-center rounded-[17px] bg-white text-black shadow-[0_6px_18px_rgba(0,0,0,.08)]"><Search size={21}/></span>
          <span className="min-w-0 flex-1"><strong className="block text-[17px] font-semibold tracking-[-.025em]">직접 검색하기</strong><span className="mt-1.5 block text-xs leading-5 text-[#747b86]">브랜드나 제품명으로 정확히 찾아요.</span></span>
          <ChevronRight size={20} className="shrink-0 text-[#9298a1] transition group-hover:translate-x-0.5"/>
        </button>
      </div>
      <p className="px-2 pb-1 pt-4 text-center text-[11px] leading-5 text-[#9298a1]">어떤 방법을 골라도 담기 전까지 현재 루틴은 바뀌지 않아요.</p>
    </BottomSheet>
  </>
}

function LabContext({ experience, current, productCount }: { experience?: Experience | null; current?: Routine; productCount: number }) {
  return <section className="mt-8 border-t border-line pt-6" aria-labelledby="lab-context-title">
    <div className="flex items-center justify-between"><div><p className="text-xs font-medium tracking-[.08em] text-muted">USE CONTEXT</p><h2 id="lab-context-title" className="mt-1 text-base font-medium">지금의 사용 맥락</h2></div><Link to="/experience" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted transition hover:bg-soft">전체 흐름 <ChevronRight size={14}/></Link></div>
    <div className="mt-3 overflow-hidden rounded-[18px] border border-line bg-white">
      <Link to={experience ? `/experiences/${experience.id}` : productCount ? '/routine/edit' : '/explore'} className="interactive-card flex min-h-[72px] items-center gap-3 border-b border-line px-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#edf3ff] text-[#5f7396]"><FlaskConical size={16}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-[#5f7396]">{experience ? `확인 중 · DAY ${experience.day}` : '확인 중인 경험 없음'}</span><strong className="mt-1 block truncate text-sm font-medium">{experience?.title || '새 경험을 시작해보세요'}</strong></span><ChevronRight size={16} className="shrink-0 text-muted"/></Link>
      <Link to={current ? `/routines/${current.id}` : '/routine/edit'} className="interactive-card flex min-h-[72px] items-center gap-3 px-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f1f5ed] text-[#657253]"><Clock3 size={16}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium text-[#657253]">{current ? `현재 루틴 · ${current.items.length}개 제품` : '현재 루틴 없음'}</span><strong className="mt-1 block truncate text-sm font-medium">{current?.name || '사용 루틴을 만들어보세요'}</strong></span><ChevronRight size={16} className="shrink-0 text-muted"/></Link>
    </div>
  </section>
}

function ShelfCard({ item, onStart }: { item: UserProduct; onStart: () => void }) {
  const product = item.product
  const name = product?.name || item.customName || '이름 없는 제품'
  const status = item.inCurrentRoutine ? '현재 루틴' : item.personalRecordCount > 0 ? `연결된 경험 ${item.personalRecordCount}건` : '아직 안 써봄'
  const category = product?.category || item.customCategory || '기타'
  const tone = /세럼|앰플/.test(category) ? 'from-[#edf3ff] to-[#f8fbff]' : /크림|로션/.test(category) ? 'from-[#f3f6ec] to-[#fbfcf8]' : /클렌/.test(category) ? 'from-[#eef8f8] to-[#f9fcfc]' : 'from-[#f5f1fb] to-[#fcfaff]'
  return <button type="button" onClick={onStart} aria-label={`${name} 상세 보기`} className="group flex min-h-[242px] w-full flex-col overflow-hidden rounded-[24px] border border-black/[.055] bg-white text-left shadow-[0_6px_22px_rgba(45,58,77,.055)] transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(45,58,77,.12)] active:scale-[.99]">
    <span className={`relative grid h-[148px] place-items-center overflow-hidden bg-gradient-to-br ${tone}`}><span aria-hidden className="absolute size-28 rounded-full border border-white/70 bg-white/34"/>{product?.imageUrl ? <img src={product.imageUrl} alt="" className="relative h-[136px] w-full object-contain p-2 transition duration-300 group-hover:scale-105"/> : <ProductGlyph category={category} size="md"/>}<span className="absolute left-3 top-3 rounded-full bg-white/76 px-2.5 py-1 text-[11px] font-medium text-black/55 backdrop-blur">{status}</span></span>
    <span className="flex min-h-[94px] flex-col p-3.5"><span className="truncate text-xs text-black/42">{product?.brand || item.customBrand || '브랜드 미입력'} · {category}</span><strong className="mt-1.5 line-clamp-2 text-[15px] font-medium leading-5 tracking-[-.02em]">{name}</strong><span className="mt-auto flex items-center justify-end pt-2 text-black/45"><ArrowRight className="transition group-hover:translate-x-0.5" size={15}/></span></span>
  </button>
}

function ShelfEmpty({ filter, onAdd }: { filter: 'ALL' | 'ROUTINE' | 'RECORDED' | 'UNUSED'; onAdd: () => void }) {
  const title = filter === 'ROUTINE' ? '현재 루틴에 제품이 없어요' : filter === 'RECORDED' ? '연결된 경험이 아직 없어요' : filter === 'UNUSED' ? '아직 사용 전인 제품이 없어요' : '첫 화장품을 담아볼까요?'
  const body = filter === 'ROUTINE' ? '루틴 편집에서 실제 사용하는 제품을 골라보세요.' : filter === 'RECORDED' ? '제품을 실제로 사용하고 느낌을 남기면 이곳에 모여요.' : filter === 'UNUSED' ? '새로 추가한 제품은 현재 루틴에\n넣기 전까지 여기에 보여요.' : '제품 하나를 담으면 사용 맥락과 경험을\n연결하는 My Lab이 시작돼요.'
  return <div className="relative mt-8 px-1 pb-5 text-center"><div aria-hidden className="absolute inset-x-5 bottom-0 top-5 rounded-[24px] bg-[#e7effc]"/><div className="relative overflow-hidden rounded-[24px] border border-[#d9e6ff] bg-[#f7faff] px-5 pb-6 pt-8 shadow-[0_9px_28px_rgba(37,55,92,.08)]"><button type="button" onClick={onAdd} aria-label="탐색에서 화장품 추가하기" className="relative mx-auto block rounded-full"><img src="/skn-assets/ai-drop.png" alt="" className="size-[150px] object-contain"/><span aria-hidden className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-2xl shadow-[0_7px_22px_rgba(37,55,92,.14)]">+</span></button><h2 className="mt-3 text-2xl font-medium tracking-[-.035em]">{title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#737880]">{body}</p><Button onClick={onAdd} className="mt-6 w-full">화장품 추가하기</Button></div></div>
}

function CatalogHeader({ onBack, onAdd }: { onBack?: () => void; onAdd?: () => void }) {
  return <AppHeader back={Boolean(onBack)} onBack={onBack} profile={!onBack && !onAdd} notifications={!onBack && !onAdd} sticky right={onAdd ? <button type="button" onClick={onAdd} aria-label="화장품 추가" className="grid size-11 place-items-center rounded-full border border-line bg-white transition hover:bg-soft active:scale-95"><Plus size={21}/></button> : undefined}/>
}
