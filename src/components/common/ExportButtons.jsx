import { FaPrint, FaFileExcel, FaFilePdf } from 'react-icons/fa';

const ExportButtons = ({ onPrint, onExcel, onCsv, onPdf }) => {
  const xls = onExcel || onCsv;
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in';
  const font = { fontFamily: 'Poppins, sans-serif' };
  return (
    <>
      {onPrint && (
        <button onClick={onPrint} className={`${base} bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700`} style={font}>
          <FaPrint size={12} /> Print
        </button>
      )}
      {xls && (
        <button onClick={xls} className={`${base} bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700`} style={font}>
          <FaFileExcel size={12} /> Excel
        </button>
      )}
      {onPdf && (
        <button onClick={onPdf} className={`${base} bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700`} style={font}>
          <FaFilePdf size={12} /> PDF
        </button>
      )}
    </>
  );
};

export const RowPrintPdf = ({ onPrint, onPdf }) => (
  <>
    <button onClick={onPrint} title="Print" className="w-7 h-7 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
      <FaPrint size={12} />
    </button>
    <button onClick={onPdf} title="Save PDF" className="w-7 h-7 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
      <FaFilePdf size={12} />
    </button>
  </>
);

export default ExportButtons;
