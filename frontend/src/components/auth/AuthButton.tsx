import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';

const AUTH_PAGE_URL = 'https://damifiance.github.io/Lumen-AI/auth.html?source=app';
const PROFILE_PAGE_URL = 'https://damifiance.github.io/Lumen-AI/profile.html';

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

  const handleOpenProfile = () => {
    if (window.electron?.startOAuth) {
      window.electron.startOAuth(PROFILE_PAGE_URL);
    } else {
      window.open(PROFILE_PAGE_URL, '_blank');
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

  // Logged in - show circular avatar + sign out
  return (
    <div className="w-full space-y-1.5">
      {/* Circular avatar — opens profile on website */}
      <button
        onClick={handleOpenProfile}
        className="flex items-center justify-center w-full py-2 cursor-pointer"
        title="Edit profile on web"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-accent/10 border-2 border-transparent hover:border-accent/40 transition-colors">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 object-cover" />
          ) : (
            <User size={14} className="text-accent/60" />
          )}
        </div>
      </button>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-sidebar-text/40 hover:text-sidebar-text-bright hover:bg-sidebar-hover rounded-lg cursor-pointer transition-colors"
      >
        <LogOut size={12} />
        Sign Out
      </button>
    </div>
  );
}
