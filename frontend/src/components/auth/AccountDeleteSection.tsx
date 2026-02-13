import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';

export function AccountDeleteSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { deleteAccount } = useAuthStore();
  const { clearProfile } = useProfileStore();

  const handleDelete = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsDeleting(true);
    setError(null);

    const result = await deleteAccount(password);

    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      // Success - user is now signed out by the deleteAccount method
      clearProfile();
      // Modal will close automatically because user is null
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setPassword('');
    setError(null);
  };

  return (
    <div className="border-t border-red-200 pt-5 mt-6">
      <h3 className="text-sm font-semibold text-red-600 mb-1">Danger Zone</h3>
      <p className="text-xs text-gray-500 mb-3">
        Once deleted, your account and all data cannot be recovered.
      </p>

      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 cursor-pointer transition-all"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-600">
              This will permanently delete your account, profile, avatar, and all associated data.
              This action cannot be undone.
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-100 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="delete-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm your password
            </label>
            <input
              type="password"
              id="delete-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Enter your password to confirm"
              disabled={isDeleting}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting || !password}
              className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete my account'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
