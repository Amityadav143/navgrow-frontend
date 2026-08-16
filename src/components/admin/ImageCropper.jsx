/**
 * © 2024–2026 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * navgrow.org · info@navgrow.org
 *
 * ImageCropper — a dependency-free crop / reposition / resize dialog.
 *
 * Lets an admin frame exactly what an uploaded image should show before it is
 * saved, so every product and post has a purpose-built image that looks right
 * on the site AND in social-share cards (which need a 1.91:1 / 1200×630 image).
 *
 * Features:
 *   · Choose an aspect ratio (Social 1.91:1, Square 1:1, Product 4:3, Wide 16:9, Free)
 *   · Drag to reposition, zoom slider to scale
 *   · Exports a right-sized JPEG/PNG Blob via <canvas> (no libraries)
 *
 * Usage:
 *   <ImageCropper file={File} onCancel={fn} onCropped={(blob, dataUrl) => …} />
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, ZoomIn, Check, Crop as CropIcon, RotateCw } from 'lucide-react';

const RATIOS = [
  { key: 'social',  label: 'Social 1.91:1', value: 1200 / 630, w: 1200, h: 630, hint: 'Best for social sharing (WhatsApp, Facebook, LinkedIn)' },
  { key: 'square',  label: 'Square 1:1',    value: 1,           w: 1080, h: 1080, hint: 'Great for product grids & Instagram' },
  { key: 'product', label: 'Product 4:3',   value: 4 / 3,       w: 1200, h: 900,  hint: 'Standard product photo' },
  { key: 'wide',    label: 'Wide 16:9',     value: 16 / 9,      w: 1280, h: 720,  hint: 'Banners & hero images' },
  { key: 'free',    label: 'Original',      value: null,        w: 1600, h: 1600, hint: 'Keep the original proportions (just resized)' },
];

const VIEW_W = 460; // on-screen crop viewport width (px)

export default function ImageCropper({ file, initialRatio = 'social', onCancel, onCropped }) {
  const [imgEl, setImgEl] = useState(null);
  const [ratioKey, setRatioKey] = useState(initialRatio);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const dragRef = useRef(null);
  const objectUrlRef = useRef(null);

  const ratio = RATIOS.find(r => r.key === ratioKey) || RATIOS[0];

  // Load the selected file into an <img>.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const im = new Image();
    im.onload = () => setImgEl(im);
    im.src = url;
    return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
  }, [file]);

  // Viewport dimensions follow the chosen ratio.
  const viewH = ratio.value ? Math.round(VIEW_W / ratio.value)
    : (imgEl ? Math.round(VIEW_W * (imgEl.height / imgEl.width)) : VIEW_W);

  // Base scale so the image covers the viewport at zoom = 1.
  const baseScale = imgEl
    ? Math.max(VIEW_W / imgEl.width, viewH / imgEl.height)
    : 1;
  const scale = baseScale * zoom;

  // Reset framing when the image or ratio changes.
  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, [imgEl, ratioKey]);

  // ---- Drag to reposition --------------------------------------------------
  const onPointerDown = (e) => {
    const p = 'touches' in e ? e.touches[0] : e;
    dragRef.current = { sx: p.clientX, sy: p.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = useCallback((e) => {
    if (!dragRef.current || !imgEl) return;
    const p = 'touches' in e ? e.touches[0] : e;
    const dx = p.clientX - dragRef.current.sx;
    const dy = p.clientY - dragRef.current.sy;
    const dispW = imgEl.width * scale;
    const dispH = imgEl.height * scale;
    const maxX = Math.max(0, (dispW - VIEW_W) / 2);
    const maxY = Math.max(0, (dispH - viewH) / 2);
    const nx = Math.max(-maxX, Math.min(maxX, dragRef.current.ox + dx));
    const ny = Math.max(-maxY, Math.min(maxY, dragRef.current.oy + dy));
    setOffset({ x: nx, y: ny });
  }, [imgEl, scale, viewH]);
  const onPointerUp = () => { dragRef.current = null; };

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [onPointerMove]);

  // ---- Export via canvas ---------------------------------------------------
  const doCrop = async () => {
    if (!imgEl) return;
    setBusy(true);
    try {
      // Output size: the ratio's target (capped), preserving the crop mapping.
      const outW = ratio.value ? ratio.w : Math.min(ratio.w, imgEl.width);
      const outH = ratio.value ? ratio.h : Math.round(outW * (imgEl.height / imgEl.width));

      const canvas = document.createElement('canvas');
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // Map the on-screen viewport → output canvas.
      const ratioOut = outW / VIEW_W; // viewport px → output px
      const dispW = imgEl.width * scale;
      const dispH = imgEl.height * scale;
      // Top-left of the image relative to the viewport, in viewport px.
      const imgLeft = (VIEW_W - dispW) / 2 + offset.x;
      const imgTop  = (viewH - dispH) / 2 + offset.y;

      ctx.save();
      if (rotation) {
        ctx.translate(outW / 2, outH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-outW / 2, -outH / 2);
      }
      ctx.drawImage(
        imgEl,
        imgLeft * ratioOut, imgTop * ratioOut,
        dispW * ratioOut, dispH * ratioOut
      );
      ctx.restore();

      const isPng = /png$/i.test(file?.type || '');
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const blob = await new Promise(res => canvas.toBlob(res, mime, 0.88));
      const dataUrl = canvas.toDataURL(mime, 0.6); // small preview
      onCropped?.(blob, dataUrl, { width: outW, height: outH });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onCancel?.(); }}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h3 className="flex items-center gap-2 text-white font-bold text-sm"><CropIcon className="h-4 w-4 text-blue-400"/> Adjust image</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
        </div>

        <div className="p-5">
          {/* Ratio chooser */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {RATIOS.map(r => (
              <button key={r.key} type="button" onClick={() => setRatioKey(r.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${ratioKey===r.key ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mb-3">{ratio.hint}</p>

          {/* Crop viewport */}
          <div
            className="relative mx-auto overflow-hidden rounded-xl bg-gray-950 border border-gray-700 cursor-move select-none"
            style={{ width: VIEW_W, height: viewH, maxWidth: '100%' }}
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          >
            {imgEl && (
              <img
                src={objectUrlRef.current}
                alt="crop"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: imgEl.width * scale,
                  height: imgEl.height * scale,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) rotate(${rotation}deg)`,
                  maxWidth: 'none',
                }}
              />
            )}
            {/* Rule-of-thirds guide */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/40" />)}
            </div>
          </div>

          {/* Zoom + rotate */}
          <div className="flex items-center gap-3 mt-4">
            <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
            <input type="range" min="1" max="3" step="0.01" value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-blue-500" />
            <button type="button" onClick={() => setRotation(r => (r + 90) % 360)}
              title="Rotate 90°"
              className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white">
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={doCrop} disabled={busy || !imgEl}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60">
              <Check className="h-4 w-4" /> {busy ? 'Processing…' : 'Apply & upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
