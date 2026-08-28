import type { CollectionConfig } from 'payload'

import {
  adminFieldAccess,
  isAdmin,
  isStaff,
  proposedEvidenceOnlyForEditors,
} from '@/access/roles'
import { validateEvidenceSourceBeforeChange } from '@/hooks/evidenceSources'
import { validateHttpUrl } from '@/lib/validation/content'

export const EvidenceSources: CollectionConfig = {
  slug: 'evidence-sources',
  access: {
    create: isStaff,
    delete: isAdmin,
    read: isStaff,
    update: proposedEvidenceOnlyForEditors,
  },
  admin: {
    defaultColumns: [
      'title',
      'publisherOrOwner',
      'strength',
      'verificationStatus',
      'updatedAt',
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
      name: 'url',
      type: 'text',
      index: true,
      maxLength: 2048,
      required: true,
      unique: true,
      validate: validateHttpUrl,
    },
    {
      name: 'sourceType',
      type: 'select',
      options: [
        { label: 'Official product', value: 'official-product' },
        { label: 'Official company', value: 'official-company' },
        { label: 'Repository', value: 'repository' },
        { label: 'Commit', value: 'commit' },
        { label: 'Pull request', value: 'pull-request' },
        { label: 'Package registry', value: 'package-registry' },
        { label: 'Archive', value: 'archive' },
        { label: 'Résumé', value: 'resume' },
        { label: 'Professional profile', value: 'professional-profile' },
        { label: 'Third-party reference', value: 'third-party-reference' },
        { label: 'Other', value: 'other' },
      ],
      required: true,
    },
    {
      name: 'publisherOrOwner',
      type: 'text',
      maxLength: 120,
      required: true,
    },
    {
      name: 'accessedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'supports',
      type: 'textarea',
      maxLength: 500,
      required: true,
    },
    {
      name: 'strength',
      type: 'select',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'First-party public', value: 'first-party-public' },
        { label: 'Public contribution', value: 'public-contribution' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Self-attested', value: 'self-attested' },
      ],
      required: true,
    },
    {
      name: 'permissionStatus',
      type: 'select',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Approval required', value: 'approval-required' },
        { label: 'Private only', value: 'private-only' },
      ],
      required: true,
    },
    {
      name: 'allowedSurfaces',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Homepage', value: 'homepage' },
        { label: 'Work', value: 'work' },
        { label: 'About', value: 'about' },
        { label: 'Proposal', value: 'proposal' },
        { label: 'Prototype hub', value: 'prototype-hub' },
        { label: 'Private only', value: 'private-only' },
      ],
      required: true,
    },
    {
      name: 'archivedUrl',
      type: 'text',
      maxLength: 2048,
      validate: validateHttpUrl,
    },
    {
      name: 'archivedAt',
      type: 'date',
    },
    {
      name: 'verificationStatus',
      type: 'select',
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
      required: true,
    },
    {
      name: 'internalVerificationNotes',
      type: 'textarea',
      access: {
        create: adminFieldAccess,
        read: adminFieldAccess,
        update: adminFieldAccess,
      },
      maxLength: 1000,
    },
  ],
  hooks: {
    beforeChange: [validateEvidenceSourceBeforeChange],
  },
}
