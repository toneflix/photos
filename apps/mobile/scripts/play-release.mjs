#!/usr/bin/env node
/**
 * Release details for the Google Play workflow (.github/workflows/android-release.yml).
 *
 *   node scripts/play-release.mjs plan [--version 1.2.0-beta.1] [--run 42] [--prerelease]
 *   node scripts/play-release.mjs apply --version 1.2.0 --code 43
 *   node scripts/play-release.mjs notes --out <dir> [--body-file release.md] [--ref HEAD]
 *
 * Paths are relative to apps/mobile. `plan` prints the version name, version code and Play tracks,
 * and writes them to $GITHUB_OUTPUT when it is set.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/** A release version such as 1.2.0, v1.2.0 or 1.2.0-beta.1, and the Play tracks it goes to. */
export class ReleaseVersion {
  static pattern =
    /^v?(?<core>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:-(?<pre>[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

  /** Prerelease ids and the testing level they publish to. Any other id goes to internal testing. */
  static channels = { rc: 'open', beta: 'open', alpha: 'closed' }

  /** Each level publishes to its own track and every track below it. */
  static levels = ['internal', 'closed', 'open', 'production']

  constructor(tag, { prerelease = false } = {}) {
    const match = ReleaseVersion.pattern.exec(String(tag).trim())

    if (!match) {
      throw new Error(`"${tag}" is not a release version: use x.y.z or x.y.z-<id>, with or without a leading v.`)
    }

    this.name = String(tag).trim().replace(/^v/, '')
    this.prereleaseId = match.groups.pre?.match(/^[a-z]+/i)?.[0].toLowerCase() ?? null
    this.prerelease = prerelease
  }

  /** The testing level the version publishes to: a GitHub pre-release never reaches production. */
  get level() {
    const level = this.prereleaseId ? (ReleaseVersion.channels[this.prereleaseId] ?? 'internal') : 'production'

    return this.prerelease && level === 'production' ? 'open' : level
  }

  /** Play track names, highest first. Names come from PLAY_<LEVEL>_TRACK when set. */
  tracks(env = process.env) {
    const names = {
      internal: env.PLAY_INTERNAL_TRACK || 'internal',
      closed: env.PLAY_CLOSED_TRACK || 'alpha',
      open: env.PLAY_OPEN_TRACK || 'beta',
      production: 'production',
    }
    const top = ReleaseVersion.levels.indexOf(this.level)
    const levels = ReleaseVersion.levels.filter((level, index) => index <= top || (this.prerelease && level === 'open'))

    return levels.reverse().map((level) => names[level])
  }
}

/** The version name and version code kept in app.json and package.json. */
export class AppVersion {
  constructor(dir = appDir) {
    this.appJsonPath = join(dir, 'app.json')
    this.packagePath = join(dir, 'package.json')
    this.appJson = JSON.parse(readFileSync(this.appJsonPath, 'utf8'))
    this.packageJson = JSON.parse(readFileSync(this.packagePath, 'utf8'))
  }

  get name() {
    return this.appJson.expo.version
  }

  get code() {
    return this.appJson.expo.android?.versionCode ?? this.baseBuildNumber
  }

  get baseBuildNumber() {
    const base = this.packageJson.baseBuildNumber

    if (!Number.isInteger(base) || base < 1) throw new Error('Set "baseBuildNumber" in apps/mobile/package.json to a whole number.')

    return base
  }

  /** The version code for a workflow run: the base build number plus the run number. */
  codeFor(runNumber) {
    const code = this.baseBuildNumber + Number(runNumber)

    if (!Number.isInteger(code) || code > 2100000000) throw new Error(`Version code ${code} is not valid for Google Play.`)

    return code
  }

  write(name, code) {
    this.appJson.expo.version = name
    this.appJson.expo.android = { ...this.appJson.expo.android, versionCode: code }
    this.packageJson.version = name

    writeFileSync(this.appJsonPath, `${JSON.stringify(this.appJson, null, 2)}\n`)
    writeFileSync(this.packagePath, `${JSON.stringify(this.packageJson, null, 2)}\n`)
  }
}

/** "What's new" text for Google Play, built from the app's features in a release body or its commits. */
export class ReleaseNotes {
  static limit = 500
  static fallback = 'Fixes and improvements.'

  /** Conventional commit scopes that don't change the Android app. */
  static hiddenScopes = new Set(['admin', 'api', 'web', 'ci', 'docs', 'deps', 'build', 'flipbook-docs'])

  static conventional = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?!?:\s*(?<text>.+)$/i

  constructor(lines) {
    this.features = [...new Set(lines.map((line) => ReleaseNotes.feature(line)).filter(Boolean))]
  }

  static fromBody(body) {
    const lines = body.split(/\r?\n/).map((line) => line.trim())
    const bullets = lines.filter((line) => /^[-*•]\s+/.test(line))

    return new ReleaseNotes(bullets.length ? bullets : lines)
  }

  static fromCommits(ref = 'HEAD') {
    const git = (...args) => execFileSync('git', args, { cwd: appDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    let range = ref

    try {
      range = `${git('describe', '--tags', '--abbrev=0', `${ref}^`)}..${ref}`
    } catch {
      range = ref
    }

    return new ReleaseNotes(git('log', '--no-merges', '--format=%s', '--max-count=200', range).split('\n'))
  }

  /** The feature a release line describes, or null for headings, links, fixes and admin or web-only work. */
  static feature(line) {
    let text = line
      .replace(/^[-*•]\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+by @\S+(\s+in\s+\S+)?$/, '')
      .replace(/\s+in\s+https?:\/\/\S+$/, '')
      .replace(/\s*\(#\d+\)$/, '')
      .trim()

    if (!text || /^#|^\*\*|^<!--|full changelog|new contributors|first contribution/i.test(text)) return null
    if (/\badmin/i.test(text)) return null

    const commit = ReleaseNotes.conventional.exec(text)

    if (commit) {
      const scopes = (commit.groups.scope ?? '').split(/[,/\s]+/).filter(Boolean)

      if (commit.groups.type.toLowerCase() !== 'feat') return null
      if (scopes.some((scope) => ReleaseNotes.hiddenScopes.has(scope.toLowerCase()))) return null

      text = commit.groups.text.trim()
    }

    return text.charAt(0).toUpperCase() + text.slice(1)
  }

  get text() {
    let text = ''

    for (const feature of this.features) {
      const line = `• ${feature}\n`

      if (text.length + line.length > ReleaseNotes.limit) break

      text += line
    }

    return text.trim() || ReleaseNotes.fallback
  }

  write(dir, locales = ['en-US']) {
    mkdirSync(dir, { recursive: true })

    for (const locale of locales) writeFileSync(join(dir, `whatsnew-${locale}`), `${this.text}\n`)
  }
}

const commands = {
  plan({ version, run, prerelease }) {
    const app = new AppVersion()
    const release = new ReleaseVersion(version || app.name, { prerelease })
    const code = run ? app.codeFor(run) : app.code

    if (run && code <= app.code) {
      throw new Error(`Version code ${code} is not above ${app.code} in app.json: raise "baseBuildNumber" in apps/mobile/package.json.`)
    }

    const plan = { version: release.name, version_code: code, tracks: release.tracks().join(',') }

    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(plan).map(([key, value]) => `${key}=${value}\n`).join(''))
    }

    console.log(JSON.stringify(plan, null, 2))
  },

  apply({ version, code }) {
    const release = new ReleaseVersion(version)
    const app = new AppVersion()

    app.write(release.name, Number(code))
    console.log(`app.json: version ${release.name}, versionCode ${code}`)
  },

  notes({ out, ref, 'body-file': bodyFile }) {
    const body = bodyFile && existsSync(bodyFile) ? readFileSync(bodyFile, 'utf8') : ''
    const fromBody = ReleaseNotes.fromBody(body)
    const notes = fromBody.features.length ? fromBody : ReleaseNotes.fromCommits(ref || 'HEAD')

    notes.write(out)
    console.log(notes.text)
  },
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2)
  const { values } = parseArgs({
    args: rest,
    options: {
      version: { type: 'string' },
      run: { type: 'string' },
      code: { type: 'string' },
      prerelease: { type: 'boolean', default: false },
      out: { type: 'string' },
      ref: { type: 'string' },
      'body-file': { type: 'string' },
    },
  })

  if (!commands[command]) {
    console.error('Usage: play-release.mjs plan|apply|notes [options]')
    process.exit(1)
  }

  try {
    commands[command](values)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
