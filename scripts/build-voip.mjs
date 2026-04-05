import { existsSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const projectRoot = process.cwd()
const srcDir = path.join(projectRoot, 'src', 'cpp')

const exeName = process.platform === 'win32' ? 'voip.exe' : 'voip'

const exeSrc = path.join(srcDir, exeName)
const exeDest = path.join(projectRoot, 'resources', exeName)

// Build the C++ executable.
execFileSync('make', ['-C', srcDir, 'voip'], { stdio: 'inherit' })

if (!existsSync(exeSrc)) {
  throw new Error(`Expected VOIP executable at ${exeSrc} but it was not found.`)
}

// `resources/` is already included by electron-builder; we keep a simple layout:
// - mac/linux: resources/voip
// - win32: resources/voip.exe
copyFileSync(exeSrc, exeDest)

console.log(`Copied VOIP binary -> ${exeDest}`)

