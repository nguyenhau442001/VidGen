import React from "react";

// Stylized recreation of the Google Maps pin mark — a folded-paper teardrop
// pin split into the four Google brand colors, used anywhere the UI needs to
// read unambiguously as "this is Google Maps" rather than a generic map app.
export const GoogleMapsIcon: React.FC<{ size?: number }> = ({ size = 20 }) => {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
      <path
        d="M18 2C10.8 2 5 7.8 5 15c0 9.5 13 19 13 19s13-9.5 13-19c0-7.2-5.8-13-13-13z"
        fill="#34A853"
      />
      <path d="M18 2C10.8 2 5 7.8 5 15c0 3.1 1.2 6.4 2.9 9.4L18 15z" fill="#4285F4" />
      <path d="M7.9 24.4C9.9 28 12.9 31.4 15.4 34c0.9 0.9 1.3 1.3 2.6 0-1.3-1.3-6.8-7.4-10.1-9.6z" fill="#FBBC04" />
      <path d="M18 2c7.2 0 13 5.8 13 13 0 3.1-1.2 6.4-2.9 9.4L18 15z" fill="#1A73E8" />
      <path d="M28.1 24.4C26.1 28 23.1 31.4 20.6 34c-0.9 0.9-1.3 1.3-2.6 0 1.3-1.3 6.8-7.4 10.1-9.6z" fill="#EA4335" />
      <circle cx="18" cy="15" r="5.5" fill="#fff" />
    </svg>
  );
};
