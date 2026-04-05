export default function CallControls(props: {
  isMuteMic: boolean
  isDeafenAll: boolean
  onToggleMuteMic: () => void
  onToggleDeafenAll: () => void
  onEndCall: () => void
}): React.JSX.Element {
  return (
    <div className="voip-card voip-card--controls">
      <div className="voip-card__title">Call Controls</div>

      <div className="voip-controls">
        <button
          type="button"
          className={`voip-btn voip-btn--toggle ${props.isMuteMic ? 'voip-btn--active' : ''}`}
          onClick={props.onToggleMuteMic}
          aria-pressed={props.isMuteMic}
        >
          {props.isMuteMic ? 'Unmute Mic' : 'Mute Mic'}
        </button>

        <button
          type="button"
          className={`voip-btn voip-btn--toggle ${props.isDeafenAll ? 'voip-btn--active' : ''}`}
          onClick={props.onToggleDeafenAll}
          aria-pressed={props.isDeafenAll}
        >
          {props.isDeafenAll ? 'Undeafen' : 'Deafen'}
        </button>
      </div>

      <div className="voip-controls-separator" />

      <button type="button" className="voip-btn voip-btn--danger" onClick={props.onEndCall}>
        End Call
      </button>
    </div>
  )
}

