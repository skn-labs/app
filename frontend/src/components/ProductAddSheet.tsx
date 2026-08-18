import { ChevronRight, FlaskConical, Search } from 'lucide-react'
import { BottomSheet } from './ui'
import aiSparkIcon from '../assets/figma/home-ai-spark.svg'

export function ProductAddSheet({ open, onClose, onAi, onSearch }: {
  open: boolean
  onClose: () => void
  onAi: () => void
  onSearch: () => void
}) {
  return <BottomSheet open={open} onClose={onClose} title="화장품 추가">
    <p className="-mt-1 text-sm text-[#747b86]">찾는 방법을 선택하세요.</p>
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button type="button" onClick={onAi} className="group relative flex min-h-[184px] min-w-0 flex-col overflow-hidden rounded-[26px] border border-[#dce6fb] bg-[linear-gradient(145deg,#eaf1ff_0%,#f3f1ff_58%,#fafbff_100%)] p-4 text-left shadow-[0_8px_24px_rgba(62,82,120,.08)] transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(62,82,120,.14)] active:translate-y-0 active:scale-[.98]">
        <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full border border-white/75 bg-white/28"/>
        <span className="relative flex w-full items-start justify-between"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[17px]"><img src={aiSparkIcon} alt="" aria-hidden className="size-full object-contain"/></span><ChevronRight size={18} className="mt-1 text-[#7c879a] transition group-hover:translate-x-0.5"/></span>
        <span className="relative mt-auto"><span className="text-[10px] font-semibold tracking-[.08em] text-[#6c7da0]">SKN AI</span><strong className="mt-1.5 block text-[17px] font-semibold tracking-[-.035em] text-[#151c29]">AI 추천받기</strong><span className="mt-1.5 block text-[11px] leading-[1.55] text-[#697387]">내 경험을 참고해<br/>후보를 좁혀요.</span></span>
      </button>
      <button type="button" onClick={onSearch} className="group flex min-h-[184px] min-w-0 flex-col rounded-[26px] border border-[#e3e7f0] bg-[#f4f6fb] p-4 text-left shadow-[0_6px_20px_rgba(49,66,100,.06)] transition hover:-translate-y-1 hover:border-[#cfd7e6] hover:bg-white hover:shadow-[0_14px_28px_rgba(49,66,100,.1)] active:translate-y-0 active:scale-[.98]">
        <span className="flex w-full items-start justify-between"><span className="grid size-12 place-items-center text-[#3a4252]"><Search size={24} strokeWidth={1.8}/></span><ChevronRight size={18} className="mt-1 text-[#8e949d] transition group-hover:translate-x-0.5"/></span>
        <span className="mt-auto"><span className="text-[10px] font-semibold tracking-[.08em] text-[#8593ab]">SEARCH</span><strong className="mt-1.5 block text-[17px] font-semibold tracking-[-.035em] text-[#1b2230]">직접 검색하기</strong><span className="mt-1.5 block text-[11px] leading-[1.55] text-[#6f7788]">브랜드나 제품명으로<br/>바로 찾아요.</span></span>
      </button>
    </div>
    <div className="mb-1 mt-4 flex items-center gap-2.5 rounded-[16px] bg-[#f5f6f7] px-3.5 py-3 text-[#7e858e]"><FlaskConical size={15} className="shrink-0"/><p className="text-[11px] leading-5">화장품을 추가해도 현재 루틴은 그대로예요.</p></div>
  </BottomSheet>
}
