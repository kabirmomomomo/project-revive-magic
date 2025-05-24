import React from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  currentImage: string | null;
  onImageChange: (file: File) => void;
  aspectRatio?: number;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageChange,
  aspectRatio = 1,
  className,
  icon = <ImageIcon className="w-8 h-8" />,
  label = "Upload image"
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="image-upload"
      />
      <label
        htmlFor="image-upload"
        className={cn(
          "flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer",
          "hover:border-primary/50 transition-colors duration-200",
          currentImage ? "border-transparent" : "border-muted-foreground/25"
        )}
        style={{ aspectRatio }}
      >
        {currentImage ? (
          <div className="relative w-full h-full">
            <img
              src={currentImage}
              alt="Uploaded"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">Change image</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {icon}
            <span className="mt-2 text-sm">{label}</span>
          </div>
        )}
      </label>
    </div>
  );
}; 