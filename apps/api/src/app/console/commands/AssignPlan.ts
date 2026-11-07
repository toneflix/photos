import { Command } from '@h3ravel/musket'
import { Plan } from '@app/models/Plan'
import { Subscriptions } from '@app/services/Subscriptions'
import { User } from '@app/models/User'

/** Puts an account on a plan without payment. The default plan ends any paid time. */
export class AssignPlanCommand extends Command {
  signature = `users:plan
    {email : The account email}
    {plan : A plan slug, such as free or premium}
    {--cycles=1 : How many billing periods to give}
  `

  description = 'Put an account on a plan'

  async handle() {
    const email = String(User.normalizeEmail(this.argument('email')))
    const plan = await Plan.query().where({ slug: String(this.argument('plan')) }).first()

    if (!plan) {
      const slugs = (await Plan.scope('ordered').get()).all().map((known) => known.slug)

      this.error(slugs.length ? `Pick a plan from ${slugs.join(', ')}.` : 'There are no plans yet. Run `ark seed PlanSeeder` first.')

      return
    }

    const user = await User.query().where({ email }).first()

    if (!user) {
      this.error(`No account uses ${email}.`)

      return
    }

    if (plan.isDefault) {
      await Subscriptions.end(user)
      this.success(`${user.name} <${user.email}> is now on ${plan.name}.`)

      return
    }

    const period = await Subscriptions.assign(user, plan, Math.max(1, Number(this.option('cycles')) || 1))

    this.success(`${user.name} <${user.email}> is on ${plan.name} until ${period.endsAt.toISOString()}.`)
  }
}
