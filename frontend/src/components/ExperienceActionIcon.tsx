export function ExperienceActionIcon({ name, className = '' }: { name: 'feeling' | 'discomfort'; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24"><use href={`/skn-assets/experience-actions.svg#${name}`}/></svg>
}
