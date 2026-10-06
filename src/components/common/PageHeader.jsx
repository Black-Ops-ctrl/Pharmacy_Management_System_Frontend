const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 animate-fade-in-up">
      <div>
        <h1 className="text-md text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h1>
        {subtitle && (
          <p className="text-white/60 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-1.5 mt-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
