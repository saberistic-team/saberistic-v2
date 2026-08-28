import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/access/roles'
import { validateCanonicalOrigin, validateHttpUrl } from '@/lib/validation/content'

const publicActionOptions = [
  { label: 'Check production readiness', value: 'check_production_readiness' },
  { label: 'Explore prototypes', value: 'explore_prototypes' },
  { label: 'Start architecture diagnostic', value: 'start_architecture_diagnostic' },
  {
    label: 'Inquire: Prototype to Production',
    value: 'inquire_prototype_to_production',
  },
  { label: 'Inquire: Engineering Rescue', value: 'inquire_engineering_rescue' },
  {
    label: 'Inquire: Fractional Principal Engineer',
    value: 'inquire_fractional_principal_engineer',
  },
]

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      maxLength: 80,
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
      maxLength: 180,
      required: true,
    },
    {
      name: 'canonicalOrigin',
      type: 'text',
      maxLength: 2048,
      required: true,
      validate: validateCanonicalOrigin,
    },
    {
      name: 'contactEmail',
      type: 'email',
    },
    {
      name: 'bookingUrl',
      type: 'text',
      maxLength: 2048,
      validate: validateHttpUrl,
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'GitHub', value: 'github' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Other', value: 'other' },
          ],
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          maxLength: 120,
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          maxLength: 2048,
          required: true,
          validate: validateHttpUrl,
        },
      ],
      maxRows: 8,
    },
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          maxLength: 60,
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          maxLength: 160,
          required: true,
        },
        {
          name: 'socialImage',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'defaultPrimaryActionId',
      type: 'select',
      options: publicActionOptions,
      required: true,
    },
    {
      name: 'defaultSecondaryActionId',
      type: 'select',
      options: publicActionOptions,
      required: true,
    },
    {
      name: 'legalFooter',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'organization',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          maxLength: 120,
          required: true,
        },
        {
          name: 'legalName',
          type: 'text',
          maxLength: 160,
        },
        {
          name: 'url',
          type: 'text',
          maxLength: 2048,
          required: true,
          validate: validateCanonicalOrigin,
        },
        {
          name: 'sameAs',
          type: 'array',
          fields: [
            {
              name: 'url',
              type: 'text',
              maxLength: 2048,
              required: true,
              validate: validateHttpUrl,
            },
          ],
          maxRows: 8,
        },
      ],
    },
  ],
}
