import { useState } from 'react'
import { FormProblem } from './forms'
import { toast } from './toast'

/** Runs one change at a time. What it says when done shows as a toast; what went wrong stays for the form. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(() => FormProblem.from(null))

  const run = async (task: () => Promise<string | null | void>) => {
    setBusy(true)
    setProblem(FormProblem.from(null))

    try {
      const message = await task()

      if (message) toast.show(message)

      return true
    } catch (error) {
      setProblem(FormProblem.from(error))

      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, problem, run }
}
