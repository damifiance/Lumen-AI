import { useState, useRef } from 'react';
import { User, Loader2, Upload } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cropAndResize } from '../../lib/imageResize';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';

interface AvatarCropUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete?: (url: string) => void;
}

export function AvatarCropUpload({ currentAvatarUrl, onUploadComplete }: AvatarCropUploadProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { user } = useAuthStore();
  const { updateAvatar } = useProfileStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const minDimension = Math.min(naturalWidth, naturalHeight);
    const size = minDimension * 0.8; // 80% of smaller dimension
    const x = (naturalWidth - size) / 2;
    const y = (naturalHeight - size) / 2;

    // Set default crop centered and 80% of smaller dimension
    const defaultCrop = {
      unit: 'px' as const,
      x,
      y,
      width: size,
      height: size,
    };
    setCrop(defaultCrop);
    setCompletedCrop({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(size),
      height: Math.round(size),
      unit: 'px',
    });
  };

  const handleCropAndUpload = async () => {
    if (!imageSrc || !completedCrop || !user) return;

    setIsUploading(true);
    setError(null);

    try {
      // Crop and resize image to 400x400 JPEG
      const blob = await cropAndResize(imageSrc, completedCrop, 400);

      // Upload to Supabase Storage
      const newAvatarUrl = await updateAvatar(user.id, blob);

      // Success - reset state and call callback
      setImageSrc(null);
      setCompletedCrop(null);
      onUploadComplete?.(newAvatarUrl);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setImageSrc(null);
    setCompletedCrop(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar preview or crop interface */}
      {imageSrc ? (
        <div className="w-full">
          <div className="mb-3 max-h-96 overflow-auto border border-gray-200 rounded-xl">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              className="max-w-full"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                className="max-w-full h-auto"
              />
            </ReactCrop>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
              {error}
            </div>
          )}

          {/* Crop actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCropAndUpload}
              disabled={!completedCrop || isUploading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Crop & Upload
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {/* Avatar preview */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative w-24 h-24 rounded-full overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-accent transition-colors flex items-center justify-center bg-gray-50"
          >
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={36} className="text-gray-300" />
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload size={20} className="text-white" />
            </div>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-xs text-gray-500 text-center">
            Click to upload avatar<br />
            Max 5MB, square crop recommended
          </p>

          {/* Error display */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
