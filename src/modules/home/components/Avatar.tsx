import { memberColor } from '../lib/family'

interface Props {
  name: string
  url?: string
  size?: number
}

export function Avatar({ name, url, size = 56 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.42, '--c': memberColor(name) } as React.CSSProperties
  return url ? (
    <img className="avatar" src={url} alt={name} style={style} />
  ) : (
    <div className="avatar" style={style} aria-label={name}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
