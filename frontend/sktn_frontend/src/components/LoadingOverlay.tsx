import AssetVideo from './AssetVideo'

/**
 * 로그인 버튼을 눌렀을 때 뜨는 로딩창.
 * 디자인 소스의 「로딩창 애니메이션」을 반복 재생합니다.
 */
export default function LoadingOverlay({
  label = '피부 데이터를 불러오는 중이에요',
}: {
  label?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-white"
    >
      <AssetVideo
        name="loading"
        poster="/media/orb.png"
        loop
        className="object-contain"
        style={{ width: 200, height: 200 }}
      />
      <p className="text-[13px] text-ink-muted">{label}</p>
    </div>
  )
}
