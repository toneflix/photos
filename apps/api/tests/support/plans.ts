import { execFileSync } from 'node:child_process'

const ark = (...args: string[]) => execFileSync('npx', ['ark', ...args], { cwd: process.cwd(), encoding: 'utf8' })

let seeded = false

/** Create the Free and Premium plans unless they exist. */
export const seedPlans = () => {
  if (!seeded) ark('seed', 'PlanSeeder')

  seeded = true
}

/** Put an account on a seeded plan. */
export const putOnPlan = (email: string, plan = 'premium') => {
  seedPlans()

  return ark('users:plan', email, plan)
}
