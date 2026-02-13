import { useState } from 'react';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function ResetPasswordView() {
  const { resetPasswordMode, resetPassword } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!resetPasswordMode) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(newPassword);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // Success - show brief confirmation
      setIsSuccess(true);
      setTimeout(() => {
        // resetPasswordMode will be set to false by resetPassword, which will hide this component
      }, 1500);
    }
  };

  const handleRequestNewLink = async () => {
    // User needs to enter email again - show forgot password modal
    const { openForgotPasswordModal } = await import('./ForgotPasswordModal');
    openForgotPasswordModal();
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Password Updated!</h2>
          <p className="text-sm text-gray-500">Redirecting to your papers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl px-6 py-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/10 to-teal-400/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-accent" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Set New Password</h2>
            <p className="text-sm text-gray-500">
              Enter your new password below
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium mb-1">{error}</div>
                {error.includes('expired') && (
                  <button
                    onClick={handleRequestNewLink}
                    className="text-accent hover:text-accent-hover font-medium cursor-pointer underline"
                  >
                    Request new link
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* New password field */}
            <div className="mb-4">
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  id="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {/* Confirm password field */}
            <div className="mb-6">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="password"
                  id="confirm-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Confirm your password"
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
                  Updating password...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
