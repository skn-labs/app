import { useDeferredValue, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, Check, ExternalLink, FlaskConical, Plus, Search, SlidersHorizontal, X, ZoomIn } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { startChatPath } from '../lib/chat'
import type { Product, ProductAchievement, ProductFact, ProductGuide, UserProduct } from '../lib/types'
import { ActionIcon } from '../components/ActionIcon'
import { BrandIdentity } from '../components/BrandIdentity'
import { AppHeader, AssetMotion, BottomSheet, Button, ErrorState, FloatingAddButton, Loading, PageHeading, ProductGlyph, Screen, Skeleton, StaticProductImage, StickyActionBar, TopBar } from '../components/ui'
import { ProductAddSheet } from '../components/ProductAddSheet'

const PRODUCT_CATEGORIES = [
  { label: '클렌징', icon: 'cleanser', tone: 'bg-[#edf7f5]' },
  { label: '토너', icon: 'toner', tone: 'bg-[#eef4fb]' },
  { label: '세럼', icon: 'serum', tone: 'bg-[#eef2fb]' },
  { label: '앰플', icon: 'ampoule', tone: 'bg-[#f3eff9]' },
  { label: '크림', icon: 'cream', tone: 'bg-[#f2f5ec]' },
  { label: '선케어', icon: 'suncare', tone: 'bg-[#fff5df]' },
] as const
const CATEGORY_SYNONYM_ICON: Record<string, string> = {
  '선크림': 'suncare', '선블록': 'suncare', '자외선': 'suncare',
  '에센스': 'serum', '클렌저': 'cleanser', '폼클': 'cleanser', '스킨': 'toner',
}
// 분류가 확실할 때만 카테고리 아이콘 정보를 돌려주고, 애매하면 undefined(아이콘 미표기)
function categoryMeta(category?: string) {
  if (!category) return undefined
  const value = category.trim()
  const direct = PRODUCT_CATEGORIES.find(entry => value === entry.label || value.includes(entry.label))
  if (direct) return direct
  const synIcon = Object.entries(CATEGORY_SYNONYM_ICON).find(([key]) => value.includes(key))?.[1]
  return synIcon ? PRODUCT_CATEGORIES.find(entry => entry.icon === synIcon) : undefined
}

