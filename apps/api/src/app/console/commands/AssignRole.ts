import { Role, type UserRole } from '@app/policies/Role'
import { Command } from '@h3ravel/musket'
import { User } from '@app/models/User'

/** Gives an account a role, e.g. to make the first admin. */
export class AssignRoleCommand extends Command {
  signature = `users:role
    {email : The account email}
    {role : user, moderator or admin}
  `

  description = 'Give an account a role'

  async handle() {
    const email = String(User.normalizeEmail(this.argument('email')))
    const role = String(this.argument('role')) as UserRole

    if (!Role.NAMES.includes(role)) {
      this.error(`Pick a role from ${Role.NAMES.join(', ')}.`)

      return
    }

    const user = await User.query().where({ email }).first()

    if (!user) {
      this.error(`No account uses ${email}.`)

      return
    }

    await user.update({ role })

    this.success(`${user.name} <${user.email}> is now ${role === 'admin' ? 'an' : 'a'} ${role}.`)
  }
}
