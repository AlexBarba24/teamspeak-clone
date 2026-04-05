import { useMemo, useState } from 'react'
import type { Participant } from './ParticipantsList'

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/g).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function ParticipantItem(props: {
  participant: Participant
  onRemove: () => void
  onUpdateNickname: (nickname: string) => void
}): React.JSX.Element {
  const { participant } = props
  const [isEditing, setIsEditing] = useState(false)
  const [draftNickname, setDraftNickname] = useState(participant.nickname)

  const displayNickname = participant.nickname.trim() ? participant.nickname.trim() : 'Unnamed'
  const initials = useMemo(() => getInitials(displayNickname), [displayNickname])

  const statusLabel = participant.status === 'connected' ? 'Connected' : participant.status === 'connecting' ? 'Connecting…' : 'Error'

  const statusClass =
    participant.status === 'connected'
      ? 'voip-pill--connected'
      : participant.status === 'connecting'
        ? 'voip-pill--connecting'
        : 'voip-pill--error'

  return (
    <div className="voip-participant" role="listitem">
      <div className="voip-participant__avatar" aria-hidden="true">
        {initials}
      </div>

      <div className="voip-participant__main">
        {isEditing ? (
          <div className="voip-editrow">
            <input
              className="voip-input voip-input--compact"
              value={draftNickname}
              onChange={(e) => setDraftNickname(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setDraftNickname(participant.nickname)
                }
                if (e.key === 'Enter') {
                  props.onUpdateNickname(draftNickname)
                  setIsEditing(false)
                }
              }}
            />
            <button
              type="button"
              className="voip-btn voip-btn--small"
              onClick={() => {
                props.onUpdateNickname(draftNickname)
                setIsEditing(false)
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="voip-btn voip-btn--small voip-btn--ghost"
              onClick={() => {
                setIsEditing(false)
                setDraftNickname(participant.nickname)
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="voip-nickname"
            onClick={() => {
              setIsEditing(true)
              setDraftNickname(participant.nickname)
            }}
            title="Click to edit nickname"
          >
            {displayNickname}
          </button>
        )}

        <div className="voip-ip">{participant.ip}</div>
      </div>

      <div className="voip-participant__right">
        <div className={`voip-pill ${statusClass}`}>{statusLabel}</div>
        <button type="button" className="voip-btn voip-btn--danger voip-btn--small" onClick={props.onRemove}>
          Remove
        </button>
      </div>
    </div>
  )
}

