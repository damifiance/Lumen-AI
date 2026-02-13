import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { openLoginModal } from './LoginModal';

export function AuthButton() {
  const { user, signOut } = useAuthStore();

  // Hide auth UI entirely if Supabase is not configured (offline-first requirement)
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return null;
  }

  if (!user) {
    // Not logged in - show Sign In button
    return (
      <button
        onClick={openLoginModal}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors"
      >
        <LogIn size={16} />
        Sign In
      </button>
    );
  }

  // Logged in - show user email + Sign Out button
  const displayEmail = user.email || 'User';
  const truncatedEmail =
    displayEmail.length > 24 ? displayEmail.slice(0, 24) + '...' : displayEmail;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
      <div className="flex items-center gap-2 text-sm">
        <User size={14} className="text-gray-400" />
        <span className="text-gray-600">{truncatedEmail}</span>
      </div>
      <button
        onClick={signOut}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer rounded hover:bg-gray-100 transition-colors"
        title="Sign Out"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
