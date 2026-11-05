import { TwoFactor as BaseTwoFactor } from '@arkstack/auth'

/**
 * Arkstack's two-factor store. Recovery-code hashes are written as a JSON string
 * because the upstream upsert skips model casts, and Postgres rejects a raw array
 * in a json column.
 */
export class TwoFactor extends BaseTwoFactor {
  static override async writeRecoveryCodeHashes(userId: string, hashes: string[]): Promise<void> {
    await super.writeRecoveryCodeHashes(userId as never, JSON.stringify(hashes) as never)
  }
}
