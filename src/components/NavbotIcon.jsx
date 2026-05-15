/**
 * NavbotIcon — Custom branded SVG AI icon for Navgrow's NavBot
 * Blue-navy shell + gold neural rings + white spark
 * Designed to feel authoritative, technical, and trustworthy
 * Usage: <NavbotIcon size={40} />
 */
import React from 'react';

const NavbotIcon = ({ size = 40, className = '', animated = false }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 56 56"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="NavBot AI"
  >
    <defs>
      {/* Blue radial glow center */}
      <radialGradient id="nb-core" cx="50%" cy="45%" r="50%">
        <stop offset="0%"   stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </radialGradient>
      {/* Gold ring gradient */}
      <linearGradient id="nb-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#f59e0b" />
        <stop offset="50%"  stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      {/* Outer shell gradient */}
      <linearGradient id="nb-shell" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#1e40af" />
        <stop offset="100%" stopColor="#0c1845" />
      </linearGradient>
      {/* Inner glow filter */}
      <filter id="nb-glow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    {/* ── Outer hexagonal shell ── */}
    <path
      d="M28 3 L49 14.5 L49 37.5 L28 53 L7 37.5 L7 14.5 Z"
      fill="url(#nb-shell)"
      stroke="#2563eb"
      strokeWidth="0.75"
    />

    {/* ── Gold orbit ring (rotated ellipse) ── */}
    <ellipse
      cx="28" cy="28" rx="19" ry="7"
      fill="none"
      stroke="url(#nb-gold)"
      strokeWidth="1.4"
      strokeDasharray="3 2"
      transform="rotate(-35 28 28)"
      opacity="0.85"
    />

    {/* ── Second gold orbit (perpendicular) ── */}
    <ellipse
      cx="28" cy="28" rx="19" ry="7"
      fill="none"
      stroke="url(#nb-gold)"
      strokeWidth="1"
      strokeDasharray="2 3"
      transform="rotate(35 28 28)"
      opacity="0.55"
    />

    {/* ── Core circle (AI brain) ── */}
    <circle cx="28" cy="28" r="12" fill="url(#nb-core)" />
    <circle cx="28" cy="28" r="12" fill="none" stroke="#60a5fa" strokeWidth="0.75" opacity="0.6" />

    {/* ── Neural network dots inside core ── */}
    {/* Central node */}
    <circle cx="28" cy="28" r="2.2" fill="#fbbf24" />
    {/* 6 outer nodes */}
    {[0,60,120,180,240,300].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const x   = 28 + 7 * Math.cos(rad);
      const y   = 28 + 7 * Math.sin(rad);
      return (
        <g key={i}>
          {/* Connection line */}
          <line x1="28" y1="28" x2={x} y2={y}
            stroke="#93c5fd" strokeWidth="0.6" opacity="0.6" />
          {/* Node */}
          <circle cx={x} cy={y} r="1.3"
            fill={i % 2 === 0 ? "#60a5fa" : "#fbbf24"}
            opacity="0.9" />
        </g>
      );
    })}

    {/* ── Spark / lightning bolt (AI action symbol) ── */}
    <path
      d="M30 20 L25.5 28.5 L29 28.5 L26 36 L32.5 26 L28.5 26 Z"
      fill="white"
      opacity="0.95"
      filter="url(#nb-glow)"
    />

    {/* ── Corner accent dots ── */}
    <circle cx="11" cy="11" r="1.5" fill="#fbbf24" opacity="0.6" />
    <circle cx="45" cy="11" r="1.5" fill="#fbbf24" opacity="0.6" />
    <circle cx="11" cy="45" r="1"   fill="#60a5fa" opacity="0.5" />
    <circle cx="45" cy="45" r="1"   fill="#60a5fa" opacity="0.5" />

    {/* ── Optional pulse animation ── */}
    {animated && (
      <circle cx="28" cy="28" r="14" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0">
        <animate attributeName="r" from="14" to="24" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
      </circle>
    )}
  </svg>
);

export default NavbotIcon;
