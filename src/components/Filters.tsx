'use client';

import { createContext, useContext, useMemo, useState } from 'react';

export interface FilterState {
  round: string;
  category: string;
  gender: string;
  stroke: string;
  team: string;
  q: string;
}

const EMPTY: FilterState = { round: '', category: '', gender: '', stroke: '', team: '', q: '' };

const Ctx = createContext<{
  filters: FilterState;
  set: (patch: Partial<FilterState>) => void;
  reset: () => void;
}>({ filters: EMPTY, set: () => {}, reset: () => {} });

/** Filters live in the sidebar but are applied inside the panel, so they sit above both. */
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const value = useMemo(
    () => ({
      filters,
      set: (patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch })),
      reset: () => setFilters(EMPTY),
    }),
    [filters],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFilters = () => useContext(Ctx);
