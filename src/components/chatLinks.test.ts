import { describe, expect, it } from 'vitest';
import { splitLinks } from './chatLinks';

const links = (t: string) => splitLinks(t).filter(s => s.type === 'link');

describe('splitLinks', () => {
  it('transforme WhatsApp et la page Assurance en boutons', () => {
    const segs = splitLinks('Écrivez-nous : https://wa.me/33743767400 puis demandez un devis : https://nordrive-flotte.com/assurance.');
    expect(segs.filter(s => s.type === 'link')).toEqual([
      { type: 'link', href: 'https://wa.me/33743767400', label: 'Écrire sur WhatsApp', external: true },
      { type: 'link', href: 'https://nordrive-flotte.com/assurance', label: 'Voir la page Assurance', external: false },
    ]);
    expect(segs[segs.length - 1]).toEqual({ type: 'text', text: '.' }); // le point final n'est pas dans l'adresse
  });

  it('gère le formulaire et les parenthèses', () => {
    expect(links('(voir https://nordrive-flotte.com/#formulaire)')).toEqual([
      { type: 'link', href: 'https://nordrive-flotte.com/#formulaire', label: 'Ouvrir le formulaire', external: false },
    ]);
  });

  it('ne rend jamais cliquable une adresse étrangère ou piégée', () => {
    for (const bad of [
      'https://evil.example/assurance',
      'https://nordrive-flotte.com.evil.example/',
      'https://wa.me/abc',
      'https://wa.me/33743767400/../x',
      'http://nordrive-flotte.com/faq',
      'https://user:pass@nordrive-flotte.com/',
      'javascript:alert(1)',
    ]) {
      expect(links(`Cliquez ${bad}`)).toEqual([]);
    }
  });

  it('conserve tout le texte autour', () => {
    const segs = splitLinks('a https://nordrive-flotte.com/faq b');
    expect(segs.map(s => (s.type === 'text' ? s.text : '<L>')).join('')).toBe('a <L> b');
  });
});
