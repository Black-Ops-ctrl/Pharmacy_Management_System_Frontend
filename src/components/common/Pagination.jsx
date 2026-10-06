const FONT = { fontFamily: 'Poppins, sans-serif' };

const pagesFor = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  const list = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  list.forEach((p, i) => {
    if (i && p - list[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
};

const Pagination = ({ currentPage, setCurrentPage, totalItems, itemsPerPage }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (page - 1) * itemsPerPage;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-1.5 border-t border-white/10 gap-2 sm:gap-0 animate-fade-in-up delay-300">
      <span className="text-white text-[12px] whitespace-nowrap" style={FONT}>
        Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          onClick={() => setCurrentPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[12px] hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          style={FONT}
        >
          Prev
        </button>
        <div className="flex gap-1">
          {pagesFor(page, totalPages).map((p) => (typeof p === 'string' ? (
            <span key={p} className="px-1 text-white/50 text-[12px]" style={FONT}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`px-2 py-0.5 rounded-md text-[12px] font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                page === p ? 'bg-purple-500/30 text-white shadow-lg shadow-purple-500/20' : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              style={FONT}
            >
              {p}
            </button>
          )))}
        </div>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[12px] hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
          style={FONT}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;
