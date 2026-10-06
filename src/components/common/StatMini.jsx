const StatMini = ({ title, value, icon: Icon, color = 'purple', delay = 0 }) => {
  const colors = {
    purple:  'from-purple-500 to-indigo-600 shadow-purple-500/30',
    green:   'from-green-500 to-emerald-600 shadow-green-500/30',
    amber:   'from-amber-500 to-orange-600 shadow-amber-500/30',
    red:     'from-red-500 to-rose-600 shadow-red-500/30',
    blue:    'from-blue-500 to-cyan-600 shadow-blue-500/30',
  };
  return (
    <div
      className="bg-white/5 backdrop-blur-lg rounded-sm p-2 sm:p-2.5 md:p-3 border border-white/40 hover:bg-white/20 transition-all duration-200 animate-fade-in-up"
      style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
        <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-gradient-to-r ${colors[color] || colors.purple} flex items-center justify-center shadow-lg animate-zoom-in`}>
          {Icon && <Icon className="text-white text-xs sm:text-sm" />}
        </div>
        <div className="flex flex-col gap-0.5 overflow-hidden w-full animate-fade-in delay-100">
          <p className="text-white/70 text-[12px] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {title}
          </p>
          <p className="text-white text-xs sm:text-sm truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatMini;
