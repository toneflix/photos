import { useState } from 'react'
import { FormProblem } from './forms'

/** Runs one change at a time, keeping what it said when done or what went wrong. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(() => FormProblem.from(null))
  const [message, setMessage] = useState<string | null>(null)

  const run = async (task: () => Promise<string | null | void>) => {
    setBusy(true)
    setProblem(FormProblem.from(null))
    setMessage(null)

    try {
      setMessage((await task()) ?? null)

      return true
    } catch (error) {
      setProblem(FormProblem.from(error))

      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, problem, message, run }
}
