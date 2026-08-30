'use client'

import { useMemo, useState } from 'react'

import {
  prototypeStatuses,
  type PrototypeStatus,
  type PublicPrototype,
} from '@/lib/public-content/types'

import { EmptyState } from '../ui/EmptyState'
import { PrototypeGrid } from './PrototypeGrid'

type FilterStatus = 'all' | PrototypeStatus

export function PrototypeFilters({ prototypes }: { prototypes: PublicPrototype[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FilterStatus>('all')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    return prototypes.filter((prototype) => {
      const matchesStatus = status === 'all' || prototype.status === status
      const matchesQuery =
        !normalizedQuery ||
        [prototype.title, prototype.summary, prototype.problem]
          .filter(Boolean)
          .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))

      return matchesStatus && matchesQuery
    })
  }, [prototypes, query, status])

  function clearFilters() {
    setQuery('')
    setStatus('all')
  }

  return (
    <div>
      <div className="prototype-filters">
        <div className="search-field">
          <label htmlFor="prototype-search">Search prototypes</label>
          <input
            id="prototype-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, question, or technology"
            type="search"
            value={query}
          />
        </div>

        <fieldset>
          <legend>Filter by status</legend>
          <div className="filter-list">
            {(['all', ...prototypeStatuses] as const).map((value) => (
              <button
                aria-pressed={status === value}
                key={value}
                onClick={() => setStatus(value)}
                type="button"
              >
                {value === 'all' ? 'All' : value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p aria-live="polite" className="result-count" role="status">
        {filtered.length} {filtered.length === 1 ? 'prototype' : 'prototypes'} shown
      </p>

      {filtered.length ? (
        <PrototypeGrid placement="index" prototypes={filtered} />
      ) : (
        <EmptyState
          description="Try a different term or clear the active filters."
          title="No prototypes match this view."
        />
      )}

      {!filtered.length ? (
        <button className="button button--quiet" onClick={clearFilters} type="button">
          Clear filters
        </button>
      ) : null}
    </div>
  )
}
