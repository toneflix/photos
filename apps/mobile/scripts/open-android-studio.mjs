import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Finds the Android Studio launcher on macOS, Linux or Windows and opens a project in it.
 * STUDIO_PATH points at a launcher (or the macOS .app) when it lives somewhere unusual.
 */
class AndroidStudio {
  constructor(platform = process.platform, env = process.env) {
    this.platform = platform
    this.env = env
  }

  get candidates () {
    const home = homedir()

    if (this.platform === 'darwin') {
      return [
        '/Applications/Android Studio.app',
        join(home, 'Applications/Android Studio.app'),
      ]
    }

    if (this.platform === 'win32') {
      const programFiles = this.env.ProgramFiles ?? 'C:\\Program Files'
      const localAppData = this.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')

      return [
        ...this.onPath(['studio64.exe', 'studio.exe']),
        join(programFiles, 'Android', 'Android Studio', 'bin', 'studio64.exe'),
        join(localAppData, 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
        join(localAppData, 'JetBrains', 'Toolbox', 'scripts', 'studio.cmd'),
      ]
    }

    return [
      ...this.onPath(['studio', 'studio.sh', 'android-studio']),
      join(home, '.local/share/JetBrains/Toolbox/scripts/studio'),
      '/opt/android-studio/bin/studio.sh',
      '/usr/local/android-studio/bin/studio.sh',
      join(home, 'android-studio/bin/studio.sh'),
      '/snap/bin/android-studio',
    ]
  }

  onPath(names) {
    const dirs = (this.env.PATH ?? this.env.Path ?? '').split(delimiter).filter(Boolean)

    return dirs.flatMap((dir) => names.map((name) => join(dir, name)))
  }

  locate() {
    const custom = this.env.STUDIO_PATH

    if (custom) {
      if (!existsSync(custom)) {
        throw new Error(`STUDIO_PATH does not exist: ${custom}`)
      }

      return custom
    }

    return this.candidates.find((path) => existsSync(path))
  }

  open(project) {
    const launcher = this.locate()

    if (!launcher) {
      throw new Error('Android Studio was not found. Set STUDIO_PATH to its launcher and try again.')
    }

    const [command, args] = launcher.endsWith('.app')
      ? ['open', ['-a', launcher, project]]
      : [launcher, [project]]

    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      shell: this.platform === 'win32' && /\.(cmd|bat)$/i.test(launcher),
    })

    child.on('error', (error) => {
      console.error(`Could not start Android Studio: ${error.message}`)
      process.exitCode = 1
    })
    child.unref()

    console.log(`Opening ${project} in Android Studio`)
  }
}

const project = resolve(fileURLToPath(new URL('../android', import.meta.url)))

if (!existsSync(project)) {
  console.error('apps/mobile/android is missing. Run `expo prebuild -p android` first.')
  process.exit(1)
}

try {
  new AndroidStudio().open(project)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
