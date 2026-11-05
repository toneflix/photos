import { BaseController } from './BaseController'
import { Space } from '@app/models/Space'
import { SpaceCollection } from '@app/http/resources/SpaceCollection'
import { SpaceResource } from '@app/http/resources/SpaceResource'
import { perPage } from '@arkstack/common'
import { regex } from 'kanun'

const VISIBILITY = `in:${Space.VISIBILITIES.join(',')}`
const SLUG = regex(Space.SLUG)

/**
 * The signed-in creator's spaces.
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

    const space = await Space.open(this.user, data)

    return new SpaceResource(space).additional({ status: 'success', message: 'Space created', code: 201 }).response().setStatusCode(201)
  }

  async show() {
    const space = await this.user.spaces().findOrFail(String(this.params.space))

    return new SpaceResource(space).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const space = await this.user.spaces().findOrFail(String(this.params.space))
    const data = await this.validate({
      name: 'nullable|string|max:80',
      slug: ['nullable', 'string', 'min:3', 'max:60', SLUG, `unique:spaces,slug,${space.slug}`],
      description: 'nullable|string|max:1000',
      visibility: `nullable|${VISIBILITY}`,
    })

    if (data.name) space.name = String(data.name).trim()
    if (data.slug) space.slug = data.slug
    if ('description' in data) space.description = data.description?.trim() || null
    if (data.visibility) space.setVisibility(data.visibility)

    await space.save()

    return new SpaceResource(space).additional({ status: 'success', message: 'Space updated', code: 200 })
  }

  /** Delete the space. Its photos and books stay in the library, outside any space. */
  async destroy() {
    const space = await this.user.spaces().findOrFail(String(this.params.space))

    await space.delete()

    return new SpaceResource(space).additional({ status: 'success', message: 'Space deleted', code: 200 })
  }
}
