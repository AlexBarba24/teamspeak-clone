import ParticipantItem from './ParticipantItem'

export type ParticipantStatus = 'connecting' | 'connected' | 'error'

export type Participant = {
  id: number
  ip: string
  nickname: string
  status: ParticipantStatus
}

export default function ParticipantsList(props: {
  participants: Participant[]
  onRemove: (id: number) => void
  onUpdateNickname: (id: number, nickname: string) => void
}): React.JSX.Element {
  return (
    <div className="voip-card voip-card--list">
      <div className="voip-card__title">Current Call</div>

      {props.participants.length === 0 ? (
        <div className="voip-empty">No one in the call yet. Add a peer by IP to start.</div>
      ) : (
        <div className="voip-list" role="list">
          {props.participants.map(p => (
            <ParticipantItem
              key={p.id}
              participant={p}
              onRemove={() => props.onRemove(p.id)}
              onUpdateNickname={(nickname) => props.onUpdateNickname(p.id, nickname)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

