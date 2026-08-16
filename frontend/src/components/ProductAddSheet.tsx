import { ChevronRight, FlaskConical, Search } from 'lucide-react'
import { BottomSheet } from './ui'

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
        <span className="relative flex w-full items-start justify-between"><span className="grid size-12 place-items-center overflow-hidden rounded-[17px] border border-white/80 bg-white/72 shadow-[0_7px_18px_rgba(74,91,132,.14)]"><img src="/skn-assets/ai-drop.png" alt="" className="size-[58px] max-w-none object-contain"/></span><ChevronRight size={18} className="mt-1 text-[#7c879a] transition group-hover:translate-x-0.5"/></span>
        <span className="relative mt-auto"><span className="text-[10px] font-semibold tracking-[.08em] text-[#6c7da0]">SKN AI</span><strong className="mt-1.5 block text-[17px] font-semibold tracking-[-.035em] text-[#151c29]">AI 추천받기</strong><span className="mt-1.5 block text-[11px] leading-[1.55] text-[#697387]">내 경험을 참고해<br/>후보를 좁혀요.</span></span>
      </button>
      <button type="button" onClick={onSearch} className="group flex min-h-[184px] min-w-0 flex-col rounded-[26px] border border-black/[.065] bg-[#f7f7f5] p-4 text-left shadow-[0_6px_20px_rgba(0,0,0,.045)] transition hover:-translate-y-1 hover:border-black/10 hover:bg-white hover:shadow-[0_14px_28px_rgba(0,0,0,.08)] active:translate-y-0 active:scale-[.98]">
        <span className="flex w-full items-start justify-between"><span className="grid size-11 place-items-center rounded-[16px] bg-white text-[#222831] shadow-[0_6px_16px_rgba(0,0,0,.08)]"><Search size={20} strokeWidth={1.8}/></span><ChevronRight size={18} className="mt-1 text-[#8e949d] transition group-hover:translate-x-0.5"/></span>
        <span className="mt-auto"><span className="text-[10px] font-semibold tracking-[.08em] text-[#8a8f96]">SEARCH</span><strong className="mt-1.5 block text-[17px] font-semibold tracking-[-.035em] text-[#1b1d21]">직접 검색하기</strong><span className="mt-1.5 block text-[11px] leading-[1.55] text-[#777d85]">브랜드나 제품명으로<br/>바로 찾아요.</span></span>
      </button>
    </div>
    <div className="mb-1 mt-4 flex items-center gap-2.5 rounded-[16px] bg-[#f5f6f7] px-3.5 py-3 text-[#7e858e]"><FlaskConical size={15} className="shrink-0"/><p className="text-[11px] leading-5">화장품을 추가해도 현재 루틴은 그대로예요.</p></div>
  </BottomSheet>
}
