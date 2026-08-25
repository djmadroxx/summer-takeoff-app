import { memo } from 'react';

export const Logo = memo(function Logo() {
  return (
    <div className="brand-logo" aria-label="Summer Takeoff">
      <span>SUMMER</span>
      <span className="brand-divider">
        <i /> TAKEOFF <i />
      </span>
    </div>
  );
});
