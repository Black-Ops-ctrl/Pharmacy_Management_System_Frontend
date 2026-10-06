import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import StatusBadge from '../../../components/common/StatusBadge';
import Pagination from '../../../components/common/Pagination';
import { money, num } from '../../../utils/format';

const MedicineTable = ({ medicines, loading = false, error = '', onView, onEdit, onDelete, canEdit = true, canDelete = true, currentPage, setCurrentPage, itemsPerPage }) => {
  const totalPages = Math.max(1, Math.ceil(medicines.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const currentItems = medicines.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[900px] sm:min-w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Code</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Medicine</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Category</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">UOM</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Pack Type</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Unit Price</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Discount (%)</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Sale Price</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Stock</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading || error ? (
              <tr className="animate-fade-in">
                <td colSpan="11" className="px-3 py-6 text-center text-[14px] text-white/40" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {error || 'Loading…'}
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr className="animate-fade-in">
                <td colSpan="11" className="px-3 py-6 text-center text-white/40 text-[14px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  No medicines found
                </td>
              </tr>
            ) : (
              currentItems.map((med, index) => (
                <tr 
                  key={med.id} 
                  className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`}
                  style={{ animationFillMode: 'both' }}
                >
                  <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.code}</td>
                  <td className="px-2 py-1.5">
                    <div className="whitespace-nowrap">
                      <div className="text-white text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.name}</div>
                      <div className="text-white/70 text-[10px] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.generic || ''}</div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[11px] border border-white/40 whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.category_name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.uom_name}</td>
                  <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{med.pack_type}</td>
                  <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(med.price)}</td>
                  <td className="px-2 py-1.5 text-amber-400 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{num(med.discount)}%</td>
                  <td className="px-2 py-1.5 text-emerald-400 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{money(med.sale_price)}</td>
                  <td className={`px-2 py-1.5 text-[12px] whitespace-nowrap ${Number(med.stock) > 0 ? 'text-white' : 'text-red-400'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>{num(med.stock, 0)} {med.uom_name || ''}</td>
                  <td className="px-2 py-1.5"><StatusBadge label={med.status} color={med.status === 'Active' ? 'green' : 'gray'} /></td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => onView(med)} title="View"
                        className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 text-white text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-white/10 active:scale-95"
                      >
                        <FaEye size={12} />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => onEdit(med)} title="Edit"
                          className="w-7 h-7 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95"
                        >
                          <FaEdit size={12} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => onDelete(med)} title="Delete"
                          className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
                        >
                          <FaTrash size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <Pagination currentPage={page} setCurrentPage={setCurrentPage} totalItems={medicines.length} itemsPerPage={itemsPerPage} />
    </div>
  );
};

export default MedicineTable;