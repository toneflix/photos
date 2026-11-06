import { Command } from '@h3ravel/musket'
import { Plan } from '@app/models/Plan'
import { Role } from '@app/models/Role'
import { Subscriptions } from '@app/services/Subscriptions'
import { User } from '@app/models/User'
import { Username } from '@app/support/rules'
import { Validator } from 'kanun'
import { styleText } from 'node:util'

type Choice = { name: string; value: string }

/** Browse accounts page by page and manage the one picked: details, edits, verification, role, plan, suspension and deletion. */
export class ListUsersCommand extends Command {
  signature = `users:list
    {user? : An account id, email or username to manage straight away}
    {--p|perPage=20 : How many accounts to show on each page}
    {--s|search= : Only list accounts whose name, email or username contains this}
  `

  description = 'Browse and manage accounts'

  static readonly EXIT: Choice = { name: styleText('red', '✖ Exit'), value: 'exit' }

  async handle() {
    const handle = this.argument('user')
    const user = handle ? await User.lookup(String(handle)) : await this.pick()

    if (handle && !user) {
      this.error(`No account matches ${handle}.`)

      return
    }

    if (user) await this.manage(user)
  }

  /** Page through the accounts until one is picked, or null on exit. */
  async pick(): Promise<User | null> {
    const search = String(this.option('search') ?? '').trim()
    const perPage = Math.min(100, Math.max(1, Number(this.option('perPage')) || 20))

    let page = 1

    while (true) {
      const users = await User.query()
        .when(search, (query) => query.scope('matching', search))
        .latest('createdAt')
        .paginate(perPage, page)

      if (users.meta.total < 1) {
        this.error(search ? `No accounts match ${search}.` : 'There are no accounts yet.')

        return null
      }

      const choices: Choice[] = users.data.all().map((user) => ({ name: this.label(user), value: user.id }))

      if (page > 1) choices.unshift({ name: styleText('green', '← Previous page'), value: 'previous' })
      if (page < users.meta.lastPage) choices.push({ name: styleText('green', 'Next page →'), value: 'next' })

      choices.push(ListUsersCommand.EXIT)

      const picked = await this.choice(`Pick an account (page ${page} of ${users.meta.lastPage}, ${users.meta.total} in all):`, choices)

      if (picked === 'exit') return null
      if (picked === 'next') page++
      else if (picked === 'previous') page--
      else return users.data.all().find((user) => user.id === picked) ?? null
    }
  }

  /** Offer the account's actions until the operator exits or deletes it. */
  async manage(user: User): Promise<void> {
    while (true) {
      const action = await this.choice(`${this.label(user)} (${user.role ?? Role.MEMBER}):`, [
        { name: 'Details', value: 'details' },
        { name: 'Edit', value: 'edit' },
        user.hasVerifiedEmail() ? { name: 'Unverify email', value: 'unverify' } : { name: 'Verify email', value: 'verify' },
        ...(user.hasVerifiedEmail() ? [] : [{ name: 'Send verification email', value: 'send-verification' }]),
        { name: 'Change role', value: 'role' },
        { name: 'Change plan', value: 'plan' },
        user.isSuspended() ? { name: 'Reinstate', value: 'reinstate' } : { name: 'Suspend', value: 'suspend' },
        { name: 'Delete', value: 'delete' },
        ListUsersCommand.EXIT,
      ])

      if (action === 'exit') return
      if (action === 'details') await this.details(user)
      if (action === 'edit') await this.edit(user)
      if (action === 'verify') await this.verify(user, true)
      if (action === 'unverify') await this.verify(user, false)
      if (action === 'send-verification') await this.sendVerification(user)
      if (action === 'role') await this.changeRole(user)
      if (action === 'plan') await this.changePlan(user)
      if (action === 'suspend') await this.suspend(user, true)
      if (action === 'reinstate') await this.suspend(user, false)
      if (action === 'delete' && (await this.delete(user))) return
    }
  }

  async details(user: User): Promise<void> {
    const [plan, photos, books, spaces, twoFactor, session] = await Promise.all([
      user.plan(),
      user.photos().count(),
      user.createdBooks().count(),
      user.spaces().count(),
      user.twoFactor().first(),
      user.personalAccessTokens().latest('lastUsedAt').first(),
    ])

    const fields: Array<[string, string]> = [
      ['ID', user.id],
      ['Name', user.name],
      ['Username', `@${user.username}`],
      ['Email', user.email],
      ['Email verified', user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : 'No'],
      ['Role', user.role ?? Role.MEMBER],
      ['Plan', plan.name],
      ['Suspended', user.suspendedAt ? user.suspendedAt.toISOString() : 'No'],
      ['Two-factor', twoFactor?.getAttribute('enabledAt') ? 'On' : 'Off'],
      ['Photos', String(photos)],
      ['Books made', String(books)],
      ['Spaces', String(spaces)],
      ['Joined', user.createdAt.toISOString()],
      ['Last active', session?.lastUsedAt ? session.lastUsedAt.toISOString() : 'Never'],
    ]

    const width = Math.max(...fields.map(([label]) => label.length))

    for (const [label, value] of fields) this.line(`${styleText(['cyan', 'bold'], label.padEnd(width))}  ${value}`)
  }

