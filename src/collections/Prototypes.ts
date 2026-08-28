import type { CollectionConfig, Field } from 'payload'

import {
  adminFieldAccess,
  draftOnlyForEditors,
  isAdmin,
  isStaff,
  publishedOrStaff,
  staffFieldAccess,
} from '@/access/roles'
import {
  normalizePrototypeSlug,
  revalidatePrototypeAfterChange,
  revalidatePrototypeAfterDelete,
  validatePrototypeBeforeChange,
} from '@/hooks/prototypes'
import { validateHttpUrl, validateSlug } from '@/lib/validation/content'

const adminOnly = {
  create: adminFieldAccess,
  read: adminFieldAccess,
  update: adminFieldAccess,
}

const reviewedURLField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  maxLength: 2048,
  validate: validateHttpUrl,
})

export const Prototypes: CollectionConfig = {
  slug: 'prototypes',
  access: {
    create: isStaff,
    delete: isAdmin,
    read: publishedOrStaff,
    update: draftOnlyForEditors,
  },
  admin: {
    defaultColumns: [
      'title',
      'status',
      'availabilityStatus',
      'launchApproval',
      'featured',
      '_status',
    ],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      maxLength: 100,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      maxLength: 100,
      required: true,
      unique: true,
      validate: validateSlug,
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 280,
      required: true,
    },
    {
      name: 'story',
      type: 'textarea',
      maxLength: 3000,
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      dbName: 'prototype_lifecycle',
      defaultValue: 'concept',
      index: true,
      options: [
        { label: 'Concept', value: 'concept' },
        { label: 'Prototype', value: 'prototype' },
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta' },
        { label: 'Live', value: 'live' },
        { label: 'Archived', value: 'archived' },
      ],
      required: true,
    },
    {
      name: 'problem',
      type: 'textarea',
      maxLength: 800,
    },
    {
      name: 'decisions',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          maxLength: 100,
          required: true,
        },
        {
          name: 'detail',
          type: 'textarea',
          maxLength: 500,
          required: true,
        },
      ],
      maxRows: 6,
    },
    {
      name: 'limitations',
      type: 'array',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          maxLength: 300,
          required: true,
        },
      ],
      maxRows: 10,
    },
    {
      name: 'dataClassification',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'No visitor data', value: 'none' },
        { label: 'Synthetic only', value: 'synthetic-only' },
        { label: 'Non-sensitive', value: 'non-sensitive' },
        { label: 'Account data', value: 'account-data' },
        { label: 'Sensitive', value: 'sensitive' },
      ],
      required: true,
    },
    {
      name: 'safetyNotice',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'dataHandlingNotes',
      type: 'textarea',
      maxLength: 1000,
    },
    reviewedURLField('appUrl', 'Application URL'),
    reviewedURLField('sourceUrl', 'Source URL'),
    {
      name: 'sourceProvenance',
      type: 'group',
      fields: [
        reviewedURLField('repositoryUrl', 'Canonical repository URL'),
        {
          name: 'repositoryOwner',
          type: 'text',
          maxLength: 100,
        },
        {
          name: 'repositoryName',
          type: 'text',
          maxLength: 100,
        },
        {
          name: 'relation',
          type: 'select',
          options: [
            { label: 'Organization owned', value: 'organization_owned' },
            { label: 'Personal original', value: 'personal_original' },
            { label: 'Fork', value: 'fork' },
            { label: 'External contribution', value: 'external_contribution' },
          ],
        },
        {
          name: 'licenseSpdxExpression',
          type: 'select',
          dbName: 'prototype_license',
          options: [
            { label: 'MIT', value: 'MIT' },
            { label: 'Apache-2.0', value: 'Apache-2.0' },
            {
              label: 'PolyForm-Noncommercial-1.0.0',
              value: 'PolyForm-Noncommercial-1.0.0',
            },
            { label: 'No assertion', value: 'NOASSERTION' },
            { label: 'Other reviewed expression', value: 'OTHER-REVIEWED' },
          ],
        },
        {
          name: 'sourceLastCheckedAt',
          type: 'date',
        },
        {
          name: 'sourceReviewStatus',
          type: 'select',
          dbName: 'prototype_source_review',
          defaultValue: 'unreviewed',
          options: [
            { label: 'Unreviewed', value: 'unreviewed' },
            { label: 'Metadata only', value: 'metadata_only' },
            { label: 'Reviewed', value: 'reviewed' },
            { label: 'Blocked', value: 'blocked' },
          ],
        },
      ],
    },
    {
      name: 'availabilityStatus',
      type: 'select',
      defaultValue: 'unchecked',
      index: true,
      options: [
        { label: 'Unchecked', value: 'unchecked' },
        { label: 'Available', value: 'available' },
        { label: 'Degraded', value: 'degraded' },
        { label: 'Unavailable', value: 'unavailable' },
        { label: 'Retired', value: 'retired' },
      ],
      required: true,
    },
    {
      name: 'availabilityMessage',
      type: 'textarea',
      maxLength: 300,
    },
    {
      name: 'availabilityCheckedAt',
      type: 'date',
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'featuredOrder',
      type: 'number',
      max: 999,
      min: 0,
    },
    {
      name: 'featureUntil',
      type: 'date',
    },
    {
      name: 'launchedAt',
      type: 'date',
    },
    {
      name: 'lastVerifiedAt',
      type: 'date',
    },
    reviewedURLField('privacyUrl', 'Privacy URL'),
    reviewedURLField('termsUrl', 'Terms URL'),
    {
      name: 'serviceExpectations',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'evidenceSources',
      type: 'relationship',
      access: {
        create: staffFieldAccess,
        read: staffFieldAccess,
        update: staffFieldAccess,
      },
      hasMany: true,
      relationTo: 'evidence-sources',
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'metaTitle',
          type: 'text',
          maxLength: 60,
        },
        {
          name: 'metaDescription',
          type: 'textarea',
          maxLength: 160,
        },
        {
          name: 'socialImage',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'noIndex',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'launchApproval',
      type: 'select',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      defaultValue: 'not-reviewed',
      options: [
        { label: 'Not reviewed', value: 'not-reviewed' },
        { label: 'Approved', value: 'approved' },
        { label: 'Blocked', value: 'blocked' },
      ],
      required: true,
    },
    {
      name: 'launchReviewer',
      type: 'relationship',
      access: adminOnly,
      relationTo: 'users',
    },
    {
      name: 'launchApprovedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'authReviewedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'securityReviewedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'monitoringVerifiedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'restoreTestedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'rollbackTestedAt',
      type: 'date',
      access: adminOnly,
    },
    {
      name: 'renderServiceId',
      type: 'text',
      access: adminOnly,
      maxLength: 200,
    },
    {
      name: 'operationalNotes',
      type: 'textarea',
      access: adminOnly,
      maxLength: 2000,
    },
  ],
  hooks: {
    afterChange: [revalidatePrototypeAfterChange],
    afterDelete: [revalidatePrototypeAfterDelete],
    beforeChange: [validatePrototypeBeforeChange],
    beforeValidate: [normalizePrototypeSlug],
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
