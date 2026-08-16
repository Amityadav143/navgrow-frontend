/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 · navgrow.org · info@navgrow.org
 * Unauthorised reproduction, modification or distribution is strictly prohibited.
 */
/**
 * ImageUploadInput — shared admin control for any image (or PDF) field.
 *
 * Gives every admin form both options in one control:
 *   · Upload a file from the device (stored on the server via /files/upload)
 *   · Or paste an external URL, exactly as before
 *
 * Props:
 *   value       — current URL string
 *   onChange    — (url) => void
 *   label       — field label (default "Image")
 *   accept      — input accept attr (default images)
 *   placeholder — URL input placeholder
 *   preview     — show image preview (default true; off for PDFs)
 */
import React, { useRef, useState } from 'react';
import { Upload, Link2, X, Loader2, ImageIcon, Crop as CropIcon } from 'lucide-react';
import { filesApi } from '@/lib/api';
import ImageCropper from './ImageCropper';

const ImageUploadInput = ({
  value = '',
  onChange,
  label = 'Image',
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  placeholder = 'https://… or upload a file',
  preview = true,
  cropRatio = 'social',   // default crop preset; set to null to disable cropping
  enableCrop = true,      // allow the adjust/crop step
}) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null); // file awaiting crop

  const pickFile = () => fileRef.current?.click();

  // Upload a File or Blob to the server and set the returned URL.
  const uploadBlob = async (blob, filename) => {
    setUploading(true); setError('');
    try {
      const asFile = blob instanceof File ? blob : new File([blob], filename || 'image.jpg', { type: blob.type || 'image/jpeg' });
      const { data } = await filesApi.upload(asFile);
      onChange(data.url);
    } catch (err) {
      const status = err.response?.status;
      if (status === 413) {
        setError('File is too large for the server to accept. Please use an image under 8 MB.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK') {
        setError('Upload failed — could not reach the server. Check your connection and try again.');
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) { setError('File is too large (max 12 MB).'); return; }
    setError('');
    if (enableCrop && cropRatio && /^image\//.test(file.type) && !/gif$/i.test(file.type)) {
      // Open the cropper first; upload happens after the admin frames it.
      setPendingFile(file);
    } else {
      uploadBlob(file, file.name);
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-500" />
          <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-8 pr-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
          />
        </div>
        <button type="button" onClick={pickFile} disabled={uploading}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold whitespace-nowrap disabled:opacity-60 transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
      {preview && value && (
        <div className="relative inline-block mt-2">
          <img
            src={value} alt="" loading="lazy" decoding="async"
            className="h-20 rounded-xl object-cover border border-gray-700"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <button type="button" onClick={() => onChange('')} title="Remove image"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow">
            <X className="h-3 w-3" />
          </button>
          {enableCrop && cropRatio && (
            <button type="button" onClick={pickFile} title="Replace & adjust"
              className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow">
              <CropIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Crop / optimize dialog — shown after picking a file (before upload). */}
      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          initialRatio={cropRatio || 'social'}
          onCancel={() => setPendingFile(null)}
          onCropped={(blob) => {
            setPendingFile(null);
            if (blob) uploadBlob(blob, 'navgrow-image.jpg');
          }}
        />
      )}
      {preview && !value && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1.5">
          <ImageIcon className="h-3 w-3" /> JPG, PNG, WEBP or GIF · up to 8 MB
        </p>
      )}
    </div>
  );
};

/**
 * MultiImageUploadButton — uploads one or more images and reports each URL,
 * for "one URL per line" gallery textareas.
 */
export const MultiImageUploadButton = ({ onUploaded, label = 'Upload images & add to gallery' }) => {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const handle = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setErr('');
    for (const f of files) {
      try {
        const { data } = await filesApi.upload(f);
        onUploaded(data.url);
      } catch (ex) {
        setErr(ex.response?.data?.message || `Upload failed for ${f.name}`);
        break;
      }
    }
    setBusy(false);
  };
  return (
    <div className="mt-2">
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-bold disabled:opacity-60 transition-colors">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Upload className="h-3.5 w-3.5"/>}
        {busy ? 'Uploading…' : label}
      </button>
      <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handle} className="hidden"/>
      {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
    </div>
  );
};

export default ImageUploadInput;
