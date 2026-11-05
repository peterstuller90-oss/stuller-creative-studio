export function StreakChip({ days }: { days: number }) {
  const label = days === 1 ? 'deň' : days >= 2 && days <= 4 ? 'dni' : 'dní'
  return (
    <span className={days > 0 ? 'streak on' : 'streak'} title="Dni po sebe so splnenou úlohou">
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <strong>{days}</strong> {label} v rade
    </span>
  )
}
