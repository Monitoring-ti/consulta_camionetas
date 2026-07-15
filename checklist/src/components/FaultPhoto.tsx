'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, MapPin } from 'lucide-react';

interface FaultPhotoProps {
  itemKey: string;
  hint?: string;
  onPhotoChange: (file: File | null, geoTag: string) => void;
}

export default function FaultPhoto({ itemKey, hint, onPhotoChange }: FaultPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [geoTag, setGeoTag] = useState<string>('');
  const [locating, setLocating] = useState(false);

  const captureGeo = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('geolocalización no disponible');
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const tag = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)} @ ${new Date().toLocaleString('es-CL')}`;
          setGeoTag(tag);
          setLocating(false);
          resolve(tag);
        },
        () => {
          const tag = `sin GPS @ ${new Date().toLocaleString('es-CL')}`;
          setGeoTag(tag);
          setLocating(false);
          resolve(tag);
        },
        { timeout: 5000 }
      );
    });
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    const geo = await captureGeo();
    onPhotoChange(file, geo);
  };

  const clear = () => {
    setPreview(null);
    setGeoTag('');
    onPhotoChange(null, '');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="fault-photo-box">
      {hint && <p className="fault-hint"><span>📷</span> {hint}</p>}
      {preview ? (
        <div className="fault-preview-wrap">
          <img src={preview} alt="hallazgo" className="fault-preview" />
          {geoTag && (
            <div className="fault-geo">
              <MapPin size={12} /> {geoTag}
            </div>
          )}
          <button type="button" className="fault-clear" onClick={clear}>
            <XCircle size={16} /> Cambiar foto
          </button>
        </div>
      ) : (
        <label className="fault-upload-btn">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          {locating ? (
            <span>Obteniendo GPS…</span>
          ) : (
            <>
              <Camera size={18} />
              <span>Tomar foto del hallazgo</span>
              <span className="fault-required">Obligatorio</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
