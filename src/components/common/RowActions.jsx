import { FaEye, FaEdit, FaTrash, FaPrint, FaFilePdf, FaFileExcel, FaMoneyBillWave } from 'react-icons/fa';

const STYLE = {
  view:   { cls: 'bg-white/10 hover:bg-white/20 text-white hover:shadow-white/10', Icon: FaEye, title: 'View' },
  edit:   { cls: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:shadow-blue-500/20', Icon: FaEdit, title: 'Edit' },
  delete: { cls: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:shadow-red-500/20', Icon: FaTrash, title: 'Delete' },
  print:  { cls: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:shadow-amber-500/20', Icon: FaPrint, title: 'Print' },
  pdf:    { cls: 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 hover:shadow-rose-500/20', Icon: FaFilePdf, title: 'Save PDF' },
  excel:  { cls: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:shadow-emerald-500/20', Icon: FaFileExcel, title: 'Export Excel' },
  pay:    { cls: 'bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:shadow-green-500/20', Icon: FaMoneyBillWave, title: 'Receive Payment' },
};

export const IconBtn = ({ kind, onClick, title, disabled, children }) => {
  const s = STYLE[kind] || STYLE.view;
  const Icon = s.Icon;
  return (
    <button type="button" onClick={onClick} title={title || s.title} aria-label={title || s.title} disabled={disabled}
      className={`w-7 h-7 rounded-md text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${s.cls}`}>
      {children || <Icon size={12} />}
    </button>
  );
};

const RowActions = ({ onView, onEdit, onDelete, onPrint, onPdf, onExcel, onCsv, onPay, children }) => {
  const xls = onExcel || onCsv;
  const any = onView || onEdit || onDelete || onPrint || onPdf || xls || onPay || children;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onView && <IconBtn kind="view" onClick={onView} />}
      {onPay && <IconBtn kind="pay" onClick={onPay} />}
      {children}
      {onEdit && <IconBtn kind="edit" onClick={onEdit} />}
      {onPrint && <IconBtn kind="print" onClick={onPrint} />}
      {onPdf && <IconBtn kind="pdf" onClick={onPdf} />}
      {xls && <IconBtn kind="excel" onClick={xls} />}
      {onDelete && <IconBtn kind="delete" onClick={onDelete} />}
      {!any && <span className="text-white/30 text-[12px]">—</span>}
    </div>
  );
};

export default RowActions;
