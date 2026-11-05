export function Logo({ width = 200, label = 'Home' }: { width?: number; label?: string }) {
  return (
    <div className="brand-logo">
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" width={width} />
      <span>{label}</span>
    </div>
  )
}
