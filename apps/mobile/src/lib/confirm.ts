import { Alert } from 'react-native'

/** Asks before something that can't be undone. Resolves true when the person goes ahead. */
export function confirm(title: string, message: string, action: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  )
}
