export type ActionIconName = 'progress' | 'product-add' | 'routine-add'

export function ActionIcon({ name, className = '' }: { name: ActionIconName; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24"><use href={`/skn-assets/context-action-icons.svg#${name}`}/></svg>
}
