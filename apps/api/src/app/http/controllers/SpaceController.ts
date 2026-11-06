import { BaseController } from './BaseController'
import { Space } from '@app/models/Space'
import { SpaceCollection } from '@app/http/resources/SpaceCollection'
import { SpaceResource } from '@app/http/resources/SpaceResource'
import { perPage } from '@arkstack/common'
import { regex } from 'kanun'
import { Limits } from '@app/policies/Limits'
import { SpaceAccess } from '@app/policies/SpaceAccess'
import { abortIf } from '@arkstack/common'

const VISIBILITY = `in:${Space.VISIBILITIES.join(',')}`
const SLUG = regex(Space.SLUG)

/**
 * The signed-in creator's spaces. Members with `manage` can open and rename them too;
 * only the owner changes the web address, visibility, or deletes one.
 */
export default class SpaceController extends BaseController {
  async index() {
    const spaces = await this.user
      .spaces()
      .oldest('createdAt')
      .paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new SpaceCollection(spaces).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async create() {
    const data = await this.validate({
      name: 'required|string|max:80',
      slug: ['nullable', 'string', 'min:3', 'max:60', SLUG, 'unique:spaces,slug'],
      description: 'nullable|string|max:1000',
      visibility: `nullable|${VISIBILITY}`,
    })

    const limits = await Limits.for(this.user)

    await limits.ensureCanCreateSpace()
    await limits.ensureSpaceVisibility(data.visibility)

    const space = await Space.open(this.user, data)

    return new SpaceResource(space).additional({ status: 'success', message: 'Space created', code: 201 }).response().setStatusCode(201)
  }

  async show() {
    const { space } = (await SpaceAccess.find(String(this.params.space), this.user)).authorize('manage')

    return new SpaceResource(space).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const access = (await SpaceAccess.find(String(this.params.space), this.user)).authorize('manage')
    const space = access.space
    const data = await this.validate({
      name: 'nullable|string|max:80',
      slug: ['nullable', 'string', 'min:3', 'max:60', SLUG, `unique:spaces,slug,${space.slug}`],
      description: 'nullable|string|max:1000',
      visibility: `nullable|${VISIBILITY}`,
    })

    const ownerOnly = (!!data.slug && data.slug !== space.slug) || (!!data.visibility && data.visibility !== space.visibility)

    abortIf(ownerOnly && !access.isOwner, 'Only the space owner can change its web address or who can open it.', 403)

    if (data.visibility !== space.visibility) await (await Limits.for(this.user)).ensureSpaceVisibility(data.visibility)

    if (data.name) space.name = String(data.name).trim()
    if (data.slug) space.slug = data.slug
    if ('description' in data) space.description = data.description?.trim() || null
    if (data.visibility) space.setVisibility(data.visibility)

    await space.save()

    return new SpaceResource(space).additional({ status: 'success', message: 'Space updated', code: 200 })
  }

  /** Delete the space. Its photos and books stay in the library, outside any space. */
  async destroy() {
    const space = await this.user
      .spaces()
      .scope('handle', String(this.params.space))
      .firstOrFail()

    await space.delete()

    return new SpaceResource(space).additional({ status: 'success', message: 'Space deleted', code: 200 })
  }
}
