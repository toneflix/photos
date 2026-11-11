import { router } from 'expo-router'
import { AuthFrame } from '@/components/AuthFrame'
import { CodeForm } from '@/components/access/CodeForm'
import { Text } from '@/components/ui'
import { useSession } from '@/lib/session'

/** Open a private book someone shared with an access code. Works signed in or out. */
export default function Unlock() {
  const { user } = useSession()

  return (
    <AuthFrame
      title="Open a book with a code"
      subtitle={
        <>
          Someone shared a private photobook with you? Enter the code they gave you.{' '}
          <Text variant="link" onPress={() => router.replace(user ? '/explore' : '/discover')}>
            Or browse public books
          </Text>
        </>
      }
    >
      <CodeForm onOpened={(id) => router.replace({ pathname: '/books/[id]', params: { id } })} />
    </AuthFrame>
  )
}
