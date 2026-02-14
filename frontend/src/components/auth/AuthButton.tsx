import { LogIn, LogOut, User, Settings } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { openProfileEditModal } from '../profile/ProfileEditModal';

const AUTH_PAGE_URL = 'https://damifiance.github.io/Lumen-AI/auth.html?source=app';

export function AuthButton() {
  const { user, signOut } = useAuthStore();
  const { profile, clearProfile } = useProfileStore();

  const handleSignIn = () => {
    if (window.electron?.startOAuth) {
      window.electron.startOAuth(AUTH_PAGE_URL);
    } else {
      window.open(AUTH_PAGE_URL, '_blank');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    clearProfile();
  };

  // Hide auth UI entirely if Supabase is not configured (offline-first requirement)
  if (!import.meta.env.VITE_SUPABASE_URL) {
    return null;
  }

  if (!user) {
    // Not logged in - show Sign In button
    return (
      <button
        onClick={handleSignIn}
        className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-sidebar-text/50 hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer transition-colors"
      >
        <LogIn size={14} />
        Sign In
      </button>
    );
  }

  // Logged in - show profile + actions
  const displayText = profile?.username ? `@${profile.username}` : user.email || 'User';
  const truncatedText =
    displayText.length > 20 ? displayText.slice(0, 20) + '...' : displayText;

  return (
    <div className="w-full space-y-1.5">
      {/* Profile button */}
      <button
        onClick={openProfileEditModal}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
      >
        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-accent/10">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 object-cover" />
          ) : (
            <User size={12} className="text-accent/60" />
          )}
        </div>
        <span className="text-[11px] text-sidebar-text/70 truncate flex-1 text-left">
          {truncatedText}
        </span>
        <Settings size={12} className="text-sidebar-text/30 shrink-0" />
      </button>

      {/* Sign out button */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-sidebar-text/50 hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer transition-colors"
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );
}
