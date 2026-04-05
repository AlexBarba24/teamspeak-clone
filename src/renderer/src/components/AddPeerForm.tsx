import { useMemo, useState } from 'react'

function isValidIpv4(ip: string): boolean {
  // Basic IPv4 validation.
  const match = ip.match(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
  )
  return Boolean(match)
}

export default function AddPeerForm(props: {
  disabled: boolean
  onAddPeer: (
    payload: { ip: string; nickname: string },
  ) => { ok: true } | { ok: false; error: string } | Promise<{ ok: true } | { ok: false; error: string }>
}): React.JSX.Element {
  const [ip, setIp] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)

  const normalizedIp = ip.trim()
  const isIpValid = useMemo(() => normalizedIp.length > 0 && isValidIpv4(normalizedIp), [normalizedIp])

  const canSubmit = !props.disabled && isIpValid

  return (
    <form
      className="voip-card voip-card--form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!canSubmit) return

        const result = await props.onAddPeer({ ip: normalizedIp, nickname })
        if (!result.ok) setError(result.error)
        else {
          setError(null)
          setIp('')
          setNickname('')
        }
      }}
    >
      <div className="voip-card__title">Add Peer</div>

      <label className="voip-field">
        <div className="voip-field__label">Peer IP</div>
        <input
          className="voip-input"
          placeholder="e.g. 192.168.0.42"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          disabled={props.disabled}
        />
      </label>

      <label className="voip-field">
        <div className="voip-field__label">Nickname (optional)</div>
        <input
          className="voip-input"
          placeholder="Optional nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={props.disabled}
        />
      </label>

      {!isIpValid && normalizedIp.length > 0 ? (
        <div className="voip-inline-error">IP must be a valid IPv4 address.</div>
      ) : null}

      {error ? <div className="voip-inline-error">{error}</div> : null}

      <div className="voip-form-actions">
        <button className="voip-btn voip-btn--primary" type="submit" disabled={!canSubmit}>
          Add to Call
        </button>
      </div>
    </form>
  )
}

