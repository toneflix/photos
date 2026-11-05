import { useMemo } from 'react'
import QRCode from 'qrcode'
import Svg, { Path } from 'react-native-svg'
import { colors } from '@/theme'

/** A QR code for `value`, drawn as one path of dark squares. */
export function QrCode({ value, size }: { value: string; size: number }) {
  const { count, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' })
    let d = ''

    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`
      }
    }

    return { count: modules.size, path: d }
  }, [value])

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="QR code for your authenticator app">
      <Path d={path} fill={colors.ink900} />
    </Svg>
  )
}
