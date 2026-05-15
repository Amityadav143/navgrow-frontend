import React, { useState, useEffect } from 'react';
import { motion, useSpring, useScroll } from 'framer-motion';

const PageProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #1d4ed8, #3b82f6, #06b6d4)',
      }}
    />
  );
};

export default PageProgress;
