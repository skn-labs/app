import AssetVideo from './AssetVideo'

/**
 * 프로필 완성 화면의 체크표시 애니메이션.
 * 한 번만 재생하고 마지막 프레임에서 멈춥니다.
 * 재생이 끝나면(또는 영상을 못 틀면) onEnded 로 알려줍니다.
 */
export default function CheckAnimation({
  size = 220,
  onEnded,
}: {
  size?: number
  onEnded?: () => void
}) {
  return (
    <AssetVideo
      name="check"
      poster="/media/check-poster.png"
      alt="피부 프로필 완성"
      onEnded={onEnded}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  )
}
