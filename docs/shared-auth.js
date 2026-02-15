// =============================================
// Shared Auth — Supabase session + nav avatar
// Include on every page after the Supabase CDN script
// =============================================

const SUPABASE_URL = 'https://yomowuzsfzypzpjtjvkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mxKQ0Zh9RBrYn6q2rU6Zvg_sbjCPMOr';

// Expose globally so page-specific scripts can use it
window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * On DOM load: check session, fetch profile, replace Sign In with avatar if logged in.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const signInLink = document.getElementById('nav-signin-link');
  if (!signInLink) return;

  try {
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) return;

    // Fetch profile for avatar
    let avatarUrl = null;
    let displayName = null;
    try {
      const { data: profile } = await window.sb
        .from('profiles')
        .select('avatar_url, display_name, username')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        avatarUrl = profile.avatar_url;
        displayName = profile.display_name || profile.username || session.user.email;
      }
    } catch (_) {
      // Profile fetch failed — still show avatar with fallback
    }

    // Replace Sign In link with circular avatar
    const avatarBtn = document.createElement('a');
    avatarBtn.href = 'profile.html';
    avatarBtn.className = 'nav-avatar-btn';
    avatarBtn.title = displayName || session.user.email || 'Profile';

    if (avatarUrl) {
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = 'Profile';
      avatarBtn.appendChild(img);
    } else {
      // Default: first letter of email or user icon
      const initial = (session.user.email || 'U')[0].toUpperCase();
      const span = document.createElement('span');
      span.className = 'nav-avatar-initial';
      span.textContent = initial;
      avatarBtn.appendChild(span);
    }

    signInLink.replaceWith(avatarBtn);
  } catch (_) {
    // Auth check failed — keep Sign In link
  }
});
