import { useEffect, useMemo, useRef, useState } from 'react'
import AddPeerForm from './AddPeerForm'
import ParticipantsList, { type Participant } from './ParticipantsList'
import CallControls from './CallControls'
import VoipClient from '../services/voip/VoipClient'

type Notice = { type: 'error' | 'success'; message: string }

function CallView(): React.JSX.Element {
  const nextIdRef = useRef(1)
  const busyRef = useRef(false)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  const [isMuteMic, setIsMuteMic] = useState(false)
  const [isDeafenAll, setIsDeafenAll] = useState(false)

  const voipClient = useMemo(() => new VoipClient(), [])

  const setBusyBoth = (value: boolean): void => {
    busyRef.current = value
    setBusy(value)
  }

  useEffect(() => {
    // For now we only log VOIP process output. UI state is handled by explicit user actions.
    const off = voipClient.onEvent(evt => {
      if (evt.type === 'log' && evt.message) {
        // eslint-disable-next-line no-console
        console.log(`[voip ${evt.source}] ${evt.message}`)
      }
    })
    return off
  }, [voipClient])

  const canAdd = useMemo(() => !busy, [busy])

  const addPeer = async ({
    ip,
    nickname,
  }: {
    ip: string
    nickname: string
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (busyRef.current) return { ok: false, error: 'Please wait for the current operation to finish.' }

    const normalizedIp = ip.trim()
    const normalizedNickname = nickname.trim()

    if (participants.some(p => p.ip === normalizedIp)) {
      return { ok: false, error: 'That IP is already in the call.' }
    }

    const id = nextIdRef.current++
    const newParticipant: Participant = {
      id,
      ip: normalizedIp,
      nickname: normalizedNickname || '',
      status: 'connecting',
    }

    setBusyBoth(true)
    setParticipants(prev => [...prev, newParticipant])
    setNotice(null)

    try {
      await voipClient.addPeer(normalizedIp)
      setParticipants(prev => prev.map(p => (p.id === id ? { ...p, status: 'connected' } : p)))
      return { ok: true }
    } catch (err) {
      setParticipants(prev => prev.filter(p => p.id !== id))
      const message = err instanceof Error ? err.message : 'Failed to connect peer.'
      setNotice({ type: 'error', message })
      return { ok: false, error: message }
    } finally {
      setBusyBoth(false)
    }
  }

  const removeParticipant = (id: number): void => {
    void (async () => {
      if (busyRef.current) return

      const remaining = participants.filter(p => p.id !== id)
      const remainingIps = remaining.map(p => p.ip)

      setBusyBoth(true)
      setNotice(null)

      setParticipants(remaining.map(p => ({ ...p, status: 'connecting' })))

      try {
        await voipClient.removePeerAndRejoin(remainingIps)
        setParticipants(prev => prev.map(p => ({ ...p, status: 'connected' })))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove peer.'
        setNotice({ type: 'error', message })
        setParticipants(prev => prev.map(p => ({ ...p, status: 'error' })))
      } finally {
        setBusyBoth(false)
      }
    })()
  }

  const updateParticipantNickname = (id: number, nickname: string): void => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, nickname: nickname.trim() } : p)),
    )
  }

  const endCall = (): void => {
    void (async () => {
      if (busyRef.current) return

      setBusyBoth(true)
      setNotice(null)

      try {
        await voipClient.leaveCall()
        setParticipants([])
        setIsMuteMic(false)
        setIsDeafenAll(false)
        setNotice({ type: 'success', message: 'Call ended.' })
        window.setTimeout(() => setNotice(null), 2000)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to end call.'
        setNotice({ type: 'error', message })
      } finally {
        setBusyBoth(false)
      }
    })()
  }

  return (
    <div className="voip-shell">
      <div className="voip-topbar">
        <div className="voip-title">VOIP Call</div>
        <div className="voip-subtitle">Add peers by IP, name them, and remove them instantly.</div>
      </div>

      {notice ? (
        <div className={`voip-notice voip-notice--${notice.type}`}>
          <span className="voip-notice__message">{notice.message}</span>
          <button className="voip-notice__close" onClick={() => setNotice(null)} type="button">
            ×
          </button>
        </div>
      ) : null}

      <div className="voip-grid">
        <AddPeerForm disabled={!canAdd} onAddPeer={addPeer} />

        <CallControls
          isMuteMic={isMuteMic}
          isDeafenAll={isDeafenAll}
          onToggleMuteMic={() => setIsMuteMic(v => !v)}
          onToggleDeafenAll={() => setIsDeafenAll(v => !v)}
          onEndCall={endCall}
        />

        <ParticipantsList
          participants={participants}
          onRemove={removeParticipant}
          onUpdateNickname={updateParticipantNickname}
        />
      </div>
    </div>
  )
}

export default CallView

