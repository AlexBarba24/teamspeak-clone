import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { existsSync } from 'fs'
import { EventEmitter } from 'events'
import path from 'path'
import type { VoipCommand, VoipEvent } from '../../shared/voipProtocol'
import { encodeCommand } from '../../shared/voipProtocol'

type VoipProcessControllerOptions = {
  executablePath?: string
}

export default class VoipProcessController extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null
  private writeChain: Promise<void> = Promise.resolve()

  private stdoutBuffer = ''
  private stderrBuffer = ''

  private executablePath: string | null = null

  constructor(private readonly options: VoipProcessControllerOptions = {}) {
    super()
  }

  private resolveExecutablePath(): string {
    if (this.options.executablePath) return this.options.executablePath
    if (this.executablePath) return this.executablePath

    const exeName = process.platform === 'win32' ? 'voip.exe' : 'voip'

    const candidates: string[] = [
      // Packaged app resources
      path.join(process.resourcesPath, exeName),
      path.join(process.resourcesPath, 'voip', exeName),
      // Dev / workspace resources
      path.join(process.cwd(), 'resources', exeName),
      path.join(process.cwd(), 'resources', 'voip', exeName),
      // Fallback for local dev if you built under src/cpp
      path.join(process.cwd(), 'src', 'cpp', exeName),
    ]

    const found = candidates.find(p => existsSync(p))
    if (!found) {
      throw new Error(
        `VOIP executable not found. Checked: ${candidates.join(', ')}. ` +
          `Create/copy it into resources/voip/${exeName} or build it under src/cpp/.`,
      )
    }

    this.executablePath = found
    return found
  }

  async ensureStarted(): Promise<void> {
    if (this.child && !this.child.killed) return

    const executablePath = this.resolveExecutablePath()

    // Spawn once; the C++ process reads commands from stdin.
    const child = spawn(executablePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.child = child
    this.stdoutBuffer = ''
    this.stderrBuffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      this.handleStdoutChunk(chunk)
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.handleStderrChunk(chunk)
    })

    child.on('exit', (code, signal) => {
      const evt: VoipEvent = {
        type: 'log',
        source: 'stderr',
        message: `voip process exited (code=${code}, signal=${signal})`,
      }
      this.emit('voip:event', evt)
      this.child = null
    })
  }

  private handleStdoutChunk(chunk: Buffer): void {
    this.stdoutBuffer += chunk.toString('utf8')
    const parts = this.stdoutBuffer.split(/\r?\n/)
    this.stdoutBuffer = parts.pop() ?? ''
    for (const line of parts) {
      const evt: VoipEvent = { type: 'log', source: 'stdout', message: line }
      this.emit('voip:event', evt)
    }
  }

  private handleStderrChunk(chunk: Buffer): void {
    this.stderrBuffer += chunk.toString('utf8')
    const parts = this.stderrBuffer.split(/\r?\n/)
    this.stderrBuffer = parts.pop() ?? ''
    for (const line of parts) {
      const evt: VoipEvent = { type: 'log', source: 'stderr', message: line }
      this.emit('voip:event', evt)
    }
  }

  private async writeCommand(command: VoipCommand): Promise<void> {
    await this.ensureStarted()
    if (!this.child || !this.child.stdin) throw new Error('voip child process stdin is not available')

    const encoded = encodeCommand(command)

    // Serialize writes so `c <ip>` and `d` don't interleave.
    this.writeChain = this.writeChain.then(
      () =>
        new Promise<void>((resolve, reject) => {
          this.child?.stdin.write(encoded, err => (err ? reject(err) : resolve()))
        }),
    )
    return this.writeChain
  }

  async join(ip: string): Promise<void> {
    await this.writeCommand({ type: 'join', ip })
  }

  async leave(): Promise<void> {
    await this.writeCommand({ type: 'leave' })
  }

  /**
   * Terminates the child process immediately.
   * Note: the C++ process also has a `d` command, but for safety we kill on stop.
   */
  async stop(): Promise<void> {
    if (!this.child) return

    const child = this.child
    this.child = null

    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }
  }
}

