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
        className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-sidebar-text/50 hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer transition-colors"
      >
        <LogIn size={14} />
        Sign In
      </button>
    );
  }

  // Logged in - show user email + Sign Out button
  const displayEmail = user.email || 'User';
  const truncatedEmail =
    displayEmail.length > 20 ? displayEmail.slice(0, 20) + '...' : displayEmail;

  return (
    <div className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-white/5">
      <div className="flex items-center gap-2 min-w-0">
        <User size={13} className="text-sidebar-text/40 shrink-0" />
        <span className="text-[11px] text-sidebar-text/70 truncate">{truncatedEmail}</span>
      </div>
      <button
        onClick={signOut}
        className="p-1 text-sidebar-text/30 hover:text-sidebar-text/60 cursor-pointer rounded hover:bg-white/10 transition-colors shrink-0"
        title="Sign Out"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