export function ExplorePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customBrand, setCustomBrand] = useState('')
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const catalogQuery = deferredQuery || selectedCategory
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const products = useInfiniteQuery({
    queryKey: ['product-pages', catalogQuery],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.products(catalogQuery, pageParam, 24),
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
      navigate(returnTo || `/my-products/${item.id}`)
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
  const searching = query.trim() !== deferredQuery
  const categoryOptions = PRODUCT_CATEGORIES.map(category => category.label)
  const selectedCategoryOption = PRODUCT_CATEGORIES.find(category => category.label === selectedCategory)
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

  return <>
    <Screen nav={false} className="bg-white [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
      <AppHeader back onBack={() => navigate(-1)} profile={false} sticky right={<Link to="/my-products" className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-[#667085] transition hover:bg-soft">My</Link>}/>
      <div className="px-5 pb-8 pt-3">
        <PageHeading title="화장품 찾기" description="브랜드나 제품명을 검색해 내 화장품에 담아보세요."/>

        <div className="sticky top-[calc(44px+var(--skn-safe-area-top))] z-10 -mx-5 mt-6 bg-white/96 px-5 pb-4 pt-2 backdrop-blur-xl">
          <div className="flex gap-2.5">
            <label className="flex h-[56px] min-w-0 flex-1 items-center gap-3 rounded-full bg-[#f1f3f5] pl-5 pr-2 transition-[background-color,box-shadow] focus-within:bg-white focus-within:shadow-[inset_0_0_0_1.5px_#222936,0_6px_20px_rgba(35,41,54,.08)]">
              <Search size={19} strokeWidth={2.1} className="shrink-0 text-[#596575]"/>
              <input value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim()) setSelectedCategory('') }} onKeyDown={event => { if (event.key === 'Escape') setQuery('') }} aria-label="제품 검색" enterKeyHint="search" autoComplete="off" placeholder="브랜드·제품명" className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-[-.02em] text-[#20252d] outline-none placeholder:font-normal placeholder:text-[#9199a3]"/>
              {searching && <span aria-label="검색 중" className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#d6dbe1] border-t-[#4f5b6b]"/>}
              {query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="grid size-10 shrink-0 place-items-center rounded-full text-[#7c858f] transition hover:bg-[#edf0f3] active:scale-95"><X size={17}/></button>}
            </label>
            <button type="button" aria-label={selectedCategoryOption ? `제품 유형: ${selectedCategoryOption.label}, 적용됨` : '제품 유형 선택'} aria-haspopup="dialog" aria-expanded={categoryOpen} onClick={() => setCategoryOpen(true)} className={`relative grid size-[56px] shrink-0 place-items-center rounded-full text-[#343b46] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[.95] ${selectedCategoryOption ? `${selectedCategoryOption.tone} border-2 border-[#172033] shadow-[0_0_0_3px_#fff,0_0_0_4px_rgba(23,32,51,.22),0_9px_22px_rgba(32,39,51,.16)]` : 'border border-[#dde1e6] bg-white shadow-[0_5px_16px_rgba(28,36,48,.06)]'}`}>{selectedCategoryOption ? <><ProductCategoryIcon icon={selectedCategoryOption.icon} className="size-9"/><span aria-hidden className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full border-2 border-white bg-[#172033] text-white shadow-sm"><Check size={11} strokeWidth={3}/></span></> : <SlidersHorizontal size={19} strokeWidth={2}/>}</button>
          </div>
        </div>

        {products.isPending
          ? <CatalogGridSkeleton/>
          : products.isError && !productItems.length
            ? <ErrorState message={products.error.message} onRetry={() => products.refetch()}/>
            : productItems.length
              ? <><div className="grid grid-cols-2 gap-x-3 gap-y-4 [touch-action:pan-y]">{productItems.map(product => <CatalogProductCard key={product.id} product={product} returnTo={returnTo}/>)}</div><div ref={loadMoreRef} className="min-h-24 pb-4 pt-3" aria-live="polite">{isFetchingNextPage ? <CatalogGridSkeleton count={2}/> : products.isFetchNextPageError ? <div className="grid min-h-20 place-items-center"><button type="button" onClick={() => fetchNextPage()} className="rounded-full border border-line bg-white px-4 py-2 text-xs font-medium">다시 불러오기</button></div> : !hasNextPage ? <p className="pt-8 text-center text-xs text-muted">{catalogQuery ? '검색된 제품을 모두 봤어요.' : '모든 제품을 봤어요.'}</p> : null}</div></>
              : <div className="rounded-[24px] border border-[#e1e6ed] bg-[#f7f9fc] px-5 py-9 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[#7084a3] shadow-[0_5px_16px_rgba(45,61,87,.08)]"><Search size={19}/></span><h2 className="mt-4 text-xl font-semibold tracking-[-.03em]">검색 결과가 없어요</h2><p className="mt-2 text-sm leading-6 text-muted">목록에 없는 제품이라면<br/>확인한 이름으로 직접 등록할 수 있어요.</p><Button onClick={openCustomProduct} className="mt-6 w-full">{query.trim() ? '이 이름으로 직접 등록' : '제품 직접 등록하기'}</Button></div>}
        {!products.isPending && !products.isError && productItems.length > 0 && <button type="button" onClick={openCustomProduct} className="mb-5 mt-3 flex min-h-[68px] w-full items-center justify-between rounded-[18px] border border-dashed border-[#c7d3e4] bg-[#fafbfc] px-4 text-left transition hover:border-[#91a6c5] active:scale-[.99]"><span><span className="block text-[13px] font-semibold tracking-[-.02em]">찾는 제품이 목록에 없나요?</span><span className="mt-1 block text-[10px] text-[#818995]">이름과 유형만 확인해 직접 등록할 수 있어요.</span></span><span className="grid size-9 place-items-center rounded-full bg-white text-[#607493] shadow-[inset_0_0_0_1px_rgba(218,225,235,.9)]"><Plus size={17}/></span></button>}
      </div>
    </Screen>
    <BottomSheet open={categoryOpen} onClose={() => setCategoryOpen(false)} title="어떤 제품을 찾으세요?">
      <p className="-mt-1 text-sm leading-6 text-[#767e89]">유형을 고르면 해당 제품만 바로 보여드려요.</p>
      <button type="button" aria-pressed={!selectedCategory && !query.trim()} onClick={() => { setQuery(''); setSelectedCategory(''); setCategoryOpen(false) }} className={`mt-5 flex min-h-[72px] w-full items-center gap-3 rounded-[22px] border px-5 text-left transition active:scale-[.985] ${!selectedCategory && !query.trim() ? 'border-[#202733] bg-[#f8f9fb] shadow-[0_7px_20px_rgba(32,39,51,.08)]' : 'border-[#e3e7ec] bg-white hover:border-[#cbd2db]'}`}>
        <span className="min-w-0 flex-1"><strong className="block text-[15px] font-semibold tracking-[-.025em] text-[#202733]">전체 제품</strong><span className="mt-0.5 block text-[11px] text-[#858e9a]">모든 유형 둘러보기</span></span>
        {!selectedCategory && !query.trim() && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#172033] text-white"><Check size={14} strokeWidth={2.6}/></span>}
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2.5 pb-2">{PRODUCT_CATEGORIES.map(category => {
        const selected = selectedCategory === category.label && !query.trim()
        return <button type="button" key={category.label} aria-pressed={selected} onClick={() => { setQuery(''); setSelectedCategory(category.label); setCategoryOpen(false) }} className={`relative flex min-h-[112px] min-w-0 flex-col items-center justify-center rounded-[22px] border px-2 py-3 text-center transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[.98] ${selected ? 'border-[#202733] bg-white shadow-[0_9px_22px_rgba(32,39,51,.11)]' : 'border-[#e5e8ec] bg-[#fafbfc] hover:border-[#cbd2db] hover:bg-white'}`}>
          {selected && <span className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-[#172033] text-white"><Check size={12} strokeWidth={2.8}/></span>}
          <span className={`grid size-12 place-items-center rounded-[17px] ${category.tone}`}><ProductCategoryIcon icon={category.icon} className="size-10"/></span>
          <span className="mt-2.5 text-[13px] font-semibold tracking-[-.025em] text-[#303743]">{category.label}</span>
        </button>
      })}</div>
    </BottomSheet>
  </>
}

function ProductCategoryIcon({ icon, className = '' }: { icon: string; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 48 48"><use href={`/skn-assets/product-category-icons.svg#${icon}`}/></svg>
}

function CatalogProductCard({ product, returnTo }: { product: Product; returnTo?: string }) {
  const details = [product.category, product.volume].filter(Boolean).join(' · ')
  return <Link to={productPath(product.id, returnTo)} draggable={false} aria-label={`${product.brand} ${product.name} 상세 보기`} className="group block min-w-0 select-none rounded-[26px] outline-none transition [touch-action:pan-y] [-webkit-user-drag:none] active:scale-[.985] focus-visible:ring-2 focus-visible:ring-[#202733] focus-visible:ring-offset-4">
    <span className="pointer-events-none relative grid h-[184px] place-items-center overflow-hidden rounded-[26px] border border-black/[.035] bg-[linear-gradient(145deg,#f7f7f4_0%,#efefec_62%,#e9eae7_100%)] shadow-[0_1px_0_rgba(255,255,255,.85)_inset] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_35px_rgba(29,35,44,.11)]">
      <span aria-hidden className="absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-full bg-white/60 blur-2xl"/>
      <span className="relative transition duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]"><CatalogProductVisual product={product}/></span>
      {product.personalRecordCount > 0 ? <span className="absolute left-3 top-3 rounded-full border border-black/[.045] bg-white/90 px-2.5 py-1.5 text-[9px] font-semibold tracking-[-.01em] text-[#354052] shadow-[0_4px_12px_rgba(25,31,40,.06)] backdrop-blur-md">내 기록 {product.personalRecordCount}</span> : product.owned ? <span className="absolute left-3 top-3 rounded-full border border-black/[.045] bg-white/90 px-2.5 py-1.5 text-[9px] font-semibold tracking-[.04em] text-[#434b56] shadow-[0_4px_12px_rgba(25,31,40,.06)] backdrop-blur-md">MY</span> : null}
    </span>
    <span className="pointer-events-none block px-1 pb-3 pt-3.5">
      <span className="flex min-w-0 items-center gap-1.5"><BrandIdentity name={product.brand} logoUrl={product.brandLogoUrl} size="xs" className="min-w-0" nameClassName="text-[9px] font-semibold uppercase tracking-[.055em] text-[#7d8591]"/>{product.verified && <BadgeCheck size={12} className="shrink-0 text-[#657d54]"/>}</span>
      <strong className="mt-1.5 block min-h-10 line-clamp-2 text-[14px] font-semibold leading-5 tracking-[-.03em] text-[#171b22]">{product.name}</strong>
      <span className="mt-1.5 block truncate text-[10px] font-medium tracking-[-.01em] text-[#969ba3]">{details}</span>
    </span>
  </Link>
}

function CatalogProductVisual({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const [portraitDetail, setPortraitDetail] = useState(false)
  if (product.imageUrl && !failed) return <StaticProductImage src={product.imageUrl} alt={`${product.brand} ${product.name}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={event => setPortraitDetail(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 2.2)} onError={() => setFailed(true)} className={`h-[148px] w-[128px] drop-shadow-[0_16px_15px_rgba(29,35,44,.14)] ${portraitDetail ? 'rounded-[14px] object-cover object-[center_17%]' : 'object-contain mix-blend-multiply'}`}/>
  return <ProductGlyph category={product.category} size="md"/>
}

function CatalogGridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-4" role="status" aria-label="제품 목록을 불러오는 중">{Array.from({ length: count }, (_, index) => <div key={index}><Skeleton className="h-[184px] rounded-[26px]"/><div className="space-y-2 px-1 py-3.5"><Skeleton className="h-2.5 w-16 rounded-full"/><Skeleton className="h-4 w-full rounded-full"/><Skeleton className="h-3 w-3/4 rounded-full"/></div></div>)}</div>
}

export function ProductPage() {
  const { id } = useParams()
  const productId = Number(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = safeReturnTo(searchParams.get('returnTo'))
  const queryClient = useQueryClient()
  const [added, setAdded] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
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
  if (product.isPending) return <Screen nav={false}><TopBar title="제품" back/><Loading variant="detail" label="제품 상세를 준비하는 중"/></Screen>
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
  return <Screen nav={false} className="bg-white pb-28">
    <CatalogHeader onBack={() => navigate(-1)} onBrowse={() => navigate(explorePath(returnTo))}/>
    <div>
      <ProductHero product={data} onOpenImage={() => setImageOpen(true)}/>
      <div className="px-5">
        {data.achievements?.length > 0 && <ProductAchievements achievements={data.achievements}/>}
        {guide?.summary?.trim() && <GuideSummary guide={guide} productName={data.name}/>}
        {overviewItems.length > 0 && <ProductOverview items={overviewItems}/>}
        {guide && guide.highlights && guide.highlights.length > 0 && <ProductFeatures highlights={guide.highlights}/>}
        {guide && hasUsage && <UsageGuide guide={guide}/>} 
        {data.facts.length > 0 && <VerifiedFacts facts={data.facts}/>}
        <div className="pb-3 pt-7"><ProductAiAction product={data} onClick={openProductChat}/></div>
      </div>
    </div>
    <ProductDetailActions
      adding={add.isPending}
      added={added}
      error={add.error?.message}
      primaryLabel={owned ? (returnTo ? '루틴 편집 계속' : '내 화장품 보기') : '내 화장품에 담기'}
      onPrimary={() => owned ? navigate(returnTo || '/my-products') : add.mutate()}
    />
    {imageOpen && data.imageUrl && <ProductImageViewer product={data} onClose={() => setImageOpen(false)}/>}
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
  if (item.isPending) return <Screen nav={false}><TopBar title="내 화장품" back/><Loading variant="detail" label="화장품을 불러오는 중"/></Screen>
  if (item.isError) return <Screen nav={false}><TopBar title="내 화장품" back/><ErrorState message={item.error.message} onRetry={() => item.refetch()}/></Screen>
  if (item.data.product) return <Screen nav={false}><TopBar title="내 화장품" back/><Loading variant="detail" label="제품 상세로 이동하는 중"/></Screen>

  const data = item.data
  const name = data.product?.name || data.customName || '이름 없는 제품'
  const brand = data.product?.brand || data.customBrand || '브랜드 미입력'
  const category = data.product?.category || data.customCategory || '제품 유형 미입력'
  const categoryIcon = categoryMeta(category)
  const askAi = () => navigate(startChatPath('GENERAL', `내가 직접 등록한 “${name}”을 언제 어떻게 사용했는지 정리해줘. 확인된 카탈로그 정보가 없으니 제품 사실을 추측하지 말고, 내가 남긴 기록과 현재 루틴만 구분해서 살펴봐줘.`))

  return <Screen nav={false} className="bg-white pb-28">
    <CatalogHeader onBack={() => navigate(-1)} onBrowse={() => navigate('/explore')}/>
    <div>
      <CustomProductHero item={data} name={name} brand={brand} category={category}/>
      <div className="px-5">
        <section className="rounded-[24px] bg-[#f5f6f3] px-5 py-4" aria-labelledby="custom-product-info">
          <div className="flex items-center gap-2"><FlaskConical size={16} className="text-[#687068]"/><h2 id="custom-product-info" className="text-[13px] font-semibold text-[#4d554d]">내가 직접 등록한 정보</h2></div>
          <p className="mt-2 text-[13px] leading-5 text-[#747a74]">확인된 카탈로그 정보가 없어 성분·효능·사용법은 추측해 보여주지 않아요.</p>
        </section>

        <section className="border-b border-[#eceee9] py-7" aria-labelledby="custom-use-status">
          <h2 id="custom-use-status" className="text-lg font-semibold tracking-[-.03em]">내 사용 상태</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[20px] bg-[#f4f6fb] p-4"><p className="text-[12px] font-medium text-[#7a8494]">현재 루틴</p><p className="mt-1.5 text-[15px] font-semibold tracking-[-.02em] text-[#202733]">{data.inCurrentRoutine ? '사용 중' : '포함되지 않음'}</p></div>
            <div className="rounded-[20px] bg-[#f4f6fb] p-4"><p className="text-[12px] font-medium text-[#7a8494]">남긴 사용</p><p className="mt-1.5 text-[15px] font-semibold tracking-[-.02em] text-[#202733]">{data.personalRecordCount}회</p></div>
          </div>
        </section>

        <section className="py-7" aria-labelledby="custom-details-title">
          <h2 id="custom-details-title" className="text-lg font-semibold tracking-[-.03em]">등록 정보</h2>
          <dl className="mt-3 divide-y divide-[#eceee9]">
            <div className="grid grid-cols-[92px_1fr] items-center gap-3 py-4"><dt className="text-[13px] text-muted">브랜드</dt><dd><BrandIdentity name={brand} logoUrl={data.brandLogoUrl} size="sm" nameClassName="font-semibold text-ink"/></dd></div>
            <div className="grid grid-cols-[92px_1fr] items-center gap-3 py-4"><dt className="text-[13px] text-muted">제품 유형</dt><dd className="flex items-center gap-2 text-sm font-semibold">{categoryIcon && <span className={`grid size-7 shrink-0 place-items-center rounded-[9px] ${categoryIcon.tone}`}><ProductCategoryIcon icon={categoryIcon.icon} className="size-5"/></span>}{category}</dd></div>
            <div className="grid grid-cols-[92px_1fr] gap-3 py-4"><dt className="text-[13px] text-muted">등록일</dt><dd className="text-sm font-semibold">{formatProductDate(data.addedAt)}</dd></div>
          </dl>
        </section>

        <CustomProductAiAction name={name} hasRecords={data.personalRecordCount > 0} onClick={askAi}/>
      </div>
    </div>
    <ProductDetailActions
      adding={false}
      added={false}
      primaryLabel={data.inCurrentRoutine ? '루틴에서 확인' : '루틴에 넣기'}
      onPrimary={() => navigate('/routine/edit')}
    />
  </Screen>
}

function safeReturnTo(value: string | null) {
  return value === '/routine/edit' || value === '/routine/new' ? value : undefined
}

function explorePath(returnTo?: string) {
  return returnTo ? `/explore?returnTo=${encodeURIComponent(returnTo)}` : '/explore'
}

function productPath(productId: number, returnTo?: string) {
  return returnTo ? `/products/${productId}?returnTo=${encodeURIComponent(returnTo)}` : `/products/${productId}`
}

function ProductHero({ product, onOpenImage }: { product: Product; onOpenImage: () => void }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [portraitDetail, setPortraitDetail] = useState(false)
  const meta = [product.volume, product.versionLabel ? `${product.versionLabel} 버전` : undefined].filter(Boolean)
  const hasImage = Boolean(product.imageUrl && !imageFailed)
  const heroCategory = categoryMeta(product.category)
  return <section className="pb-8">
    <div className="relative mx-5 flex h-[306px] items-center justify-center overflow-hidden rounded-[30px] border border-black/[.035] bg-[radial-gradient(circle_at_50%_42%,#ffffff_0%,#f4f4f0_54%,#eceee9_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">
      <span aria-hidden className="absolute -left-10 top-2 size-40 rounded-full bg-[#eaf1ff]/75 blur-3xl"/>
      <span aria-hidden className="absolute -bottom-16 -right-10 size-44 rounded-full bg-[#e5eadb]/75 blur-3xl"/>
      <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 py-1.5 pl-2.5 pr-3 text-[11px] font-semibold tracking-[-.01em] text-[#5d6672] shadow-[0_5px_14px_rgba(32,39,51,.06)] backdrop-blur-md">{heroCategory && <ProductCategoryIcon icon={heroCategory.icon} className="size-4"/>}{product.category}</span>
      {hasImage
        ? <button type="button" onClick={onOpenImage} aria-label={`${product.name} 이미지 크게 보기`} className="group relative grid h-full w-full place-items-center overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#5365f5]">
          <span aria-hidden className="absolute inset-x-14 bottom-7 h-10 rounded-full bg-[#303742]/15 blur-xl"/>
          <StaticProductImage src={product.imageUrl!} alt={`${product.brand} ${product.name}`} referrerPolicy="no-referrer" onLoad={event => setPortraitDetail(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 2.2)} onError={() => setImageFailed(true)} className={`relative h-[252px] w-[calc(100%-48px)] drop-shadow-[0_22px_18px_rgba(28,34,43,.16)] transition duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.025] ${portraitDetail ? 'rounded-[20px] object-cover object-[center_17%]' : 'object-contain mix-blend-multiply'}`}/>
          <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/82 px-3 py-2 text-[11px] font-semibold text-[#4f5865] shadow-[0_5px_15px_rgba(32,39,51,.08)] backdrop-blur-md"><ZoomIn size={14}/>크게 보기</span>
        </button>
        : <div className="relative flex flex-col items-center"><ProductGlyph category={product.category} size="lg"/><span className="mt-5 text-[12px] font-medium text-[#8a9089]">등록된 제품 이미지가 없어요</span></div>}
    </div>
    <div className="px-6 pt-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <BrandIdentity name={product.brand} logoUrl={product.brandLogoUrl} size="sm" nameClassName="font-semibold text-[#59616d]"/>
        {product.verified && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eef4e9] px-2.5 py-1.5 text-[11px] font-semibold text-[#566b49]"><BadgeCheck size={13}/>출처 확인</span>}
      </div>
      <h1 className="mt-3 break-keep text-[clamp(24px,6.7vw,27px)] font-[600] leading-[1.2] tracking-[-.045em] text-[#161a20] [text-wrap:balance]">{product.name}</h1>
      {meta.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#747b84]">{meta.map((item, index) => <span key={item} className="inline-flex items-center gap-2">{index > 0 && <span aria-hidden className="size-1 rounded-full bg-[#c8ccc7]"/>}{item}</span>)}</div>}
      {(product.owned || product.personalRecordCount > 0) && <div className="mt-4 flex flex-wrap gap-2">
        {product.owned && <span className="rounded-full bg-[#171b22] px-3 py-1.5 text-[11px] font-semibold text-white">내 화장품</span>}
        {product.personalRecordCount > 0 && <span className="rounded-full bg-[#eef2f8] px-3 py-1.5 text-[11px] font-semibold text-[#59687e]">{product.personalRecordCount}회 사용</span>}
      </div>}
    </div>
  </section>
}

function ProductAchievements({ achievements }: { achievements: ProductAchievement[] }) {
  const visibleAchievements = achievements.slice(0, 3)
  if (visibleAchievements.length === 0) return null
  return <section className="mb-5" aria-label="외부에서 확인된 성과">
    <div role="list" className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visibleAchievements.map((achievement, index) => {
        const period = achievement.periodLabel.replace(/\s*상반기$/, ' H1').replace(/\s*하반기$/, ' H2')
        const descriptionId = `product-achievement-${index}-${achievement.type}-${achievement.periodLabel.replace(/\s/g, '-')}`
        return <article key={`${achievement.title}-${achievement.detail}-${index}`} role="listitem" aria-describedby={descriptionId} className={`flex min-h-[68px] shrink-0 snap-start items-center rounded-[14px] border border-[#dfddd6] bg-[#faf9f6] px-3.5 py-2.5 ${visibleAchievements.length > 1 ? 'w-[calc(100%-32px)]' : 'w-full'}`}>
          <img src="/skn-assets/product-achievement.svg" alt="" className="size-8 shrink-0 opacity-80"/>
          <span aria-hidden className="mx-3 h-8 w-px shrink-0 bg-[#dedbd3]"/>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[14px] font-semibold leading-[18px] tracking-[-.025em] text-[#262722]">{achievement.title}</strong>
            <span className="mt-1 block truncate text-[9px] font-medium text-[#838178]">{achievement.sourceLabel}</span>
          </span>
          <span className="ml-3 shrink-0 self-start pt-0.5 text-[9px] font-semibold tracking-[.06em] text-[#78766f] tabular-nums">{period}</span>
          <span id={descriptionId} className="sr-only">{achievement.detail}. 외부 평가 이력이며 제품 효과나 개인 적합성 지표는 아닙니다.</span>
        </article>
      })}
    </div>
  </section>
}

function ProductImageViewer({ product, onClose }: { product: Product; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const [portraitDetail, setPortraitDetail] = useState(false)
  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true })
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return <section role="dialog" aria-modal="true" aria-labelledby="product-image-title" className="skn-fullscreen-overlay fixed inset-y-0 left-1/2 z-[80] flex w-full max-w-[430px] -translate-x-1/2 flex-col bg-[#f5f5f1]">
    <header className="safe-top flex min-h-[72px] items-center justify-between px-5">
      <div className="min-w-0"><p className="text-[11px] font-semibold text-[#858b84]">PRODUCT VIEW</p><h2 id="product-image-title" className="mt-0.5 max-w-[290px] truncate text-sm font-semibold">{product.name}</h2></div>
      <button ref={closeButton} type="button" onClick={onClose} aria-label="제품 이미지 닫기" className="grid size-11 shrink-0 place-items-center rounded-full border border-black/[.06] bg-white/90 text-[#343a43] shadow-[0_5px_18px_rgba(28,34,43,.08)] transition active:scale-95"><X size={20}/></button>
    </header>
    <div className={`relative min-h-0 flex-1 ${portraitDetail ? 'overflow-y-auto overscroll-contain px-5 pb-8' : 'grid place-items-center px-7 pb-9'}`}>
      {!portraitDetail && <span aria-hidden className="absolute inset-x-12 bottom-[19%] h-20 rounded-full bg-[#2f3540]/12 blur-3xl"/>}
      <StaticProductImage src={product.imageUrl!} alt={`${product.brand} ${product.name}`} referrerPolicy="no-referrer" onLoad={event => setPortraitDetail(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 2.2)} className={portraitDetail ? 'relative w-full rounded-[20px] bg-white object-contain shadow-[0_18px_38px_rgba(28,34,43,.12)]' : 'relative max-h-[72svh] w-full object-contain mix-blend-multiply drop-shadow-[0_28px_24px_rgba(28,34,43,.18)]'}/>
    </div>
  </section>
}

function CustomProductHero({ item, name, brand, category }: { item: UserProduct; name: string; brand: string; category: string }) {
  const heroCategory = categoryMeta(category)
  return <section className="pb-8">
    <div className="relative mx-5 grid h-[286px] place-items-center overflow-hidden rounded-[30px] border border-black/[.035] bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#f2f4ef_58%,#e9ece6_100%)]">
      <span aria-hidden className="absolute -left-8 top-1 size-36 rounded-full bg-[#eaf1ff]/80 blur-3xl"/>
      <span aria-hidden className="absolute -bottom-16 -right-9 size-44 rounded-full bg-[#e2ead7]/75 blur-3xl"/>
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/82 py-1.5 pl-2.5 pr-3 text-[11px] font-semibold text-[#5d6672] shadow-[0_5px_14px_rgba(32,39,51,.06)] backdrop-blur-md">{heroCategory && <ProductCategoryIcon icon={heroCategory.icon} className="size-4"/>}{category}</span>
      <div className="relative scale-[1.12]"><ProductGlyph category={category} size="lg"/></div>
    </div>
    <div className="px-6 pt-5">
      <BrandIdentity name={brand} logoUrl={item.brandLogoUrl} size="sm" nameClassName="font-semibold text-[#59616d]"/>
      <h1 className="mt-3 text-[30px] font-[600] leading-[1.16] tracking-[-.052em] text-[#161a20]">{name}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.inCurrentRoutine && <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4e8] py-1.5 pl-2 pr-3 text-[11px] font-semibold text-[#536849]"><img src="/skn-assets/routine-active.svg" alt="" className="size-4"/>현재 루틴</span>}
        <span className="rounded-full bg-[#eef2f8] px-3 py-1.5 text-[11px] font-semibold text-[#59687e]">{item.personalRecordCount > 0 ? `${item.personalRecordCount}회 사용` : '사용 전'}</span>
      </div>
    </div>
  </section>
}

function GuideSummary({ guide, productName }: { guide: ProductGuide; productName: string }) {
  const aiGenerated = guide.origin === 'AI_GENERATED'
  const summary = withoutRepeatedProductName(guide.summary, productName)
  return <section aria-labelledby="guide-summary-title" className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#f0f4ff_0%,#f8f9ff_58%,#f3f5fb_100%)] px-5 py-5">
    <span aria-hidden className="absolute -right-7 -top-10 size-28 rounded-full bg-[#dce6ff]/65 blur-2xl"/>
    <div className="relative flex items-center justify-between gap-3">
      <h2 id="guide-summary-title" className="text-[13px] font-semibold text-[#455676]">제품 한눈에 보기</h2>
      <span className="rounded-full border border-white/80 bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-[#71809b]">{aiGenerated ? 'SKN AI 안내' : 'SKN 안내'}</span>
    </div>
    <p className="relative mt-3 text-[15px] font-medium leading-[1.72] tracking-[-.02em] text-[#263248]">{summary}</p>
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
  return <section aria-labelledby="product-overview-title" className="border-b border-[#eceee9] py-7">
    <h2 id="product-overview-title" className="text-lg font-semibold tracking-[-.03em]">이 제품의 기본</h2>
    <dl className="mt-4 grid grid-cols-2 gap-2.5">
      {items.map(({ label, value }) => <div key={label} className="min-w-0 rounded-[20px] border border-[#ececec] bg-white p-4 shadow-[0_1px_3px_rgba(30,35,45,.03)]">
          <dt className="text-[12px] font-medium text-[#80867f]">{label}</dt>
          <dd className="mt-1.5 truncate text-[14px] font-semibold leading-5 tracking-[-.02em] text-[#252a31]">{value}</dd>
        </div>
      )}
    </dl>
  </section>
}

function ProductFeatures({ highlights }: { highlights: ProductGuide['highlights'] }) {
  return <section aria-labelledby="product-features-title" className="border-b border-[#eceee9] py-7">
    <h2 id="product-features-title" className="text-lg font-semibold tracking-[-.03em]">제품 특징</h2>
    <div className="mt-3 divide-y divide-[#eceee9]">
      {highlights.map((highlight, index) => <div key={`${highlight.title}-${index}`} className="grid grid-cols-[88px_1fr] gap-3 py-4">
        <p className="text-[12px] font-semibold leading-5 text-[#747b74]">{highlight.title}</p>
        <p className="text-[14px] font-medium leading-[1.6] tracking-[-.01em] text-[#2b3037]">{highlight.detail}</p>
      </div>)}
    </div>
  </section>
}

function UsageGuide({ guide }: { guide: ProductGuide }) {
  const timings = guide.usageTiming.filter(Boolean)
  const instructions = guide.usageInstructions.filter(Boolean)
  return <section aria-labelledby="usage-guide-title" className="border-b border-[#eceee9] py-7">
    <div className="flex items-start justify-between gap-3"><h2 id="usage-guide-title" className="text-lg font-semibold tracking-[-.03em]">사용 방법</h2>{timings.length > 0 && <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">{timings.map(timing => <span key={timing} className="rounded-full bg-[#eef1f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#60708a]">{timing}</span>)}</div>}</div>
    {instructions.length > 0 && <ol className="mt-5 space-y-3">{instructions.map((instruction, index) => <li key={`${instruction}-${index}`} className="relative flex gap-3.5 rounded-[18px] bg-[#f7f8f5] p-4"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#222831] text-[11px] font-semibold text-white">{index + 1}</span><p className="text-[14px] font-medium leading-6 text-[#343a42]">{instruction}</p></li>)}</ol>}
  </section>
}

function VerifiedFacts({ facts }: { facts: ProductFact[] }) {
  return <section aria-labelledby="verified-facts-title" className="border-b border-[#eceee9] py-7">
    <div className="flex items-center justify-between gap-4"><h2 id="verified-facts-title" className="text-lg font-semibold tracking-[-.03em]">출처에서 확인한 정보</h2><span className="inline-flex items-center gap-1 rounded-full bg-[#edf4e8] px-2.5 py-1.5 text-[11px] font-semibold text-[#566b49]"><BadgeCheck size={13}/>{facts.length}건</span></div>
    <div className="mt-4 space-y-2.5">{facts.map((fact, index) => <article key={`${fact.type}-${fact.text}-${index}`} className="rounded-[20px] border border-[#e2e8dc] bg-[#fafcf8] p-4">
      <p className="text-[11px] font-semibold text-[#668052]">{factTypeLabel(fact.type)}</p><p className="mt-1.5 text-[14px] font-medium leading-[1.6] text-[#2c3329]">{fact.text}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[#7a8275]"><a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-semibold underline decoration-[#ccd6c4] underline-offset-2"><span className="truncate">{fact.sourceLabel}</span><ExternalLink size={11} className="shrink-0"/></a><span className="shrink-0">{formatProductDate(fact.checkedAt)} 확인</span></div>
    </article>)}</div>
  </section>
}

function ProductAiAction({ product, onClick }: { product: Product; onClick: () => void }) {
  const hasRecords = product.personalRecordCount > 0
  return <button type="button" onClick={onClick} aria-labelledby="product-ai-title" className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#151a25_0%,#20283a_100%)] p-4.5 text-left text-white shadow-[0_14px_32px_rgba(24,31,45,.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(24,31,45,.2)] active:translate-y-0 active:scale-[.99]">
    <span aria-hidden className="absolute -right-7 -top-9 size-28 rounded-full bg-[#617cf4]/25 blur-2xl"/>
    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[17px] border border-white/15 bg-white/10"><AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" loop className="size-[62px] rounded-[17px]"/></span>
    <span className="relative min-w-0 flex-1"><span className="text-[11px] font-semibold text-[#aebdff]">SKN AI</span><span id="product-ai-title" className="mt-1 block text-[15px] font-semibold leading-5 tracking-[-.02em]">{hasRecords ? `내 사용 ${product.personalRecordCount}회와 비교하기` : '내 루틴에서 함께 살펴보기'}</span><span className="mt-1 block text-[11px] leading-4 text-white/60">제품 정보와 내 기록을 구분해서 답해요.</span></span>
    <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition group-hover:bg-white/15"><ArrowRight size={16}/></span>
  </button>
}

function CustomProductAiAction({ name, hasRecords, onClick }: { name: string; hasRecords: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#151a25_0%,#20283a_100%)] p-4.5 text-left text-white shadow-[0_14px_32px_rgba(24,31,45,.16)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[.99]">
    <span aria-hidden className="absolute -right-7 -top-9 size-28 rounded-full bg-[#617cf4]/25 blur-2xl"/>
    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[17px] border border-white/15 bg-white/10"><AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" loop className="size-[62px] rounded-[17px]"/></span>
    <span className="relative min-w-0 flex-1"><span className="text-[11px] font-semibold text-[#aebdff]">SKN AI</span><span className="mt-1 block text-[15px] font-semibold leading-5 tracking-[-.02em]">{hasRecords ? '내가 남긴 사용과 함께 보기' : `${name} 사용 정리 시작하기`}</span><span className="mt-1 block text-[11px] leading-4 text-white/60">카탈로그 사실을 추측하지 않고 내 정보만 살펴봐요.</span></span>
    <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition group-hover:bg-white/15"><ArrowRight size={16}/></span>
  </button>
}

function ProductDetailActions({ adding, added, error, primaryLabel, onPrimary }: {
  adding: boolean
  added: boolean
  error?: string
  primaryLabel: string
  onPrimary: () => void
}) {
  return <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] px-5 pb-2">
    {(added || error) && <p role={error ? 'alert' : 'status'} className={`pointer-events-auto mx-3 mb-2 rounded-full px-4 py-2 text-center text-[11px] font-semibold shadow-[0_7px_18px_rgba(28,34,43,.08)] ${error ? 'bg-[#fff1f1] text-danger' : 'bg-[#edf4e8] text-[#566b49]'}`}>{error || '내 화장품에 담았어요. 루틴은 그대로예요.'}</p>}
    <button type="button" disabled={adding} onClick={onPrimary} style={{ fontWeight: 600 }} className="pointer-events-auto flex h-[58px] w-full items-center justify-center rounded-[20px] bg-[#11151b] px-5 text-[14px] tracking-[-.025em] text-white shadow-[0_13px_30px_rgba(17,21,27,.24)] transition hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_16px_34px_rgba(17,21,27,.28)] active:translate-y-0 active:scale-[.985] disabled:cursor-not-allowed disabled:bg-[#9da09c] disabled:shadow-none">
      {adding ? '담는 중…' : primaryLabel}
    </button>
  </div>
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
  const currentRoutineCount = products.data?.filter(item => item.inCurrentRoutine).length || 0
  const recordedCount = products.data?.filter(item => item.personalRecordCount > 0).length || 0
  const unusedCount = products.data?.filter(item => !item.inCurrentRoutine && item.personalRecordCount === 0).length || 0
  if (products.isPending) return <Screen><CatalogHeader/><Loading variant="collection" label="화장품을 정리하는 중"/></Screen>
  if (products.isError) return <Screen><CatalogHeader/><ErrorState message={products.error.message || '화장품을 불러오지 못했어요.'} onRetry={() => products.refetch()}/></Screen>
  const visibleProducts = filter === 'ALL'
    ? products.data
    : filter === 'ROUTINE'
      ? products.data.filter(item => item.inCurrentRoutine)
      : filter === 'RECORDED'
        ? products.data.filter(item => item.personalRecordCount > 0)
        : products.data.filter(item => !item.inCurrentRoutine && item.personalRecordCount === 0)
  const filters = [
    { value: 'ALL' as const, label: '전체', count: products.data.length },
    { value: 'ROUTINE' as const, label: '현재 루틴', count: currentRoutineCount },
    { value: 'RECORDED' as const, label: '사용', count: recordedCount },
    { value: 'UNUSED' as const, label: '사용 전', count: unusedCount },
  ]
  const openRecommendationChat = () => {
    setAddOpen(false)
    navigate(startChatPath('RECOMMEND', '내가 좋아했던 사용감과 아쉬웠던 경험을 바탕으로 다음에 탐색할 제품 후보를 찾아줘.'))
  }
  const openProductSearch = () => {
    setAddOpen(false)
    navigate('/explore')
  }
  const shelfContent = products.data.length
    ? visibleProducts.length
      ? <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-5">{visibleProducts.map(item => <ShelfCard key={item.id} item={item} onStart={() => { if (item.product) navigate(`/products/${item.product.id}`); else navigate(`/my-products/${item.id}`) }}/>)}</div>
      : <ShelfEmpty filter={filter} onAdd={() => setAddOpen(true)}/>
    : <ShelfEmpty filter="ALL" onAdd={() => setAddOpen(true)}/>
  return <>
    <Screen className="bg-white">
    <CatalogHeader/>
    <div className="px-5 pb-8 pt-5">
      <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.15em] text-[#71809a]">PRODUCTS</p><h1 className="mt-1.5 text-[30px] font-semibold leading-[1.14] tracking-[-.045em] text-[#111722]">내 화장품</h1><p className="mt-2.5 max-w-[340px] text-[12px] font-medium leading-5 tracking-[-.012em] text-[#7a808a]">{products.data.length ? `담아둔 제품 ${products.data.length}개를 사용 여부와 기록에 따라 살펴보세요.` : '첫 제품을 담고, 루틴과 사용 기록을 이어가세요.'}</p></div>
      {!!products.data.length && <section className="mt-7" aria-label="화장품 필터">
        <div className="grid grid-cols-4 border-b border-[#e6e8ec]">
          {filters.map(option => {
            const selected = filter === option.value
            const disabled = option.value !== 'ALL' && option.count === 0
            return <button type="button" key={option.value} aria-pressed={selected} aria-label={`${option.label} ${option.count}개`} disabled={disabled} onClick={() => setFilter(option.value)} className={`relative flex min-h-[52px] min-w-0 items-center justify-center gap-1 px-1 pb-1 transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${selected ? 'text-black' : disabled ? 'cursor-not-allowed text-black/22' : 'text-black/48 hover:text-black/75 active:scale-[.98]'}`}><span className="whitespace-nowrap text-[11px] font-semibold tracking-[-.025em]">{option.label}</span><span className={`text-[10px] font-semibold tabular-nums ${selected ? 'text-black/48' : 'text-current'}`}>{option.count}</span>{selected && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-black"/>}</button>
          })}
        </div>
      </section>}
      {shelfContent}
    </div>
    <FloatingAddButton kind="product" label="화장품 추가" onClick={() => setAddOpen(true)}/>
    </Screen>
    <ProductAddSheet open={addOpen} onClose={() => setAddOpen(false)} onAi={openRecommendationChat} onSearch={openProductSearch}/>
  </>
}

function ShelfCard({ item, onStart }: { item: UserProduct; onStart: () => void }) {
  const product = item.product
  const name = product?.name || item.customName || '이름 없는 제품'
  const category = product?.category || item.customCategory || '기타'
  return <button type="button" onClick={onStart} aria-label={`${name} 상세 보기`} className="group block min-w-0 w-full rounded-[26px] text-left outline-none transition active:scale-[.985] focus-visible:ring-2 focus-visible:ring-[#202733] focus-visible:ring-offset-4">
    <span className="relative grid h-[184px] place-items-center overflow-hidden rounded-[26px] border border-black/[.035] bg-[linear-gradient(145deg,#f7f7f4_0%,#efefec_62%,#e9eae7_100%)] shadow-[0_1px_0_rgba(255,255,255,.85)_inset] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_35px_rgba(29,35,44,.11)]">
      <span aria-hidden className="absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-full bg-white/60 blur-2xl"/>
      <span className="relative transition duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]">{product ? <CatalogProductVisual product={product}/> : <ProductGlyph category={category} size="md"/>}</span>
      <span className="absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-1.5">
        {item.inCurrentRoutine && <span className="inline-flex items-center gap-1 rounded-full border border-[#b8cba9] bg-[linear-gradient(135deg,rgba(238,245,233,.96),rgba(250,252,248,.94))] py-1 pl-1.5 pr-2.5 text-[9px] font-semibold text-[#506747] shadow-[0_5px_14px_rgba(85,108,71,.12)] backdrop-blur-md"><img src="/skn-assets/routine-active.svg" alt="" className="size-4"/>현재 루틴</span>}
        {item.personalRecordCount > 0 && <span className="rounded-full border border-black/[.045] bg-white/90 px-2.5 py-1.5 text-[9px] font-semibold text-[#354052] shadow-[0_4px_12px_rgba(25,31,40,.06)] backdrop-blur-md">{item.personalRecordCount}회 사용</span>}
        {!item.inCurrentRoutine && item.personalRecordCount === 0 && <span className="rounded-full border border-black/[.045] bg-white/90 px-2.5 py-1.5 text-[9px] font-semibold text-[#68717c] shadow-[0_4px_12px_rgba(25,31,40,.06)] backdrop-blur-md">사용 전</span>}
      </span>
    </span>
    <span className="block px-1 pb-3 pt-3.5">
      <span className="flex min-w-0 items-center gap-1.5"><BrandIdentity name={product?.brand || item.customBrand} logoUrl={item.brandLogoUrl} size="xs" className="min-w-0" nameClassName="text-[9px] font-semibold uppercase tracking-[.055em] text-[#7d8591]"/>{product?.verified && <BadgeCheck size={12} className="shrink-0 text-[#657d54]"/>}</span>
      <strong className="mt-1.5 block min-h-10 line-clamp-2 text-[14px] font-semibold leading-5 tracking-[-.03em] text-[#171b22]">{name}</strong>
      <span className="mt-1.5 block truncate text-[10px] font-medium tracking-[-.01em] text-[#969ba3]">{category}{!product ? ' · 직접 등록' : ''}</span>
    </span>
  </button>
}

function ShelfEmpty({ filter, onAdd }: { filter: 'ALL' | 'ROUTINE' | 'RECORDED' | 'UNUSED'; onAdd: () => void }) {
  const title = filter === 'ROUTINE' ? '현재 루틴에 제품이 없어요' : filter === 'RECORDED' ? '아직 남긴 기록이 없어요' : filter === 'UNUSED' ? '아직 사용 전인 제품이 없어요' : '첫 화장품을 담아볼까요?'
  const body = filter === 'ROUTINE' ? '루틴 편집에서 실제 사용하는 제품을 골라보세요.' : filter === 'RECORDED' ? '제품을 실제로 사용하고 기록을 남기면 이곳에 모여요.' : filter === 'UNUSED' ? '새로 추가한 제품은 현재 루틴에\n넣기 전까지 여기에 보여요.' : '제품 하나를 담으면 루틴과 사용 경험을\n연결하는 My Lab이 시작돼요.'
  return <div className="relative mt-8 px-1 pb-5 text-center"><div aria-hidden className="absolute inset-x-5 bottom-0 top-5 rounded-[24px] bg-[#e7effc]"/><div className="relative overflow-hidden rounded-[24px] border border-[#d9e6ff] bg-[#f7faff] px-5 pb-6 pt-8 shadow-[0_9px_28px_rgba(37,55,92,.08)]"><button type="button" onClick={onAdd} aria-label="탐색에서 화장품 추가하기" className="relative mx-auto block rounded-full"><AssetMotion name="ai-drop-motion" poster="/skn-assets/ai-drop-motion-poster.png" loop className="size-[150px] rounded-full mix-blend-multiply"/><span aria-hidden className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#172033] shadow-[0_7px_22px_rgba(37,55,92,.14)]"><ActionIcon name="product-add" className="size-6"/></span></button><h2 className="mt-3 text-2xl font-medium tracking-[-.035em]">{title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#737880]">{body}</p><Button onClick={onAdd} className="mt-6 w-full">화장품 추가하기</Button></div></div>
}

function CatalogHeader({ onBack, onBrowse }: { onBack?: () => void; onBrowse?: () => void }) {
  return <AppHeader back={Boolean(onBack)} onBack={onBack} profile={!onBack && !onBrowse} notifications={!onBack && !onBrowse} sticky right={onBrowse ? <button type="button" onClick={onBrowse} aria-label="다른 화장품 찾기" className="grid size-11 place-items-center rounded-full border border-[#e4e7e2] bg-white text-[#343a43] shadow-[0_3px_12px_rgba(28,34,43,.04)] transition hover:bg-soft active:scale-95"><Search size={19}/></button> : undefined}/>
}
