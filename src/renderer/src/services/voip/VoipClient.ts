import type { VoipEvent } from '../../../../shared/voipProtocol'

export type VoipEventListener = (evt: VoipEvent) => void

export default class VoipClient {
  onEvent(listener: VoipEventListener): () => void {
    const removeListener = window.electron.ipcRenderer.on('voip:event', (_event, evt: VoipEvent) => {
      listener(evt)
    })

    return removeListener
  }

  async ensureStarted(): Promise<void> {
    await window.electron.ipcRenderer.invoke('voip:ensureStarted')
  }

  async addPeer(ip: string): Promise<void> {
    await this.ensureStarted()
    await window.electron.ipcRenderer.invoke('voip:join', { ip })
  }

  async leaveCall(): Promise<void> {
    await window.electron.ipcRenderer.invoke('voip:leave')
  }

  async stopProcess(): Promise<void> {
    await window.electron.ipcRenderer.invoke('voip:stop')
  }

  /**
   * C++ currently supports:
   * - join: `c <ip>`
   * - leave: `d` (clears all peers + terminates call thread)
   *
   * To "remove a single participant" we:
   * 1) leave (clears connections)
   * 2) re-join all remaining IPs
   */
  async removePeerAndRejoin(remainingIps: string[]): Promise<void> {
    await this.leaveCall()
    for (const ip of remainingIps) {
      // Sequential to preserve command ordering.
      await this.addPeer(ip)
    }
  }
}

