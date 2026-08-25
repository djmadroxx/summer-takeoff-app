import { memo } from 'react';

export const AnimatedBackground = memo(function AnimatedBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <video
        className="ambient-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/bgvid.mp4" type="video/mp4" />
      </video>

      <div className="ambient-video-overlay" />

      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-grid" />
      <div className="ambient-noise" />
    </div>
  );
});