  /** Change one field at a time, checked with the same rules as the account settings. */
  async edit(user: User): Promise<void> {
    const fields: Choice[] = [
      { name: 'Name', value: 'name' },
      { name: 'Username', value: 'username' },
      { name: 'Email', value: 'email' },
      { name: 'Password', value: 'password' },
      ListUsersCommand.EXIT,
    ]

    let field = await this.choice('Which field do you want to change?', fields)

    while (field !== 'exit') {
      const value = field === 'password' ? await this.secret('New password:', '*') : await this.ask(`New ${field}:`, String(user.getAttribute(field) ?? ''))

      try {
        await this.update(user, field, value.trim())
        this.success(`Changed the ${field} of ${user.name}.`)
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error))
      }

      field = await this.choice('Which field do you want to change?', fields)
    }
  }

  async update(user: User, field: string, value: string): Promise<void> {
    if (field === 'name') {
      await Validator.make({ name: value }, { name: 'required|string|max:191' }).validate()
      await user.update({ name: value })

      return
    }

    if (field === 'username') {
      const username = value.toLowerCase()

      await Validator.make({ username }, { username: ['required', 'string', new Username(), `unique:users,username,${user.username}`] }).validate()
      await user.update({ username })

      return
    }

    if (field === 'email') {
      const email = String(User.normalizeEmail(value))

      if (email === user.email) return

      await Validator.make({ email }, { email: 'required|email|max:191|unique:users,email' }).validate()
      await user.changeEmail(email).catch(() => this.warn('The address changed, but the emails about it could not be sent.'))

      return
    }

    await Validator.make({ password: value }, { password: 'required|string|min:8|max:191' }).validate()
    await user.changePassword(value).catch(() => this.warn('The password changed, but the email about it could not be sent.'))
  }

  async verify(user: User, verified: boolean): Promise<void> {
    if (verified) await user.markEmailVerified()
    else await user.update({ emailVerifiedAt: null })

    this.success(`${user.email} is now ${verified ? 'verified' : 'unverified'}.`)
  }

  async sendVerification(user: User): Promise<void> {
    try {
      await user.sendVerificationEmail()
      this.success(`Sent a verification link to ${user.email}.`)
    } catch (error) {
      this.error(`Could not send the email: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async changeRole(user: User): Promise<void> {
    const roles = (await Role.query().get()).all()
    const slug = await this.choice(
      'Which role?',
      roles.map((role) => ({ name: `${role.name} (${role.slug})`, value: role.slug })),
      Math.max(0, roles.findIndex((role) => role.slug === user.role)),
    )

    const role = roles.find((known) => known.slug === slug)!

    await user.update({ role: role.slug })

    this.success(`${user.name} is now ${role.name}.`)
  }

  /** Put the account on a plan without payment. The default plan ends any paid time. */
  async changePlan(user: User): Promise<void> {
    const plans = (await Plan.query().get()).all()

    if (!plans.length) {
      this.error('There are no plans yet. Run `ark seed PlanSeeder` first.')

      return
    }

    const slug = await this.choice(
      'Which plan?',
      plans.map((plan) => ({ name: `${plan.name} (${plan.slug})`, value: plan.slug })),
    )

    const plan = plans.find((known) => known.slug === slug)!

    if (plan.isDefault) {
      await Subscriptions.end(user)
      this.success(`${user.name} is now on ${plan.name}.`)

      return
    }

    const cycles = Math.max(1, Number(await this.ask('How many billing periods?', '1')) || 1)
    const period = await Subscriptions.assign(user, plan, cycles)

    this.success(`${user.name} is on ${plan.name} until ${period.endsAt.toISOString()}.`)
  }

  async suspend(user: User, suspended: boolean): Promise<void> {
    if (suspended) await user.suspend()
    else await user.reinstate()

    this.success(`${user.name} is ${suspended ? 'suspended and signed out everywhere' : 'reinstated'}.`)
  }

  /** Delete the account and everything it owns once confirmed. Returns whether it was deleted. */
  async delete(user: User): Promise<boolean> {
    const confirmed = await this.confirm(`Delete ${user.name} <${user.email}> with all their books and photos? This cannot be undone.`, false)

    if (!confirmed) {
      this.info('Nothing was deleted.')

      return false
    }

    await user.remove()

    this.success(`Deleted ${user.name} <${user.email}> and everything they owned.`)

    return true
  }

  /** The account's name and email, with a tick when the email is verified and a note when suspended. */
  label(user: User): string {
    const verified = user.hasVerifiedEmail() ? ` ${styleText('green', '✔')}` : ''
    const suspended = user.isSuspended() ? ` ${styleText('red', '(suspended)')}` : ''

    return `${user.name} <${user.email}>${verified}${suspended}`
  }
}
