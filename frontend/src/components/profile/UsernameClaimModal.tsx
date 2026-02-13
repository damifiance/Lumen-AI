import { useState, useEffect } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';

// Module-level listener for programmatic opening
type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openUsernameClaimModal() {
  _listener?.(true);
}

export function UsernameClaimModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthStore();
  const { claimUsername, profile } = useProfileStore();
  const { isChecking, isAvailable, error } = useUsernameAvailability(username);

  // Register listener
  useEffect(() => {
    _listener = (open: boolean) => {
      setIsVisible(open);
      if (open) {
        // Reset form when opening
        setUsername('');
        setIsSubmitting(false);
      }
    };
    return () => {
      _listener = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAvailable || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await claimUsername(user.id, username);
      // Success - close modal
      setIsVisible(false);
    } catch (err) {
      console.error('Failed to claim username:', err);
      setIsSubmitting(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Transform to lowercase only
    const value = e.target.value.toLowerCase();
    setUsername(value);
  };

  if (!isVisible) return null;

  // Show validation feedback
  let feedbackIcon = null;
  let feedbackColor = '';
  if (username && username.length >= 3) {
    if (isChecking) {
      feedbackIcon = <Loader2 size={16} className="animate-spin text-gray-400" />;
    } else if (isAvailable === true) {
      feedbackIcon = <Check size={16} className="text-green-600" />;
      feedbackColor = 'text-green-600';
    } else if (isAvailable === false) {
      feedbackIcon = <X size={16} className="text-red-600" />;
      feedbackColor = 'text-red-600';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-700">Claim Your Username</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose a unique username that will identify you in the app.
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Username field */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input
                type="text"
                id="username"
                required
                pattern="[a-z0-9_]{3,30}"
                value={username}
                onChange={handleUsernameChange}
                disabled={isSubmitting}
                className="w-full pl-8 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="yourusername"
              />
              {feedbackIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {feedbackIcon}
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              3-30 characters, lowercase letters, numbers, underscores
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isAvailable || isSubmitting}
            className="w-full px-5 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Claiming...
              </>
            ) : (
              'Claim Username'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
