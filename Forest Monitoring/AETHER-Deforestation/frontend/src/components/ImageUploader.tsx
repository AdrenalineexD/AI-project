import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface ImageUploaderProps {
  onImagesSelected: (before: File, after: File) => void;
  onAnalyze: (before?: File, after?: File) => void;
  loading: boolean;
  disabled: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelected,
  onAnalyze,
  loading,
  disabled,
}) => {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [beforeDimensions, setBeforeDimensions] = useState<{ w: number; h: number } | null>(null);
  const [afterDimensions, setAfterDimensions] = useState<{ w: number; h: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Sync valid files to parent component state reliably
  useEffect(() => {
    if (
      beforeFile &&
      afterFile &&
      beforeDimensions?.w === 480 &&
      afterDimensions?.w === 480
    ) {
      onImagesSelected(beforeFile, afterFile);
    }
  }, [beforeFile, afterFile, beforeDimensions, afterDimensions, onImagesSelected]);

  const validateAndSetImage = (
    file: File,
    type: 'before' | 'after'
  ) => {
    setErrorMsg(null);
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      if (img.width !== 480 || img.height !== 480) {
        setErrorMsg(`Expected image dimensions: 480×480 pixels. Selected ${type} image is ${img.width}×${img.height}.`);
        if (type === 'before') {
          setBeforeFile(null);
          setBeforePreview(null);
          setBeforeDimensions(null);
        } else {
          setAfterFile(null);
          setAfterPreview(null);
          setAfterDimensions(null);
        }
        return;
      }

      if (type === 'before') {
        setBeforeFile(file);
        setBeforePreview(url);
        setBeforeDimensions({ w: img.width, h: img.height });
      } else {
        setAfterFile(file);
        setAfterPreview(url);
        setAfterDimensions({ w: img.width, h: img.height });
      }
    };

    img.onerror = () => {
      setErrorMsg(`Failed to decode selected ${type} image.`);
    };

    img.src = url;
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetImage(e.target.files[0], type);
    }
  };

  const handleLoadSample = async () => {
    setErrorMsg(null);
    try {
      // Fetch sample pair test_000011
      const resA = await fetch('/samples/test_000011_A.png');
      const resB = await fetch('/samples/test_000011_B.png');

      if (!resA.ok || !resB.ok) {
        throw new Error('Failed to load sample pair test_000011.');
      }

      const blobA = await resA.blob();
      const blobB = await resB.blob();

      const fileA = new File([blobA], 'test_000011_A.png', { type: 'image/png' });
      const fileB = new File([blobB], 'test_000011_B.png', { type: 'image/png' });

      validateAndSetImage(fileA, 'before');
      validateAndSetImage(fileB, 'after');
    } catch (err: any) {
      setErrorMsg('Error loading sample pair: ' + err.message);
    }
  };

  const isReady = beforeFile && afterFile && beforeDimensions?.w === 480 && afterDimensions?.w === 480 && !loading && !disabled;

  return (
    <div className="glass-card space-y-5">
      {/* Card Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            Bi-Temporal Satellite Image Input
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload paired 480×480 RGB satellite images (Before &amp; Afterlogging/clearing)</p>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-xs font-mono transition shadow"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Load Sample Pair (test_000011)</span>
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two-Column Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BEFORE IMAGE BOX */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              BEFORE IMAGE (A)
            </span>
            {beforeDimensions && (
              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                {beforeDimensions.w}×{beforeDimensions.h} RGB
              </span>
            )}
          </div>

          <div
            onClick={() => beforeInputRef.current?.click()}
            className={`relative group aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition overflow-hidden ${
              beforePreview
                ? 'border-emerald-500/50 bg-slate-900/60'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
            }`}
          >
            <input
              ref={beforeInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'before')}
            />

            {beforePreview ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={beforePreview}
                  alt="Before Preview"
                  className="w-full h-full object-contain rounded-lg shadow"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                  <span className="text-xs text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Change Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2 text-slate-400">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition" />
                <p className="text-xs font-medium text-slate-300">Click or drag BEFORE satellite image</p>
                <p className="text-[10px] text-slate-500 font-mono">Required: 480 × 480 pixels RGB</p>
              </div>
            )}
          </div>
          {beforeFile && (
            <p className="text-[11px] text-slate-400 truncate font-mono">File: {beforeFile.name}</p>
          )}
        </div>

        {/* AFTER IMAGE BOX */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              AFTER IMAGE (B)
            </span>
            {afterDimensions && (
              <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                {afterDimensions.w}×{afterDimensions.h} RGB
              </span>
            )}
          </div>

          <div
            onClick={() => afterInputRef.current?.click()}
            className={`relative group aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 cursor-pointer transition overflow-hidden ${
              afterPreview
                ? 'border-emerald-500/50 bg-slate-900/60'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
            }`}
          >
            <input
              ref={afterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, 'after')}
            />

            {afterPreview ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={afterPreview}
                  alt="After Preview"
                  className="w-full h-full object-contain rounded-lg shadow"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                  <span className="text-xs text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 font-mono flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Change Image
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2 text-slate-400">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-amber-400 transition" />
                <p className="text-xs font-medium text-slate-300">Click or drag AFTER satellite image</p>
                <p className="text-[10px] text-slate-500 font-mono">Required: 480 × 480 pixels RGB</p>
              </div>
            )}
          </div>
          {afterFile && (
            <p className="text-[11px] text-slate-400 truncate font-mono">File: {afterFile.name}</p>
          )}
        </div>
      </div>

      {/* ANALYZE BUTTON */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          disabled={!isReady}
          onClick={() => {
            if (beforeFile && afterFile) {
              onAnalyze(beforeFile, afterFile);
            }
          }}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg ${
            isReady
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Executing Locked U-Net Inference...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Analyze Deforestation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
