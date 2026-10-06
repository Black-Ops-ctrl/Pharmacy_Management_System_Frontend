
const LoginLayout = ({ children }) => {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 relative app-theme-bg"
      style={{ backgroundAttachment: 'fixed', minHeight: '100vh' }}
    >
      <div className="relative z-10 w-full max-w-sm sm:max-w-sm md:max-w-md lg:max-w-lg">
        {children}
      </div>
    </div>
  );
};

export default LoginLayout;