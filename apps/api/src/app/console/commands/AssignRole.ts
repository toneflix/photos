import { Command } from '@h3ravel/musket'
import { Role } from '@app/models/Role'
import { User } from '@app/models/User'

/** Gives an account a role, e.g. to make the first admin. */
export class AssignRoleCommand extends Command {
  signature = `users:role
    {email : The account email}
    {role : A role slug, such as user, moderator or admin}
  `

  description = 'Give an account a role'

  async handle() {
    const email = String(User.normalizeEmail(this.argument('email')))
    const role = await Role.query().where({ slug: String(this.argument('role')) }).first()

    if (!role) {
      const slugs = (await Role.query().get()).all().map((known) => known.slug)

      this.error(`Pick a role from ${slugs.join(', ')}.`)

      return
    }

    const user = await User.query().where({ email }).first()

    if (!user) {
      this.error(`No account uses ${email}.`)

      return
    }

    await user.update({ role: role.slug })

    this.success(`${user.name} <${user.email}> is now ${role.name}.`)
  }
}
