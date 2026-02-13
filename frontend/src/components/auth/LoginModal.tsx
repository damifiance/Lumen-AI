import { useState, useEffect } from 'react';
import { Mail, Lock, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// Module-level listener for programmatic opening
type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openLoginModal() {
  _listener?.(true);
}

export function LoginModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { signIn, isLoading } = useAuthStore();

  // Register listener
  useEffect(() => {
    _listener = (open: boolean) => {
      setIsVisible(open);
      if (open) {
        // Reset form when opening
        setEmail('');
        setPassword('');
        setError('');
      }
    };
    return () => {
      _listener = null;
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      // Success - close modal
      handleClose();
    }
  };

  const handleSignupClick = async () => {
    handleClose();
    // Dynamically import to avoid circular dependency
    const { openSignupModal } = await import('./SignupModal');
    openSignupModal();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-700">Sign In</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Email field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="mb-5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                id="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-5 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Sign up link */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={handleSignupClick}
              className="text-accent hover:text-accent-hover font-medium cursor-pointer"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
