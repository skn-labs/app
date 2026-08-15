import { BottomSheet, Button } from './ui'

type Choice = 'LIKED' | 'UNSURE' | 'DISAPPOINTED'

export function BeforeChangeSheet({ open, title, pending, error, onClose, onChoose, onSkip }: {
  open: boolean
  title: string
  pending: boolean
  error?: string
  onClose: () => void
  onChoose: (choice: Choice) => void
  onSkip: () => void
}) {
  const choices: { value: Choice; label: string; symbol: string }[] = [
    { value: 'LIKED', label: '마음에 들었어요', symbol: '☺' },
    { value: 'UNSURE', label: '아직 모르겠어요', symbol: '◌' },
    { value: 'DISAPPOINTED', label: '아쉬웠어요', symbol: '↘' },
  ]
  return <BottomSheet open={open} onClose={pending ? () => undefined : onClose} title="바꾸기 전에 잠깐만요">
    <p className="-mt-2 text-sm font-medium leading-6">{title}</p>
    <p className="mt-1 text-xs leading-5 text-muted">지금까지의 느낌 하나만 남기면 이전 경험이 사라지지 않아요.</p>
    <div className="mt-5 grid grid-cols-3 gap-2">{choices.map(choice => <button type="button" key={choice.value} disabled={pending} onClick={() => onChoose(choice.value)} className="interactive-card rounded-[18px] border border-line bg-white px-2 py-3 text-center disabled:opacity-50"><span className="block text-xl">{choice.symbol}</span><span className="mt-2 block text-[11px] font-medium leading-4">{choice.label}</span></button>)}</div>
    {error && <p className="mt-3 text-xs leading-5 text-danger">{error}</p>}
    <Button disabled={pending} variant="ghost" onClick={onSkip} className="mt-2 w-full text-xs text-muted">기록 없이 새로 시작</Button>
  </BottomSheet>
}
