import { describe, expect, it } from 'vitest';
import { answerText, answerTopic, looksSensitive, MENU, normalize, TOPICS, WELCOME } from './chatEngine';
import { splitLinks } from './chatLinks';

const ids = new Set(TOPICS.map(t => t.id));

describe('cohérence des sujets', () => {
  it('les identifiants sont uniques et tous les boutons proposés existent', () => {
    expect(ids.size).toBe(TOPICS.length);
    for (const t of TOPICS) for (const n of t.next) expect(ids.has(n), `${t.id} -> ${n}`).toBe(true);
    for (const m of MENU) expect(ids.has(m)).toBe(true);
    for (const c of WELCOME.chips) expect(ids.has(c)).toBe(true);
  });

  it('chaque sujet a un titre, des mots-clés et une réponse', () => {
    for (const t of TOPICS) {
      expect(t.title.length).toBeGreaterThan(2);
      expect(t.keywords.length).toBeGreaterThan(0);
      expect(t.answer.length).toBeGreaterThan(20);
      for (const k of t.keywords) expect(k, `${t.id}: « ${k} »`).toBe(normalize(k));
    }
  });

  it('toutes les adresses des réponses sont autorisées (deviennent des boutons)', () => {
    for (const t of TOPICS) {
      const urls = t.answer.match(/https?:\/\/[^\s]+/g) ?? [];
      for (const u of urls) expect(splitLinks(u).some(s => s.type === 'link'), `${t.id}: ${u}`).toBe(true);
    }
  });
});

describe('reconnaissance des questions', () => {
  const topicOf = (q: string) => TOPICS.find(t => answerText(q).text === t.answer)?.id;

  it.each([
    ['Combien ça coûte ?', 'prix'],
    ['quel est le tarif', 'prix'],
    ['Je ne roule pas cette semaine, je paie quoi ?', 'semaine_sans'],
    ['Quand est-ce que je suis payé ?', 'paiement'],
    ['Quels documents faut-il fournir ?', 'rattachement'],
    ['je veux me rattacher', 'rattachement'],
    ['Je suis propriétaire de ma voiture', 'sit_proprio'],
    ['je loue déjà une voiture', 'sit_loue'],
    ['je veux louer une voiture', 'location'],
    ['Je suis déjà inscrit sur Uber, je perds ma note ?', 'compte_existant'],
    ['Puis-je arrêter quand je veux ?', 'arret'],
    ['Ma voiture a plus de 12 ans', 'vieux'],
    ['En combien de temps j\'ai mon macaron ?', 'delai'],
    ['Est-ce que j\'ai une fiche de paie ?', 'contrat'],
    ['Comment marche le parrainage ?', 'parrainage'],
    ['Je peux rouler à Lyon ?', 'zones'],
    ['Qui paie les amendes ?', 'amendes'],
    ['Et le carburant, c\'est qui ?', 'entretien'],
    ['L\'assurance est comprise ?', 'assurance'],
    ['Combien je gagne par mois ?', 'simulateur'],
    ['Je veux parler à quelqu\'un', 'contact'],
  ])('« %s » → %s', (q, expected) => {
    expect(topicOf(q)).toBe(expected);
  });

  it('une question inconnue propose les sujets et WhatsApp, sans inventer', () => {
    const r = answerText('Quelle est la capitale du Japon ?');
    expect(r.text).toContain('Je n’ai pas la réponse');
    expect(r.text).toContain('https://wa.me/33743767400');
    expect(r.chips).toEqual(MENU);
  });

  it('une salutation donne le menu', () => {
    expect(answerText('Bonjour').chips).toEqual(MENU);
  });

  it('un message vide ne plante pas', () => {
    expect(answerText('   ').chips).toEqual(MENU);
  });
});

describe('données sensibles', () => {
  it.each(['FR76 3000 6000 0112 3456 7890 189', 'mon mail est a.b@gmail.com', 'mon numéro 0612345678'])('refuse : %s', q => {
    expect(looksSensitive(q)).toBe(true);
    expect(answerText(q).text).toContain('n’écrivez pas ici');
  });
  it('ne bloque pas les questions normales avec des chiffres', () => {
    for (const q of ['50 euros par semaine ?', 'voiture de 12 ans', 'jusqu à 200 euros']) expect(looksSensitive(q)).toBe(false);
  });
});

describe('parcours de rattachement validé', () => {
  it('propriétaire : e-mails Uber et Bolt, coordonnées différentes, carte grise, formulaire et WhatsApp', () => {
    const t = answerTopic('sit_proprio').text;
    expect(t).toMatch(/nom et prénom/);
    expect(t).toMatch(/compte Uber et celle de votre compte Bolt/);
    expect(t).toMatch(/téléphone de votre compte Uber/);
    expect(t).toMatch(/carte grise/);
    expect(t).toMatch(/pas dans cette discussion/);
    expect(t).toContain('#formulaire');
  });
  it('locataire : carte grise du véhicule utilisé', () => {
    expect(answerTopic('sit_loue').text).toMatch(/carte grise du véhicule que vous utilisez/);
  });
  it('veut louer : pas de carte grise, renvoi vers WhatsApp, aucun prix annoncé', () => {
    const t = answerTopic('location').text;
    expect(t).toMatch(/pas de carte grise/);
    expect(t).toContain('wa.me');
    expect(t).not.toMatch(/\d+ ?€/);
  });
});
