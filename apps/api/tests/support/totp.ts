import { createHmac } from 'node:crypto'

/** The code an authenticator app would show for a base32 secret, `steps` 30-second periods from now. */
export const totp = (secret: string, steps = 0) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...secret].map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0')).join('')
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)))
  const counter = Buffer.alloc(8)

  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + steps))

  const hash = createHmac('sha1', key).update(counter).digest()
  const offset = hash[hash.length - 1] & 15

  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

/** A code the API is sure to refuse: none of the codes it accepts, one period either side of now. */
export const wrongCode = (secret: string) => {
  const accepted = [-2, -1, 0, 1, 2].map((steps) => totp(secret, steps))

  return ['000000', '111111', '222222', '333333', '444444', '555555'].find((code) => !accepted.includes(code))!
}
