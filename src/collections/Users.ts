import type { CollectionConfig } from 'payload'

import { adminFieldAccess, isAdmin, ownUserOrAdmin } from '@/access/roles'
import { protectAdminDeletion, protectUserRoles } from '@/hooks/users'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: ownUserOrAdmin,
    update: ownUserOrAdmin,
  },
  admin: {
    defaultColumns: ['email', 'name', 'role', 'updatedAt'],
    useAsTitle: 'email',
  },
  auth: {
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
    lockTime: 600_000,
    maxLoginAttempts: 5,
    tokenExpiration: 28_800,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      maxLength: 120,
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      defaultValue: 'editor',
      options: [
        { label: 'Administrator', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      required: true,
      saveToJWT: true,
    },
    {
      name: 'lastSecurityReviewAt',
      type: 'date',
      access: {
        create: adminFieldAccess,
        read: adminFieldAccess,
        update: adminFieldAccess,
      },
    },
  ],
  hooks: {
    beforeChange: [protectUserRoles],
    beforeDelete: [protectAdminDeletion],
  },
}
