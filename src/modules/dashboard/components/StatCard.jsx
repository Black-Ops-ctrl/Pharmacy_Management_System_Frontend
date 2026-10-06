const StatCard = ({ title, value, icon }) => {
  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-sm p-2 sm:p-2.5 md:p-3 border border-white/40 hover:bg-white/20 transition-all duration-200 animate-slide-in-right animate-fade-in-up">
      <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
        <div className="flex-shrink-0 mt-0.5 animate-zoom-in flex items-center justify-center">
          <img 
            src={icon} 
            alt="icon" 
            className="w-4 h-4 sm:w-5 sm:h-5 md:w-8 md:h-8 object-contain"
          />
        </div>
          <div className="flex flex-col gap-0.5 sm:gap-1 overflow-hidden w-full animate-fade-in delay-100">
          <p className="text-white text-xs truncate" style={{ fontFamily: 'poppins, sans-serif' }}>
            {title}
          </p>
          <p className="text-white text-xs truncate" style={{ fontFamily: 'poppins, sans-serif' }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;