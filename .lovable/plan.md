

# Fix Due Management Pages — Add Pagination & S.No. Column

## Problem
1. **DueManagement.tsx** (Reading Room) and **HostelDueManagement.tsx** — both are missing `AdminTablePagination` with page size selector, showing/total label, and page navigation. They render all rows without pagination.
2. Both pages also lack an S.No. column in the table.
3. No separate mess due management page exists (mess dues are inline in MessBookings), so no changes needed there.

## Changes

### `src/pages/admin/DueManagement.tsx`
- Add pagination state: `currentPage`, `pageSize`
- Slice `dues` array for current page display
- Add S.No. column as first column in both desktop table and mobile cards
- Add `AdminTablePagination` component after the table Card
- Import `AdminTablePagination, getSerialNumber`

### `src/pages/admin/HostelDueManagement.tsx`
- Same changes: pagination state, sliced data, S.No. column, `AdminTablePagination` after table
- Import `AdminTablePagination, getSerialNumber`

### Technical Details
- State: `const [currentPage, setCurrentPage] = useState(1);` and `const [pageSize, setPageSize] = useState(10);`
- Compute: `const paginatedDues = dues.slice((currentPage - 1) * pageSize, currentPage * pageSize);`
- Reset page to 1 when filters change
- S.No. uses `getSerialNumber(index, currentPage, pageSize)`
- Standard `pageSizeOptions` default (10, 25, 50, 100)

## Files Modified
- `src/pages/admin/DueManagement.tsx`
- `src/pages/admin/HostelDueManagement.tsx`

