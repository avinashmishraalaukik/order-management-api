// ─── paginate ─────────────────────────────────────────────────────────────────
// Generic in-memory pagination, sorting, and filtering helper.
//
// Usage:
//   const { data, pagination } = paginate(allItems, req.query, ['status', 'name']);

/**
 * Slice, sort, and filter an in-memory array.
 *
 * @param {Record<string, unknown>[]} items       - Full dataset
 * @param {Record<string, string>}    query        - Parsed query-string params
 * @param {string[]}                  filterFields - Fields to allow substring-filter on
 * @returns {{ data: unknown[], pagination: object }}
 */
export const paginate = (items, query = {}, filterFields = []) => {
  const page      = Math.max(1, parseInt(query.page,  10) || 1);
  const limit     = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const sortBy    = query.sortBy    || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase();

  // ── Field filters (substring match, case-insensitive) ─────────────────────
  let filtered = filterFields.reduce((acc, field) => {
    const queryVal = query[field];
    if (!queryVal) return acc;

    const needle = String(queryVal).toLowerCase();
    return acc.filter((item) => {
      const hay = item[field];
      return hay !== undefined && String(hay).toLowerCase().includes(needle);
    });
  }, [...items]);

  // ── Date-range filters ────────────────────────────────────────────────────
  if (query.createdFrom) {
    const from = new Date(query.createdFrom);
    if (!isNaN(from)) filtered = filtered.filter((i) => new Date(i.createdAt) >= from);
  }
  if (query.createdTo) {
    const to = new Date(query.createdTo);
    if (!isNaN(to)) filtered = filtered.filter((i) => new Date(i.createdAt) <= to);
  }

  // ── Sorting ───────────────────────────────────────────────────────────────
  filtered.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];

    if (av === undefined) return 1;
    if (bv === undefined) return -1;

    if (typeof av === 'string') {
      return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }

    return sortOrder === 'asc' ? av - bv : bv - av;
  });

  // ── Pagination slice ──────────────────────────────────────────────────────
  const total      = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start      = (page - 1) * limit;
  const data       = filtered.slice(start, start + limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
