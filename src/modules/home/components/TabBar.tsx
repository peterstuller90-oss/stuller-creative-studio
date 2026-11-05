import { play } from '../lib/sound'
import { Icon, type IconName } from './Icon'

export type Tab = 'home' | 'tasks' | 'family' | 'profile' | 'parent'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Domov', icon: 'home' },
  { id: 'tasks', label: 'Úlohy', icon: 'tasks' },
  { id: 'family', label: 'Rodina', icon: 'family' },
  { id: 'parent', label: 'Rodič', icon: 'parent' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
]

interface Props {
  active: Tab
  onChange: (t: Tab) => void
  isParent: boolean
  parentBadge: number
}

export function TabBar({ active, onChange, isParent, parentBadge }: Props) {
  return (
    <nav className="tabbar">
      {TABS.filter((t) => t.id !== 'parent' || isParent).map((t) => (
        <button key={t.id} className={t.id === active ? 'tab active' : 'tab'} onClick={() => { play('tap'); onChange(t.id) }}>
          <span className="tab-icon">
            <Icon name={t.icon} />
            {t.id === 'parent' && parentBadge > 0 && <span className="badge">{parentBadge}</span>}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
