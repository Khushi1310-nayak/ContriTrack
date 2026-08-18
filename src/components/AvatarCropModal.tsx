"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from "lucide-react";

interface AvatarCropModalProps {
  imageSrc: string;
  onSave: (croppedBase64: string) => void;
  onClose: () => void;
}

export default function AvatarCropModal({ imageSrc, onSave, onClose }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Canvas dimensions
  const CANVAS_SIZE = 280;
  const OUTPUT_SIZE = 256;

  // Load the source image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);

      // Center the image initially
      const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      const scaledW = img.width * scale;
      const scaledH = img.height * scale;
      setOffset({
        x: (CANVAS_SIZE - scaledW) / 2,
        y: (CANVAS_SIZE - scaledH) / 2,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate scaled dimensions
    const baseScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
    const scale = baseScale * zoom;
    const scaledW = img.width * scale;
    const scaledH = img.height * scale;

    // Draw the image
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, scaledW, scaledH);
    ctx.restore();

    // Draw circular overlay guide (outer dimmed area)
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Circle border
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(242, 193, 163, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [zoom, offset]);

  useEffect(() => {
    if (imageLoaded) {
      requestAnimationFrame(draw);
    }
  }, [draw, imageLoaded]);

  // Mouse/Touch drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Reset position and zoom
  const handleReset = () => {
    const img = imageRef.current;
    if (!img) return;
    setZoom(1);
    const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
    const scaledW = img.width * scale;
    const scaledH = img.height * scale;
    setOffset({
      x: (CANVAS_SIZE - scaledW) / 2,
      y: (CANVAS_SIZE - scaledH) / 2,
    });
  };

  // Export the cropped image
  const handleSave = () => {
    const img = imageRef.current;
    if (!img) return;

    setIsSaving(true);

    // Render to output canvas at final resolution
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    const baseScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
    const scale = baseScale * zoom;
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;

    // Clip to circle
    outCtx.beginPath();
    outCtx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();

    outCtx.drawImage(
      img,
      offset.x * ratio,
      offset.y * ratio,
      img.width * scale * ratio,
      img.height * scale * ratio
    );

    // Export as compressed JPEG
    const base64 = outputCanvas.toDataURL("image/jpeg", 0.85);
    
    setTimeout(() => {
      onSave(base64);
      setIsSaving(false);
    }, 300);
  };

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md mx-4 rounded-3xl bg-[#111221]/95 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-serif text-white font-normal">Crop Identity Avatar</h3>
              <p className="text-[10px] text-[#857C91] font-mono uppercase tracking-wider">Drag to reposition • Scroll to zoom</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex flex-col items-center gap-5 px-6 py-6">
            {/* Circular preview container */}
            <div
              className="relative rounded-full overflow-hidden border-2 border-[#F2C1A3]/30 shadow-[0_0_40px_rgba(242,193,163,0.08)]"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />

              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/[0.04]" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/[0.04]" />
              </div>

              {/* Loading state */}
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111221]">
                  <div className="w-6 h-6 border-2 border-[#F2C1A3]/30 border-t-[#F2C1A3] rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3 w-full max-w-[280px]">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-[#857C91] hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ZoomOut size={14} />
              </button>

              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 appearance-none rounded-full bg-white/10 outline-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F2C1A3] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#111221] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(242,193,163,0.4)] [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#F2C1A3] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#111221] [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between mt-1 text-[8px] font-mono text-[#525871]">
                  <span>0.5×</span>
                  <span className="text-[#F2C1A3]">{zoom.toFixed(1)}×</span>
                  <span>3.0×</span>
                </div>
              </div>

              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 text-[#857C91] hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/[0.01]">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[#857C91] text-[10px] font-mono uppercase tracking-wider hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <RotateCcw size={12} />
              Reset
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[#857C91] text-[10px] font-mono uppercase tracking-wider hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !imageLoaded}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-[10px] font-bold uppercase tracking-wider transition shadow-lg shadow-[#F2C1A3]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-[#12131e]/30 border-t-[#12131e] rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    Save Avatar
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
