import { useState, useEffect } from 'react';
import { Mail, X, Loader2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

// Module-level listener for programmatic opening
type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openForgotPasswordModal() {
  _listener?.(true);
}

export function ForgotPasswordModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { requestPasswordReset, isLoading } = useAuthStore();

  // Register listener
  useEffect(() => {
    _listener = (open: boolean) => {
      setIsVisible(open);
      if (open) {
        // Reset form when opening
        setEmail('');
        setError('');
        setIsSuccess(false);
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

    const result = await requestPasswordReset(email);
    if (result.error) {
      setError(result.error);
    } else {
      // Success - show confirmation message
      setIsSuccess(true);
    }
  };

  const handleBackToLogin = async () => {
    handleClose();
    // Dynamically import to avoid circular dependency
    const { openLoginModal } = await import('./LoginModal');
    openLoginModal();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-700">Reset Password</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {isSuccess ? (
            // Success state
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Check your email</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
                We've sent a password reset link to <strong>{email}</strong>. Click the link to
                set a new password.
              </p>
              <button
                onClick={handleBackToLogin}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-all"
              >
                Back to Login
              </button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Error display */}
              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Email field */}
              <div className="mb-5">
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="email"
                    id="reset-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-5 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              {/* Back to login link */}
              <div className="text-center text-sm text-gray-500">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-accent hover:text-accent-hover font-medium cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
