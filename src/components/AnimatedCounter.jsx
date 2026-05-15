import React, { useEffect, useRef, useState } from 'react';

const AnimatedCounter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
          const startTime = performance.now();
          const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * numericTarget));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
  const hasPlus = target.includes('+');

  return (
    <span ref={ref} className="tabular-nums">
      {count}{hasPlus && count >= numericTarget ? '+' : ''}{suffix}
    </span>
  );
};

export default AnimatedCounter;
