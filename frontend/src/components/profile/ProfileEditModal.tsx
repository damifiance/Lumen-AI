import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfileStore } from '../../stores/profileStore';
import { AvatarCropUpload } from './AvatarCropUpload';

// Module-level listener for programmatic opening
type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openProfileEditModal() {
  _listener?.(true);
}

// Zod validation schema
const profileSchema = z.object({
  display_name: z.string().max(50, 'Display name must be 50 characters or less').optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  institution: z.string().max(100, 'Institution must be 100 characters or less').optional(),
  research_interests: z.string().optional(), // Comma-separated string
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { profile, updateProfile } = useProfileStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      institution: profile?.institution || '',
      research_interests: profile?.research_interests?.join(', ') || '',
    },
  });

  // Watch bio field for character counter
  const bioValue = watch('bio') || '';

  // Register listener
  useEffect(() => {
    _listener = (open: boolean) => {
      setIsVisible(open);
      if (open && profile) {
        // Reset form with current profile data when opening
        reset({
          display_name: profile.display_name || '',
          bio: profile.bio || '',
          institution: profile.institution || '',
          research_interests: profile.research_interests?.join(', ') || '',
        });
        setError(null);
        setIsSubmitting(false);
      }
    };
    return () => {
      _listener = null;
    };
  }, [profile, reset]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!profile) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse research interests from comma-separated string
      const researchInterests = data.research_interests
        ? data.research_interests
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 10) // Max 10 items
        : [];

      await updateProfile({
        display_name: data.display_name || null,
        bio: data.bio || null,
        institution: data.institution || null,
        research_interests: researchInterests,
      });

      // Success - close modal
      handleClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUploadComplete = () => {
    // Avatar upload already updates the profile store
    // No need to do anything here
  };

  if (!isVisible || !profile) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-700">Edit Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">@{profile.username}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">
          {/* Avatar Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Avatar
            </label>
            <AvatarCropUpload
              currentAvatarUrl={profile.avatar_url || undefined}
              onUploadComplete={handleAvatarUploadComplete}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div className="mb-4">
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              id="display_name"
              {...register('display_name')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              placeholder="Your full name"
            />
            {errors.display_name && (
              <p className="mt-1 text-xs text-red-600">{errors.display_name.message}</p>
            )}
          </div>

          {/* Bio */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <span className="text-xs text-gray-400">
                {bioValue.length}/500
              </span>
            </div>
            <textarea
              id="bio"
              {...register('bio')}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm resize-none"
              placeholder="Tell us about yourself..."
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>
            )}
          </div>

          {/* Institution */}
          <div className="mb-4">
            <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
              Institution
            </label>
            <input
              type="text"
              id="institution"
              {...register('institution')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              placeholder="University or organization"
            />
            {errors.institution && (
              <p className="mt-1 text-xs text-red-600">{errors.institution.message}</p>
            )}
          </div>

          {/* Research Interests */}
          <div className="mb-6">
            <label htmlFor="research_interests" className="block text-sm font-medium text-gray-700 mb-2">
              Research Interests
            </label>
            <input
              type="text"
              id="research_interests"
              {...register('research_interests')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
              placeholder="machine learning, NLP, computer vision"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple interests with commas (max 10)
            </p>
            {errors.research_interests && (
              <p className="mt-1 text-xs text-red-600">{errors.research_interests.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-5 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
