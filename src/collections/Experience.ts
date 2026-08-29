import type { CollectionConfig } from 'payload'

import { draftOnlyForEditors, isAdmin, isStaff, publishedOrStaff } from '@/access/roles'
import {
  claimsField,
  derivedReviewFields,
  evidenceSourcesField,
  publicationReviewFields,
  relationshipOptions,
} from '@/fields/proofContent'
import { normalizeProofSlug, validateProofBeforeChange } from '@/hooks/proofContent'
import { validateSlug } from '@/lib/validation/content'

export const Experience: CollectionConfig = {
  slug: 'experience',
  access: {
    create: isStaff,
    delete: isAdmin,
    read: publishedOrStaff,
    update: draftOnlyForEditors,
  },
  admin: {
    defaultColumns: [
      'title',
      'organization',
      'role',
      'relationship',
      'visibility',
      'claimStatus',
      'publicationApproval',
      '_status',
    ],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      maxLength: 160,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      maxLength: 120,
      required: true,
      unique: true,
      validate: validateSlug,
    },
    {
      name: 'organization',
      type: 'text',
      maxLength: 140,
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      maxLength: 140,
      required: true,
    },
    {
      name: 'startDate',
      type: 'date',
      admin: {
        description: 'Optional until an exact month or date is reviewed.',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        description: 'Leave empty for an ongoing role or an unverified exact date.',
      },
    },
    {
      name: 'timeframe',
      type: 'text',
      admin: {
        description: 'Reviewed display wording; do not infer missing dates.',
      },
      maxLength: 100,
    },
    {
      name: 'relationship',
      type: 'select',
      index: true,
      options: relationshipOptions.map((option) => ({ ...option })),
      required: true,
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 700,
      required: true,
    },
    {
      name: 'selectedWork',
      type: 'array',
      fields: [
        {
          name: 'text',
          type: 'textarea',
          maxLength: 500,
          required: true,
        },
      ],
      maxRows: 12,
    },
    evidenceSourcesField(),
    claimsField(),
    ...derivedReviewFields(),
    {
      name: 'displayOrder',
      type: 'number',
      max: 999,
      min: 0,
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'about',
      index: true,
      options: [
        { label: 'About timeline', value: 'about' },
        { label: 'Homepage and About', value: 'homepage-and-about' },
        { label: 'Hidden draft', value: 'hidden' },
      ],
      required: true,
    },
    {
      name: 'relatedCaseStudy',
      type: 'relationship',
      relationTo: 'case-studies',
    },
    ...publicationReviewFields(),
  ],
  hooks: {
    beforeChange: [validateProofBeforeChange('experience')],
    beforeValidate: [normalizeProofSlug],
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
