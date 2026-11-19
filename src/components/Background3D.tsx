import React from 'react';

/**
 * Fond studio Nordrive (ardoise / midnight + halo saphir + reflet or champagne).
 * 100 % CSS : aucun canvas, aucune animation JS => pas de plantage possible,
 * zéro coût CPU/batterie sur mobile, rendu identique à la DA du flyer.
 */
export const Background3D: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
      background: [
        'radial-gradient(ellipse 65% 55% at 50% 22%, rgba(56, 88, 124, 0.30) 0%, rgba(38, 60, 86, 0.14) 45%, rgba(0, 0, 0, 0) 80%)',
        'radial-gradient(ellipse 50% 40% at 78% 8%, rgba(230, 200, 117, 0.10) 0%, rgba(0, 0, 0, 0) 70%)',
        'linear-gradient(180deg, #0c131c 0%, #111a26 30%, #0e1622 65%, #080d14 100%)',
      ].join(', '),
      backgroundColor: '#0c131c',
    }}
  />
);
