# Phase 3 — People Registry

## Status: ✅ Complete

## Files
| File | Change |
|---|---|
| `src/features/people/services/peopleService.ts` | New — Supabase CRUD (fetchPeople, fetchPerson, createPerson, updatePerson, deletePerson) |
| `src/features/people/hooks/usePeople.ts` | New — hook with search debounce + category filter |
| `src/features/people/components/PersonForm.tsx` | New — create/edit modal (Zod + react-hook-form) |
| `src/features/people/components/PeoplePage.tsx` | New — listing page with table, search, filters, delete |
| `src/features/people/index.ts` | New — barrel export |
| `src/app/routes.tsx` | Modified — PEOPLE stub → `<PeoplePage />` |

## Features
- Full CRUD on `persons` table via Supabase RLS-aware client
- Search by full_name (server-side ilike, 300ms debounce)
- Category filter chips: All / Faculty / Student / External
- Responsive table: Name always visible; Category, Designation, Organization, Contact progressively visible at sm/md/lg
- Edit and Delete actions appear on row hover
- Delete uses `window.confirm` guard
- PersonForm modal: full_name (required), category (select), designation, organization, phone, email
- Empty state with Add Person CTA when list is empty
- Error banners for load failures and delete failures

## Next: Phase 4 — Camp Management
