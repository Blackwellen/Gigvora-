'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapTilerMarker = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
};

export type MapTilerStyle = 'streets' | 'satellite' | 'dark';

export type MapTilerMapProps = {
  center: [number, number];
  zoom: number;
  markers?: MapTilerMarker[];
  height?: string;
  className?: string;
  interactive?: boolean;
  style?: MapTilerStyle;
};

// MapTiler hosted style ids. If MapTiler renames/retires an id, swap it here —
// the component only needs a valid `style.json` URL.
const STYLE_IDS: Record<MapTilerStyle, string> = {
  streets: 'streets-v2',
  satellite: 'satellite',
  dark: 'streets-v2-dark',
};

function buildStyleUrl(style: MapTilerStyle, apiKey: string) {
  return `https://api.maptiler.com/maps/${STYLE_IDS[style]}/style.json?key=${apiKey}`;
}

export default function MapTilerMap({
  center,
  zoom,
  markers = [],
  height = '400px',
  className,
  interactive = true,
  style = 'streets',
}: MapTilerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [failed, setFailed] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  useEffect(() => {
    if (!apiKey || !containerRef.current) {
      if (!apiKey) setFailed(true);
      return;
    }

    let cancelled = false;
    setFailed(false);

    const map = new MapLibreMap({
      container: containerRef.current,
      style: buildStyleUrl(style, apiKey),
      center,
      zoom,
      interactive,
      attributionControl: { compact: true },
    });

    const handleError = () => {
      if (!cancelled) setFailed(true);
    };
    map.on('error', handleError);

    if (interactive) {
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    }

    mapRef.current = map;

    return () => {
      cancelled = true;
      map.off('error', handleError);
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, style]);

  // Keep center/zoom in sync when props change after mount.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.jumpTo({ center, zoom });
  }, [center, zoom]);

  // Render markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    markers.forEach((markerData) => {
      const el = document.createElement('div');
      el.setAttribute('aria-label', markerData.label ?? 'Map marker');
      el.style.width = '28px';
      el.style.height = '36px';
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 2px 4px rgba(20, 30, 60, 0.35))';
      el.innerHTML = `
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#1d5bf5"/>
          <circle cx="14" cy="14" r="5.5" fill="white"/>
        </svg>
      `;

      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([markerData.lng, markerData.lat]);

      if (markerData.label) {
        const popup = new Popup({ offset: 28, closeButton: true }).setHTML(
          `<div style="font: 500 13px/1.4 system-ui, sans-serif; color: #14161d; padding: 2px 4px;">${escapeHtml(
            markerData.label,
          )}</div>`,
        );
        marker.setPopup(popup);
      }

      marker.addTo(map);
      markerRefs.current.push(marker);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  if (!apiKey || failed) {
    return (
      <div
        className={className}
        style={{
          height,
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #d5d9e2',
          background:
            'linear-gradient(135deg, #f6f7f9 0%, #eceef2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '6px',
          color: '#66718a',
          fontSize: '13px',
          textAlign: 'center',
          padding: '16px',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"
            stroke="#8590a5"
            strokeWidth="1.5"
          />
          <circle cx="12" cy="9" r="2.5" stroke="#8590a5" strokeWidth="1.5" />
        </svg>
        <span>Map unavailable</span>
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }} />;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
