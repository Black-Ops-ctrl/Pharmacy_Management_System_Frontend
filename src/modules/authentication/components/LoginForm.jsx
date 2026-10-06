import { FaUser, FaLock, FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

const LoginForm = ({ formData, handleChange, handleLogin, isLoading, error, success }) => {
  return (
    <div className="bg-white/10 backdrop-blur-md backdrop-filter rounded-sm p-5 sm:p-6 md:p-8 lg:p-8 border border-white/20 max-w-[320px] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[460px] mx-auto animate-zoom-in">
      <div className="text-center mb-4 sm:mb-5 md:mb-6 animate-flip" style={{ animationDelay: '0.2s' }}>
        <h2 
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-white mb-1.5 sm:mb-2" 
          style={{ fontFamily: 'Jura, sans-serif' }}
        >
          Welcome Back
        </h2>
        <p 
          className="text-white/80 text-[12px] sm:text-xs md:text-sm" 
          style={{ fontFamily: 'Jura, sans-serif' }}
        >
          Please login to your account.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-2 sm:space-y-2.5 md:space-y-3">
        <div className="relative animate-slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
            <FaUser className="text-white text-[12px] sm:text-xs md:text-sm" />
          </div>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter username"
            autoComplete="off"
            className="w-full pl-7 sm:pl-8 md:pl-9 pr-3 sm:pr-3.5 py-1.5 sm:py-2 md:py-2.5 bg-white/5 border border-white/40 rounded-sm text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent transition-all duration-200 text-[12px] sm:text-xs md:text-sm [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.05)] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
            required
          />
        </div>

        <div className="relative animate-slide-in-right" style={{ animationDelay: '0.4s' }}>
          <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
            <FaLock className="text-white text-[12px] sm:text-xs md:text-sm" />
          </div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            autoComplete="off"
            className="w-full pl-7 sm:pl-8 md:pl-9 pr-3 sm:pr-3.5 py-1.5 sm:py-2 md:py-2.5 bg-white/5 border border-white/40 rounded-sm text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-white focus:border-transparent transition-all duration-200 text-[12px] sm:text-xs md:text-sm [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.05)] [&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff]"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-red-500/12 border border-red-500/40 text-red-300 text-[12px] sm:text-xs animate-fade-in" style={{ fontFamily: 'Jura, sans-serif' }}>
            <FaExclamationCircle className="flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-emerald-500/12 border border-emerald-500/40 text-emerald-300 text-[12px] sm:text-xs animate-fade-in" style={{ fontFamily: 'Jura, sans-serif' }}>
            <FaCheckCircle className="flex-shrink-0" /> {success}
          </div>
        )}

        <div className="flex justify-center pt-1 sm:pt-1.5 animate-bounce-in" style={{ animationDelay: '0.6s' }}>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-4/5 md:w-3/4 py-2 sm:py-2 md:py-2.5 px-4 bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700 text-white rounded-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-300/60 text-[12px] sm:text-xs md:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Jura, sans-serif', fontWeight: 600 }}
          >
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default LoginForm;