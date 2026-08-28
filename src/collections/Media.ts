import path from 'node:path'
import type { CollectionConfig } from 'payload'

import {
  draftOnlyForEditors,
  isAdmin,
  isStaff,
  publishedOrStaff,
} from '@/access/roles'
import { validateMediaBeforeChange } from '@/hooks/media'
import { validateHttpUrl } from '@/lib/validation/content'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: isStaff,
    delete: isAdmin,
    read: publishedOrStaff,
    update: draftOnlyForEditors,
  },
  admin: {
    defaultColumns: ['filename', 'alt', 'usageRights', '_status', 'updatedAt'],
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      maxLength: 300,
      required: true,
    },
    {
      name: 'caption',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'credit',
      type: 'text',
      maxLength: 200,
    },
    {
      name: 'sourceUrl',
      type: 'text',
      maxLength: 2048,
      validate: validateHttpUrl,
    },
    {
      name: 'usageRights',
      type: 'select',
      options: [
        { label: 'Owned', value: 'owned' },
        { label: 'Licensed', value: 'licensed' },
        { label: 'Public domain', value: 'public-domain' },
        { label: 'Third-party permission', value: 'third-party-permission' },
      ],
      required: true,
    },
  ],
  hooks: {
    beforeChange: [validateMediaBeforeChange],
  },
  upload: {
    disableLocalStorage: process.env.NODE_ENV === 'production',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        height: 300,
        position: 'centre',
        width: 480,
        withoutEnlargement: true,
      },
      {
        name: 'card',
        height: 750,
        position: 'centre',
        width: 1200,
        withoutEnlargement: true,
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    pasteURL: false,
    staticDir: path.resolve(process.cwd(), 'media'),
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
