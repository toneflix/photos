import type { PersonalAccessToken } from '@app/models/PersonalAccessToken'
import { Resource } from 'resora'
import type { SessionDeviceInfo } from '@arkstack/auth'

/** A signed-in device, as listed in security settings. */
export class SessionResource extends Resource {
  private currentToken: string | null = null

  current(token: string | null) {
    this.currentToken = token

    return this
  }

  data() {
    const session = this.resource as PersonalAccessToken
    const device = (session.deviceInfo ?? {}) as Partial<SessionDeviceInfo>

    return {
      id: session.id,
      name: session.name,
      browser: device.browser ?? null,
      os: device.os ?? null,
      deviceType: device.deviceType ?? 'unknown',
      ipAddress: device.ipAddress ?? null,
      current: !!this.currentToken && session.token === this.currentToken,
      lastUsedAt: session.lastUsedAt ?? null,
      createdAt: session.createdAt,
    }
  }
}
