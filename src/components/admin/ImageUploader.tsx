import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onImageUploaded, disabled }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato inválido. Use JPEG, PNG, WEBP ou GIF.');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5242880) {
        toast.error('Imagem muito grande. Máximo 5MB.');
        return;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('odu-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload da imagem');
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('odu-images')
        .getPublicUrl(filePath);

      toast.success('Imagem enviada com sucesso!');
      onImageUploaded(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao processar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="image-upload" className="cursor-pointer">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || disabled}
          asChild
        >
          <span>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Enviando...' : 'Inserir Imagem'}
          </span>
        </Button>
      </Label>
      <Input
        id="image-upload"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || disabled}
      />
    </div>
  );
}
