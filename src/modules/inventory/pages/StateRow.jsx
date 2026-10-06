import { FONT } from './invUtils';

const StateRow = ({ colSpan, loading, error, empty }) => (
  <tr className="animate-fade-in">
    <td colSpan={colSpan} className="px-3 py-6 text-center text-[14px] text-white/40" style={FONT}>
      {loading ? 'Loading…' : error ? error : empty}
    </td>
  </tr>
);

export default StateRow;
