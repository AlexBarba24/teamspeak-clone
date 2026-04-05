export type VoipCommand =
  | {
      type: 'join'
      ip: string
    }
  | {
      type: 'leave'
    }

export type VoipEvent =
  | {
      type: 'log'
      source: 'stdout' | 'stderr'
      message: string
    }

/**
 * Encode a typed command into the stdin protocol expected by `src/cpp/main.cpp`.
 * - join: `c <ip>\n`
 * - leave: `d\n`
 */
export function encodeCommand(command: VoipCommand): string {
  switch (command.type) {
    case 'join': {
      // `std::cin >> ipString` reads a whitespace-delimited token, so newline is safe.
      return `c ${command.ip}\n`
    }
    case 'leave':
      return `d\n`
  }
}

