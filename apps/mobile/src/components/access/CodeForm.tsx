import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Callout, Field, Input } from '@/components/ui'
import { api } from '@/lib/api'
import { bookCodes } from '@/lib/book-codes'
import { FormProblem } from '@/lib/forms'
import { fonts } from '@/theme'

/** Type an access code to open a private book. Remembers the code and reports which book it opened. */
export function CodeForm({ onOpened, initial = '' }: { onOpened: (bookId: string) => void; initial?: string }) {
  const [code, setCode] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = async () => {
    setBusy(true)
    setError(null)

    try {
      const { data: grant } = await api.accessCodes.redeem(code.trim()).send()

      await bookCodes.remember(grant.book.id, grant.code)
      onOpened(grant.book.id)
    } catch (problem) {
      setError(FormProblem.from(problem).message ?? 'That access code is not valid or has expired.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {error ? <Callout>{error}</Callout> : null}
      <Field label="Access code" hint="Like K7QM-4XTP. Capitals and the dash don't matter.">
        <Input
          value={code}
          onChangeText={(text) => setCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={20}
          placeholder="K7QM-4XTP"
          style={styles.code}
          onSubmitEditing={open}
          returnKeyType="go"
        />
      </Field>
      <Button title={busy ? 'Opening…' : 'Open book'} size="lg" loading={busy} disabled={!code.trim()} onPress={open} />
    </>
  )
}

const styles = StyleSheet.create({
  code: { fontFamily: fonts.semibold, letterSpacing: 3 },
})
