import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

const AUTH_PAGE_URL = 'https://damifiance.github.io/Lumen-AI/auth.html?source=app';
const PROFILE_PAGE_URL = 'https://damifiance.github.io/Lumen-AI/profile.html';

export function AuthButton() {
  const { user, signOut } = useAuthStore();
  const { profile, clearProfile } = useProfileStore();
  const tier = useSubscriptionStore((s) => s.tier);

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

  return (
    <div className="flex items-center justify-between w-full px-2 py-1.5">
      <button
        onClick={handleOpenProfile}
        className="cursor-pointer"
        title="Edit profile on web"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-accent/10 border-2 border-transparent hover:border-accent/40 transition-colors">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-7 h-7 object-cover" />
          ) : (
            <User size={13} className="text-accent/60" />
          )}
        </div>
      </button>

      {tier === 'pro' && (
        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-amber-500/20 text-amber-400 tracking-wide">
          PRO
        </span>
      )}
      {tier === 'max' && (
        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-full bg-purple-500/20 text-purple-400 tracking-wide">
          MAX
        </span>
      )}

      <button
        onClick={handleSignOut}
        className="flex items-center gap-1.5 text-[11px] text-sidebar-text/40 hover:text-sidebar-text-bright cursor-pointer transition-colors"
      >
        <LogOut size={12} />
        Sign Out
      </button>
    </div>
  );
}
