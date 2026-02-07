import React, { useState, useEffect, useRef } from 'react';
import { EntityImage } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Image, Upload, Trash2, Star, StarOff, Link as LinkIcon, 
  GripVertical, Loader2, Plus, X, ExternalLink, Check, Save
} from 'lucide-react';

// Maps entityType to the actual Supabase table name
const ENTITY_TABLE_MAP = {
  place: 'places',
  event: 'events',
  opportunity: 'opportunities',
  interest_group: 'interest_groups',
};

async function updateEntityImageUrl(entityType, entityId, imageUrl) {
  const table = ENTITY_TABLE_MAP[entityType];
  if (!table) return;
  const { error } = await supabase
    .from(table)
    .update({ image_url: imageUrl })
    .eq('id', entityId);
  if (error) console.error('Error updating entity image_url:', error);
  return !error;
}

export default function ImageManager({ 
  entityType, 
  entityId, 
  onImagesChange,
  maxImages = 10,
  showPrimaryBadge = true,
  allowUpload = true,
  allowUrl = true,
  compact = false
}) {
  const { toast } = useToast();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlCaption, setUrlCaption] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (entityType && entityId) {
      loadImages();
    }
  }, [entityType, entityId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await EntityImage.listByEntity(entityType, entityId);
      setImages(data);
      onImagesChange?.(data);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sync the primary image URL back to the entity's image_url column
  const syncPrimaryToEntity = async (imagesList) => {
    const primary = imagesList.find(img => img.is_primary);
    const url = primary?.image_url || imagesList[0]?.image_url || null;
    if (url) {
      const ok = await updateEntityImageUrl(entityType, entityId, url);
      if (ok) {
        setLastSaved(new Date());
        setTimeout(() => setLastSaved(null), 3000);
      }
      return ok;
    }
    return false;
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    if (images.length + files.length > maxImages) {
      toast({
        title: 'Too many images',
        description: `Maximum ${maxImages} images allowed`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast({ title: 'Invalid file type', description: `${file.name} is not an image`, variant: 'destructive' });
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ title: 'File too large', description: `${file.name} exceeds 5MB limit`, variant: 'destructive' });
          continue;
        }

        await EntityImage.uploadToEntity(entityType, entityId, file, {
          isPrimary: images.length === 0,
          source: 'admin'
        });
      }
      
      // Reload images and sync primary to entity
      const data = await EntityImage.listByEntity(entityType, entityId);
      setImages(data);
      onImagesChange?.(data);
      await syncPrimaryToEntity(data);

      toast({
        title: 'Images saved!',
        description: `Successfully uploaded ${files.length} image(s) and updated listing.`,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload images',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    if (images.length >= maxImages) {
      toast({ title: 'Too many images', description: `Maximum ${maxImages} images allowed`, variant: 'destructive' });
      return;
    }

    try {
      await EntityImage.addToEntity(entityType, entityId, urlInput.trim(), {
        isPrimary: images.length === 0,
        source: 'admin',
        caption: urlCaption.trim() || null
      });
      
      const data = await EntityImage.listByEntity(entityType, entityId);
      setImages(data);
      onImagesChange?.(data);
      await syncPrimaryToEntity(data);

      setShowUrlDialog(false);
      setUrlInput('');
      setUrlCaption('');
      
      toast({ title: 'Image saved!', description: 'Image URL has been added and listing updated.' });
    } catch (error) {
      console.error('Error adding image URL:', error);
      toast({
        title: 'Failed to add image',
        description: error.message || 'Could not add image URL',
        variant: 'destructive'
      });
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await EntityImage.setPrimary(imageId);
      const data = await EntityImage.listByEntity(entityType, entityId);
      setImages(data);
      onImagesChange?.(data);
      await syncPrimaryToEntity(data);

      toast({ title: 'Primary image updated', description: 'Listing image has been updated.' });
    } catch (error) {
      console.error('Error setting primary:', error);
      toast({
        title: 'Failed to update',
        description: error.message || 'Could not set primary image',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await EntityImage.deleteImage(imageId);
      const data = await EntityImage.listByEntity(entityType, entityId);
      setImages(data);
      onImagesChange?.(data);
      
      // Update entity image_url to next available or null
      if (data.length > 0) {
        await syncPrimaryToEntity(data);
      } else {
        await updateEntityImageUrl(entityType, entityId, null);
      }

      toast({ title: 'Image deleted', description: 'The image has been removed.' });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete image',
        variant: 'destructive'
      });
    }
  };

  const handleManualSave = async () => {
    await syncPrimaryToEntity(images);
    toast({ title: 'Saved!', description: 'Listing image has been updated.' });
  };

  // --- Saved banner ---
  const SavedBanner = () => lastSaved ? (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
      <Check className="w-4 h-4" />
      <span>Changes saved to listing</span>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compact view for inline use
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Images ({images.length}/{maxImages})</Label>
          <div className="flex gap-1 ml-auto">
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= maxImages}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </>
            )}
            {allowUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlDialog(true)}
                disabled={images.length >= maxImages}
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        <SavedBanner />

        {images.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {images.map((image) => (
              <div 
                key={image.id} 
                className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
              >
                <img src={image.image_url} alt={image.alt_text || ''} className="w-full h-full object-cover" />
                {image.is_primary && showPrimaryBadge && (
                  <Star className="absolute top-1 left-1 w-3 h-3 text-yellow-500 fill-yellow-500" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {!image.is_primary && (
                    <button type="button" onClick={() => handleSetPrimary(image.id)} className="p-1 text-white hover:text-yellow-400" title="Set as primary">
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button type="button" onClick={() => handleDelete(image.id)} className="p-1 text-white hover:text-red-400" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No images yet</p>
        )}

        <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Image URL</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input id="image-url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="image-caption">Caption (optional)</Label>
                <Input id="image-caption" value={urlCaption} onChange={(e) => setUrlCaption(e.target.value)} placeholder="Describe this image..." />
              </div>
              {urlInput && (
                <div className="border rounded-lg p-2">
                  <img src={urlInput} alt="Preview" className="max-h-32 mx-auto rounded" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUrlDialog(false)}>Cancel</Button>
              <Button onClick={handleAddUrl} disabled={!urlInput.trim()}>Add Image</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Full card view
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium">Images</h3>
            <Badge variant="secondary">{images.length}/{maxImages}</Badge>
          </div>
          <div className="flex gap-2">
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= maxImages}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Upload</>
                  )}
                </Button>
              </>
            )}
            {allowUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUrlDialog(true)}
                disabled={images.length >= maxImages}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Add URL
              </Button>
            )}
          </div>
        </div>

        <SavedBanner />

        {images.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
              {images.map((image, index) => (
                <div 
                  key={image.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text || `Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {image.is_primary && showPrimaryBadge && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-yellow-500 text-white text-xs">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Primary
                      </Badge>
                    </div>
                  )}

                  {image.source && image.source !== 'admin' && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="text-xs bg-white/80">
                        {image.source === 'google_maps' ? 'Google' : 
                         image.source === 'user' ? 'User' : image.source}
                      </Badge>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                      {!image.is_primary && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => handleSetPrimary(image.id)} className="h-8">
                          <Star className="w-4 h-4 mr-1" />Set Primary
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="destructive" onClick={() => handleDelete(image.id)} className="h-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <a href={image.image_url} target="_blank" rel="noopener noreferrer" className="text-white text-xs flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" />View Full
                    </a>
                  </div>

                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-white text-xs truncate">{image.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Explicit Save button */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-gray-500">
                The primary image is used as the listing's main image.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleManualSave}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save to Listing
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg mt-3">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-2">No images yet</p>
            <p className="text-sm text-gray-400">Upload images or add from URL</p>
          </div>
        )}

        {/* URL Dialog */}
        <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Image URL</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input id="image-url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label htmlFor="image-caption">Caption (optional)</Label>
                <Input id="image-caption" value={urlCaption} onChange={(e) => setUrlCaption(e.target.value)} placeholder="Describe this image..." />
              </div>
              {urlInput && (
                <div className="border rounded-lg p-2 bg-gray-50">
                  <img
                    src={urlInput}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <p className="text-red-500 text-sm text-center hidden">Could not load image preview</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUrlDialog(false)}>Cancel</Button>
              <Button onClick={handleAddUrl} disabled={!urlInput.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Save Image
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
