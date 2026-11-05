import { buildContract, signatureNames } from '../lib/contract'
import type { Quote, Settings } from '../lib/types'

export function ContractDocument({ quote, settings }: { quote: Quote; settings: Settings }) {
  const sig = signatureNames(quote, settings)
  return (
    <article className="doc contract">
      <img className="contract-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="Štullers" />
      {buildContract(quote, settings).map((b, i) => {
        if (b.kind === 'title') return <h1 key={i}>{b.text}</h1>
        if (b.kind === 'note') return <p key={i} className="contract-note">{b.text}</p>
        if (b.kind === 'h') return <h2 key={i}>{b.text}</h2>
        return <p key={i}>{b.text}</p>
      })}
      <div className="contract-sign">
        <div>
          <p>V ................................ dňa ...............</p>
          {(sig.authors.length ? sig.authors : ['']).map((n, i) => <div key={i} className="sign-line">Autor{n ? `: ${n}` : ''}</div>)}
        </div>
        <div>
          <p>V ................................ dňa ...............</p>
          <div className="sign-line">Objednávateľ{sig.client ? `: ${sig.client}` : ''}</div>
        </div>
      </div>
    </article>
  )
}
