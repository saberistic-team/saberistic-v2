import type { Field } from 'payload'

import { adminFieldAccess, staffFieldAccess } from '@/access/roles'
import { validateSlug } from '@/lib/validation/content'

export const relationshipOptions = [
  { label: 'Prior employer role', value: 'employment' },
  { label: 'Contract role', value: 'contract' },
  { label: 'Founder venture', value: 'founder' },
  { label: 'Team role', value: 'team_role' },
  { label: 'Saberistic engagement', value: 'saberistic_engagement' },
  { label: 'Sanitized diagnostic', value: 'sanitized_diagnostic' },
  { label: 'Independent project', value: 'independent' },
  { label: 'Open-source contribution', value: 'open_source' },
  { label: 'Research', value: 'research' },
] as const

export const claimStatusOptions = [
  { label: 'Publicly corroborated', value: 'publicly_corroborated' },
  { label: 'Founder provided', value: 'founder_provided' },
  { label: 'Hold', value: 'hold' },
] as const

export const claimPermissionOptions = [
  { label: 'Public', value: 'public' },
  { label: 'Approval required', value: 'approval-required' },
  { label: 'Private only', value: 'private-only' },
] as const

export const claimSurfaceOptions = [
  { label: 'Homepage', value: 'homepage' },
  { label: 'Work', value: 'work' },
  { label: 'About', value: 'about' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Private only', value: 'private-only' },
] as const

const adminOnly = {
  create: adminFieldAccess,
  read: adminFieldAccess,
  update: adminFieldAccess,
}

export const evidenceSourcesField = (): Field => ({
  name: 'evidenceSources',
  type: 'relationship',
  access: {
    create: staffFieldAccess,
    read: staffFieldAccess,
    update: staffFieldAccess,
  },
  hasMany: true,
  relationTo: 'evidence-sources',
})

export const claimsField = (): Field => ({
  name: 'claims',
  type: 'array',
  admin: {
    description:
      'Material public statements must be reviewed individually and linked to exact evidence.',
  },
  fields: [
    {
      name: 'claimId',
      type: 'text',
      maxLength: 100,
      required: true,
      validate: validateSlug,
    },
    {
      name: 'statement',
      type: 'textarea',
      maxLength: 700,
      required: true,
    },
    {
      name: 'claimType',
      type: 'select',
      options: [
        { label: 'Relationship', value: 'relationship' },
        { label: 'Role', value: 'role' },
        { label: 'Contribution', value: 'contribution' },
        { label: 'Outcome', value: 'outcome' },
        { label: 'Metric', value: 'metric' },
      ],
      required: true,
    },
    {
      name: 'relationshipValue',
      type: 'select',
      admin: {
        description: 'Required only for a relationship claim.',
      },
      options: relationshipOptions.map((option) => ({ ...option })),
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
      required: true,
    },
    {
      name: 'claimStatus',
      type: 'select',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      defaultValue: 'hold',
      options: claimStatusOptions.map((option) => ({ ...option })),
      required: true,
    },
    {
      name: 'permissionStatus',
      type: 'select',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      defaultValue: 'approval-required',
      options: claimPermissionOptions.map((option) => ({ ...option })),
      required: true,
    },
    {
      name: 'allowedSurfaces',
      type: 'select',
      hasMany: true,
      options: claimSurfaceOptions.map((option) => ({ ...option })),
      required: true,
    },
    {
      name: 'permissionEvidence',
      type: 'textarea',
      access: adminOnly,
      maxLength: 500,
    },
    {
      name: 'permissionReviewer',
      type: 'relationship',
      access: adminOnly,
      relationTo: 'users',
    },
    {
      name: 'permissionReviewedAt',
      type: 'date',
      access: adminOnly,
    },
  ],
  maxRows: 20,
  required: true,
})

export const derivedReviewFields = (): Field[] => [
  {
    name: 'claimStatus',
    type: 'select',
    admin: {
      description: 'Calculated from the most restrictive selected claim.',
      readOnly: true,
    },
    access: {
      create: adminFieldAccess,
      update: adminFieldAccess,
    },
    defaultValue: 'hold',
    options: claimStatusOptions.map((option) => ({ ...option })),
    required: true,
  },
  {
    name: 'permissionStatus',
    type: 'select',
    admin: {
      description: 'Calculated from the most restrictive selected claim.',
      readOnly: true,
    },
    access: {
      create: adminFieldAccess,
      update: adminFieldAccess,
    },
    defaultValue: 'approval-required',
    options: claimPermissionOptions.map((option) => ({ ...option })),
    required: true,
  },
]

export const publicationReviewFields = (): Field[] => [
  {
    name: 'publicationApproval',
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
    name: 'publicationReviewer',
    type: 'relationship',
    access: adminOnly,
    relationTo: 'users',
  },
  {
    name: 'publicationApprovedAt',
    type: 'date',
    access: adminOnly,
  },
  {
    name: 'internalReviewNotes',
    type: 'textarea',
    access: adminOnly,
    maxLength: 2000,
  },
]

export const seoField = (): Field => ({
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
})
