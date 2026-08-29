import type { CollectionConfig } from 'payload'

import { draftOnlyForEditors, isAdmin, isStaff, publishedOrStaff } from '@/access/roles'
import {
  claimsField,
  derivedReviewFields,
  evidenceSourcesField,
  publicationReviewFields,
  relationshipOptions,
  seoField,
} from '@/fields/proofContent'
import { normalizeProofSlug, validateProofBeforeChange } from '@/hooks/proofContent'
import { validateSlug } from '@/lib/validation/content'

export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
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
      'relationship',
      'publicContentType',
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
      maxLength: 140,
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
      name: 'summary',
      type: 'textarea',
      maxLength: 320,
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      maxLength: 6000,
      required: true,
    },
    {
      name: 'organization',
      type: 'text',
      maxLength: 140,
      required: true,
    },
    {
      name: 'relationship',
      type: 'select',
      index: true,
      options: relationshipOptions.map((option) => ({ ...option })),
      required: true,
    },
    {
      name: 'publicContentType',
      type: 'select',
      defaultValue: 'experience_profile',
      options: [
        { label: 'Case study', value: 'case_study' },
        { label: 'Experience profile', value: 'experience_profile' },
        { label: 'Contribution profile', value: 'contribution_profile' },
        { label: 'Research profile', value: 'research_profile' },
      ],
      required: true,
    },
    {
      name: 'role',
      type: 'text',
      maxLength: 140,
    },
    {
      name: 'timeframe',
      type: 'text',
      maxLength: 100,
    },
    {
      name: 'situation',
      type: 'textarea',
      maxLength: 1200,
    },
    {
      name: 'responsibility',
      type: 'textarea',
      maxLength: 1200,
    },
    {
      name: 'decisions',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          maxLength: 120,
          required: true,
        },
        {
          name: 'detail',
          type: 'textarea',
          maxLength: 700,
          required: true,
        },
      ],
      maxRows: 10,
    },
    {
      name: 'outcome',
      type: 'textarea',
      admin: {
        description: 'Do not enter an outcome or metric that lacks claim-specific evidence.',
      },
      maxLength: 1200,
    },
    {
      name: 'capabilities',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          maxLength: 100,
          required: true,
        },
      ],
      maxRows: 16,
    },
    {
      name: 'technologies',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          maxLength: 100,
          required: true,
        },
      ],
      maxRows: 24,
    },
    evidenceSourcesField(),
    claimsField(),
    ...derivedReviewFields(),
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      max: 999,
      min: 0,
    },
    seoField(),
    ...publicationReviewFields(),
  ],
  hooks: {
    beforeChange: [validateProofBeforeChange('case-study')],
    beforeValidate: [normalizeProofSlug],
  },
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
