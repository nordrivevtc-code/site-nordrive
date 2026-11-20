import React, { useState, useEffect } from 'react';
import { 
  MessageSquare,
  Lock,
  UploadCloud,
  ShieldCheck,
  CreditCard,
  Car,
  Menu,
  X,
  ArrowRight,
  FileText,
  CheckCircle2
} from 'lucide-react';
import type { Driver, DriverDocument, PlatformType } from '../types/fleet';
import { Background3D } from './Background3D';
import { HomePage } from './HomePage';
import { applySeo } from '../lib/seo';
import { ComparatifPage, AssurancePage, SimulatorPage, ParrainagePage, AboutPage, FaqPage, ContactPage, NotFoundPage } from './SubPages';
import { track, trackOnce } from '../lib/analytics';
import { getAcquisition } from '../lib/acquisition';
import { apiEnabled, SECURE_DOC_TYPES, sendMessage, submitApplicationSecure, submitMessageSecure } from '../lib/api';
import { CustomCursor } from './CustomCursor';
import { SignaturePad } from './SignaturePad';

interface PublicPortalProps {
  onRegisterDriver: (
    newDriver: Omit<Driver, 'id' | 'createdAt' | 'status' | 'documents' | 'commissionRate' | 'fixedWeeklyFee' | 'activities'>,
    uploadedDocs?: Array<{ name: string; type: DriverDocument['type']; fileUrl?: string }>
  ) => void;
  onOpenAdminCrm: () => void;
  drivers: Driver[];
}

/** Adresse sans « / » final (« /faq/ » → « /faq ») */
const normPath = (p: string) => p.replace(/\/+$/, '') || '/';

/** Pages qui existent ; toute autre adresse affiche la page « introuvable » (et est servie en 404 par le serveur). */
const KNOWN_PATHS = ['/', '/comparatif', '/assurance', '/simulateur', '/parrainage', '/qui-sommes-nous', '/faq', '/contact'];

export const PublicPortal: React.FC<PublicPortalProps> = ({ onRegisterDriver, onOpenAdminCrm, drivers }) => {
  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(typeof window !== 'undefined' ? normPath(window.location.pathname) : '/');

  // popstate listener for back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // navigation method
  const navigateTo = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Scroll logic on path changes
  useEffect(() => {
    const hash = window.location.hash;
    if (currentPath === '/' && hash) {
      const id = hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const yOffset = -70; // Header offset
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPath]);

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdDriverName, setCreatedDriverName] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 900 : false);
  // Menu compact (hamburger) tant que la barre de navigation complète ne tient pas dans la largeur
  const [isNarrow, setIsNarrow] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 1180 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
      setIsNarrow(window.innerWidth < 1180);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 150);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const showAdminButton = isLocalhost && (searchParams.get('admin') === 'true' || searchParams.get('mode') === 'crm');



  // RGPD Consent
  const [rgpdConsent, setRgpdConsent] = useState<boolean>(false);
  // Champ piège anti-robot (invisible pour les humains, doit rester vide)
  const [honeypot, setHoneypot] = useState<string>('');

  // Cookie banner
  const [legalModalContent, setLegalModalContent] = useState<'mentions' | 'confidentialite' | 'cgu' | 'rgpd' | null>(null);

  // Real-time rattached drivers count (actif + rattache statuses)
  const rattacheCount = drivers.filter(d => d.status === 'rattache' || d.status === 'actif').length;
  const [displayedCount, setDisplayedCount] = useState<number>(rattacheCount);

  // Animate counter whenever rattacheCount changes
  useEffect(() => {
    const start = displayedCount;
    const end = rattacheCount;
    if (start === end) return;
    const step = end > start ? 1 : -1;
    const delay = Math.max(30, Math.min(200, Math.round(1000 / Math.abs(end - start))));
    const timer = setInterval(() => {
      setDisplayedCount(prev => {
        if (prev === end) { clearInterval(timer); return prev; }
        return prev + step;
      });
    }, delay);
    return () => clearInterval(timer);
  }, [rattacheCount]);

  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Referral Form State
  const [referralForm, setReferralForm] = useState({
    referrerName: '',
    referrerPhone: '',
    friendName: '',
    friendPhone: '',
  });
  const [referralSubmitted, setReferralSubmitted] = useState<boolean>(false);
  const [referralError, setReferralError] = useState<string>('');
  const digitsOnly = (p: string) => p.replace(/\D/g, '').replace(/^33/, '0');
  // Tolérant : accepte 06 12 34 56 78, 0612345678, +33 6 12 34 56 78, etc.
  const FR_PHONE_PATTERN = '^\\+?[0-9][0-9\\s.\\-]{8,17}$';

  // Insurance Form State
  const [insuranceForm, setInsuranceForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    city: 'Paris (Île-de-France)',
    insuranceType: 'rc_circulation_pro' as 'rc_circulation_pro' | 'flotte_vtc' | 'vehicule_tout_risque',
    vehicleModel: '',
    vehiclePlate: '',
    notes: '',
  });

  const [insuranceDocs, setInsuranceDocs] = useState<{
    carteGrise?: { file: File; name: string };
    permisConduire?: { file: File; name: string };
    releveInformation?: { file: File; name: string };
  }>({});

  const [insuranceIsSubmitting, setInsuranceIsSubmitting] = useState<boolean>(false);
  const [insuranceSubmitted, setInsuranceSubmitted] = useState<boolean>(false);

  const handleInsuranceFileChange = (docKey: keyof typeof insuranceDocs, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setInsuranceDocs(prev => ({
        ...prev,
        [docKey]: { file, name: file.name }
      }));
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: 'Paris (Île-de-France)',
    hasVtcCard: true,
    vtcCardStatus: 'oui' as 'oui' | 'non' | 'encours',
    companyName: '',
    siren: '',
    hasVehicle: true,
    vehicleModel: '',
    vehiclePlate: '',
    platforms: ['uber', 'bolt', 'heetch'] as PlatformType[],
    notes: '',
  });

  // Optional Uploaded Files state
  const [optionalDocs, setOptionalDocs] = useState<{
    vtcRecto?: { file: File; name: string };
    vtcVerso?: { file: File; name: string };
    rcCirculation?: { file: File; name: string };
    carteGrise?: { file: File; name: string };
    memoAssurance?: { file: File; name: string };
    signature?: { file: File; name: string };
  }>({});
  const [showExtendedDocs, setShowExtendedDocs] = useState<boolean>(false);

  const handleFileChange = (docKey: keyof typeof optionalDocs, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOptionalDocs(prev => ({
        ...prev,
        [docKey]: { file, name: file.name }
      }));
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    if (!dataUrl) {
      setOptionalDocs(prev => {
        const next = { ...prev };
        delete next.signature;
        return next;
      });
      return;
    }
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)![1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const file = new File([u8arr], `signature-${Date.now()}.png`, { type: mime });
      setOptionalDocs(prev => ({
        ...prev,
        signature: { file, name: 'Signature tactile' }
      }));
    } catch (err) {
      console.error('Error converting signature to file:', err);
    }
  };

  // Smooth Scroll Helper
  const scrollToSection = (e: React.MouseEvent<HTMLElement>, sectionId: string) => {
    e.preventDefault();
    if (currentPath !== '/') {
      window.history.pushState(null, '', `/#${sectionId}`);
      setCurrentPath('/');
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const yOffset = -70; // Header offset
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  // Liens de navigation (source unique pour le menu desktop et le menu mobile)
  type NavLink = { label: string; href: string; scroll?: string; accent?: 'blue' | 'gold'; mobileOnly?: boolean };
  const navLinks: NavLink[] = [
    { label: 'Comment ça marche', href: '/#calcul-gains', scroll: 'calcul-gains' },
    { label: 'Comparatif', href: '/comparatif' },
    { label: 'Assurance VTC', href: '/assurance', accent: 'blue' },
    { label: 'Parrainage 200€', href: '/parrainage', accent: 'gold' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Simulateur', href: '/simulateur', mobileOnly: true },
    { label: 'Qui sommes-nous', href: '/qui-sommes-nous', mobileOnly: true },
    { label: 'Contact', href: '/contact', mobileOnly: true },
  ];
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
    if (link.scroll) scrollToSection(e, link.scroll);
    else navigateTo(e, link.href);
    setMobileMenuOpen(false);
  };
  const navColor = (a?: 'blue' | 'gold') => (a === 'gold' ? '#F5C451' : a === 'blue' ? '#38BDF8' : 'rgba(255, 255, 255, 0.88)');

  // Scroll Reveal Observer for Smooth Entrance Animations
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    };

    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px 40px 0px',
      threshold: 0.05,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const elementsToReveal = document.querySelectorAll('.reveal-on-scroll, .reveal-zoom, .reveal-left, .reveal-right');

    elementsToReveal.forEach((el) => observer.observe(el));

    return () => {
      elementsToReveal.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // (le simulateur de gains vit désormais dans SubPages.tsx : SimulatorPage)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let fName = formData.firstName;
    let lName = formData.lastName;
    if (!fName && lName.includes(' ')) {
      const parts = lName.split(' ');
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    } else if (!fName) {
      fName = lName;
    }

    const cloudinaryUrls: Record<string, string> = {};
    const docKeys: Array<keyof typeof optionalDocs> = ['vtcRecto', 'vtcVerso', 'rcCirculation', 'carteGrise', 'memoAssurance', 'signature'];

    // Circuit SÉCURISÉ (fonctions serveur + stockage privé) quand il est configuré ; sinon ancien circuit ci-dessous.
    if (apiEnabled) {
      const secure = await submitApplicationSecure(
        {
          firstName: fName || 'Chauffeur', lastName: lName || 'Nouveau', phone: formData.phone, email: formData.email,
          city: formData.city, vtcCardStatus: formData.vtcCardStatus, hasVehicle: formData.hasVehicle,
          vehicleModel: formData.vehicleModel, vehiclePlate: formData.vehiclePlate, platforms: formData.platforms,
          notes: formData.notes, source: getAcquisition().source, sourceDetail: getAcquisition().detail,
          consentRgpd: true, website: honeypot,
        },
        docKeys.flatMap((k) => {
          const f = optionalDocs[k]?.file;
          return f ? [{ key: k, docType: SECURE_DOC_TYPES[k], file: f }] : [];
        }),
      );
      for (const k of secure.uploaded) cloudinaryUrls[k] = 'stocke-en-securite';
    }

    // (ancien circuit, inactif quand le circuit sécurisé est configuré) Upload files to Cloudinary
    for (const key of apiEnabled ? [] : docKeys) {
      const doc = optionalDocs[key];
      if (doc && doc.file) {
        try {
          const fileData = new FormData();
          fileData.append('file', doc.file);
          fileData.append('upload_preset', 'nordrive_docs');
          
          const uploadRes = await fetch('https://api.cloudinary.com/v1_1/rabmjbbf/auto/upload', {
            method: 'POST',
            body: fileData,
          });
          
          if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            cloudinaryUrls[key] = uploadResult.secure_url;
          } else {
            const errData = await uploadRes.json();
            console.error(`Cloudinary upload failed for ${key}:`, errData.error?.message || 'Unknown error');
          }
        } catch (err) {
          console.error(`Error uploading ${key} to Cloudinary:`, err);
        }
      }
    }

    const uploadedDocsList: Array<{ name: string; type: DriverDocument['type']; fileUrl?: string }> = [];
    if (optionalDocs.vtcRecto) uploadedDocsList.push({ name: optionalDocs.vtcRecto.name, type: 'carte_vtc', fileUrl: cloudinaryUrls.vtcRecto });
    if (optionalDocs.vtcVerso) uploadedDocsList.push({ name: optionalDocs.vtcVerso.name, type: 'carte_vtc_verso', fileUrl: cloudinaryUrls.vtcVerso });
    if (optionalDocs.rcCirculation) uploadedDocsList.push({ name: optionalDocs.rcCirculation.name, type: 'rc_circulation', fileUrl: cloudinaryUrls.rcCirculation });
    if (optionalDocs.carteGrise) uploadedDocsList.push({ name: optionalDocs.carteGrise.name, type: 'carte_grise', fileUrl: cloudinaryUrls.carteGrise });
    if (optionalDocs.memoAssurance) uploadedDocsList.push({ name: optionalDocs.memoAssurance.name, type: 'memo_assurance', fileUrl: cloudinaryUrls.memoAssurance });
    if (optionalDocs.signature) uploadedDocsList.push({ name: optionalDocs.signature.name, type: 'signature', fileUrl: cloudinaryUrls.signature });

    // Register locally in local CRM
    onRegisterDriver({
      ...formData,
      firstName: fName || 'Chauffeur',
      lastName: lName || 'Nouveau',
      hasVtcCard: formData.vtcCardStatus === 'oui',
      rgpdConsent: rgpdConsent,
      rgpdConsentDate: new Date().toISOString(),
      source: getAcquisition().source,
      sourceDetail: getAcquisition().detail,
    }, uploadedDocsList);

    // (ancien circuit) e-mail Web3Forms : inutile quand le circuit sécurisé est actif (la fonction serveur prévient l'équipe)
    if (!apiEnabled) {
    const mailData = new FormData();
    mailData.append('access_key', '7dc10224-3e56-4c49-850d-cb01c1e52a5e');
    mailData.append('subject', `Nouvelle Inscription Chauffeur VTC - ${fName} ${lName}`);
    mailData.append('Nom complet', `${fName} ${lName}`);
    mailData.append('Telephone', formData.phone);
    mailData.append('Email', formData.email);
    mailData.append('Ville', formData.city);
    mailData.append('Carte VTC (Status)', formData.vtcCardStatus);
    mailData.append('Nom Entreprise', formData.companyName || 'N/A');
    mailData.append('SIREN', formData.siren || 'N/A');
    mailData.append('Model Vehicule', formData.hasVehicle ? formData.vehicleModel : 'Non équipé');
    mailData.append('Plaque Vehicule', formData.hasVehicle ? formData.vehiclePlate : 'N/A');
    mailData.append('Plateformes VTC', formData.platforms.join(', '));
    mailData.append('Notes & Commentaires', formData.notes || 'Aucun');
    mailData.append('Source du visiteur', `${getAcquisition().source}${getAcquisition().detail ? ` (${getAcquisition().detail})` : ''}`);

    // Add Cloudinary Links to Web3Forms mail payload
    mailData.append('📄 Carte VTC Recto', cloudinaryUrls.vtcRecto || 'Non fournie');
    mailData.append('📄 Carte VTC Verso', cloudinaryUrls.vtcVerso || 'Non fournie');
    mailData.append('📄 RC Circulation', cloudinaryUrls.rcCirculation || 'Non fournie');
    mailData.append('📄 Carte Grise', cloudinaryUrls.carteGrise || 'Non fournie');
    mailData.append('📄 Memo Assurance', cloudinaryUrls.memoAssurance || 'Non fournie');
    mailData.append('📄 Photo Signature', cloudinaryUrls.signature || 'Non fournie');

    // Fetch submit via Web3Forms
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: mailData,
        headers: {
          'Accept': 'application/json'
        }
      });
      await res.json();
    } catch (err) {
      console.error('Web3Forms submit error:', err);
    }
    }

    // Format professional WhatsApp notification message
    const vtcLabel = formData.vtcCardStatus === 'oui' ? 'Oui [OK]' : formData.vtcCardStatus === 'encours' ? 'En cours [Attente]' : 'Non';
    const vehicleLabel = formData.hasVehicle ? `Oui (${formData.vehicleModel || 'Non specifie'} - ${formData.vehiclePlate || 'N/A'})` : 'Non';
    const platformsLabel = formData.platforms.map(p => p.toUpperCase()).join(', ') || 'Aucune';

    // Pièces réellement demandées dans le formulaire (le mémo d'assurance et la signature restent facultatifs)
    const allDocsUploaded = !!(
      cloudinaryUrls.vtcRecto &&
      cloudinaryUrls.vtcVerso &&
      cloudinaryUrls.rcCirculation &&
      cloudinaryUrls.carteGrise
    );

    let waMessage = '';
    if (allDocsUploaded) {
      waMessage = `*** NOUVELLE INSCRIPTION CHAUFFEUR NORDRIVE ***

- Chauffeur : ${fName || ''} ${lName || ''}
- Telephone : ${formData.phone}
- Email : ${formData.email}
- Ville : ${formData.city}

- Carte VTC : ${vtcLabel}
- Entreprise : ${formData.companyName || 'Non renseigne'} ${formData.siren ? `(SIREN: ${formData.siren})` : ''}
- Vehicule : ${vehicleLabel}
- Plateformes : ${platformsLabel}
- Comm. / Notes : ${formData.notes || 'Aucun'}

✅ TOUS LES DOCUMENTS ONT BIEN ETE TRANSMIS PAR EMAIL !
Je vous contacte pour finaliser et valider mon rattachement Nordrive.`;
    } else {
      const missingLabels: string[] = [];
      if (!cloudinaryUrls.vtcRecto) missingLabels.push('Carte VTC Recto');
      if (!cloudinaryUrls.vtcVerso) missingLabels.push('Carte VTC Verso');
      if (!cloudinaryUrls.rcCirculation) missingLabels.push('RC Circulation');
      if (!cloudinaryUrls.carteGrise) missingLabels.push('Carte Grise');

      waMessage = `*** NOUVELLE INSCRIPTION CHAUFFEUR NORDRIVE ***

- Chauffeur : ${fName || ''} ${lName || ''}
- Telephone : ${formData.phone}
- Email : ${formData.email}
- Ville : ${formData.city}

- Carte VTC : ${vtcLabel}
- Entreprise : ${formData.companyName || 'Non renseigne'} ${formData.siren ? `(SIREN: ${formData.siren})` : ''}
- Vehicule : ${vehicleLabel}
- Plateformes : ${platformsLabel}
- Comm. / Notes : ${formData.notes || 'Aucun'}

- Pieces jointes a envoyer a la suite :
${missingLabels.map(l => `* [A JOINDRE 📎] ${l}`).join('\n')}

⚠️ RAPPEL URGENT : N'oubliez pas de m'envoyer les photos des documents listes ci-dessus directement a la suite de ce message (via le bouton 📎 ou l'appareil photo de WhatsApp) !`;
    }

    // Open WhatsApp Chat API
    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waMessage)}`;
    window.open(whatsappUrl, '_blank');

    // Mesure (aucune donnée personnelle) : statut carte VTC et nombre de documents joints
    track('Formulaire envoyé', { carteVtc: formData.vtcCardStatus, documents: uploadedDocsList.length });

    setCreatedDriverName(`${fName} ${lName}`);
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Envoi : fonction serveur si configurée, sinon ancien circuit Web3Forms
    const sendLegacyContact = () => {
    const contactData = new FormData();
    contactData.append('access_key', '7dc10224-3e56-4c49-850d-cb01c1e52a5e');
    contactData.append('subject', `📬 Nouveau Message Contact - ${contactForm.name}`);
    contactData.append('Nom complet', contactForm.name);
    contactData.append('Téléphone', contactForm.phone);
    if (contactForm.email) {
      contactData.append('Email', contactForm.email);
    }
    contactData.append('Message', contactForm.message);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: contactData,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(res => res.json())
    .then(() => undefined)
    .catch(err => console.error('Web3Forms contact error:', err));
    };
    sendMessage('contact', { name: contactForm.name, phone: contactForm.phone, email: contactForm.email, message: contactForm.message }, sendLegacyContact);

    // 2. Format WhatsApp notification message
    const waContactMessage = `*** NOUVEAU MESSAGE DE CONTACT - NORDRIVE ***

- Nom : ${contactForm.name}
- Telephone : ${contactForm.phone}
${contactForm.email ? `- Email : ${contactForm.email}\n` : ''}- Message : ${contactForm.message}`;

    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waContactMessage)}`;
    window.open(whatsappUrl, '_blank');

    track('Message contact envoyé');
    setContactSubmitted(true);
  };

  const handleReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (digitsOnly(referralForm.referrerPhone) === digitsOnly(referralForm.friendPhone)) {
      setReferralError("Votre numéro et celui de votre ami sont identiques. Indiquez le numéro de l'ami à parrainer.");
      return;
    }
    setReferralError('');

    const fName = referralForm.friendName.trim() || 'Mon Ami';

    const waReferralMessage = `*** DEMANDE DE PARRAINAGE (200€) - NORDRIVE ***

- Le Parrain (Moi) : ${referralForm.referrerName}
- Mon Téléphone : ${referralForm.referrerPhone}

- Mon Ami Parrainé : ${fName}
- Téléphone Ami : ${referralForm.friendPhone}

Je parraine cet ami pour qu'il rejoigne la flotte Nordrive VTC. Merci d'enregistrer ma prime de 200€ !`;

    // 1. Envoi : fonction serveur si configurée, sinon ancien circuit Web3Forms
    const sendLegacyReferral = () => {
    const referralData = new FormData();
    referralData.append('access_key', '7dc10224-3e56-4c49-850d-cb01c1e52a5e');
    referralData.append('subject', `Nouveau Parrainage VTC par ${referralForm.referrerName}`);
    referralData.append('Nom Parrain', referralForm.referrerName);
    referralData.append('Tel Parrain', referralForm.referrerPhone);
    referralData.append('Nom Ami', fName);
    referralData.append('Tel Ami', referralForm.friendPhone);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: referralData,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(res => res.json())
    .then(() => undefined)
    .catch(err => console.error('Web3Forms referral error:', err));
    };
    sendMessage('referral', { referrerName: referralForm.referrerName, referrerPhone: referralForm.referrerPhone, friendName: fName, friendPhone: referralForm.friendPhone }, sendLegacyReferral);

    // 2. Open WhatsApp Web / App
    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waReferralMessage)}`;
    window.open(whatsappUrl, '_blank');
    track('Parrainage envoyé');
    setReferralSubmitted(true);
  };

  /** Soumission du formulaire d'Assurance VTC */
  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsuranceIsSubmitting(true);

    let fName = insuranceForm.firstName;
    let lName = insuranceForm.lastName;
    if (!fName && lName.includes(' ')) {
      const parts = lName.split(' ');
      fName = parts[0];
      lName = parts.slice(1).join(' ');
    } else if (!fName) {
      fName = lName || 'Chauffeur';
    }

    const cloudinaryUrls: Record<string, string> = {};
    const docKeys: Array<keyof typeof insuranceDocs> = ['carteGrise', 'permisConduire', 'releveInformation'];

    // (ancien circuit) Upload files to Cloudinary : inactif avec le circuit sécurisé (les pièces d'assurance partent alors par WhatsApp)
    for (const key of apiEnabled ? [] : docKeys) {
      const doc = insuranceDocs[key];
      if (doc && doc.file) {
        try {
          const fileData = new FormData();
          fileData.append('file', doc.file);
          fileData.append('upload_preset', 'nordrive_docs');

          const uploadRes = await fetch('https://api.cloudinary.com/v1_1/rabmjbbf/auto/upload', {
            method: 'POST',
            body: fileData,
          });

          if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            cloudinaryUrls[key] = uploadResult.secure_url;
          }
        } catch (err) {
          console.error(`Error uploading ${key} to Cloudinary:`, err);
        }
      }
    }

    // 1. Envoi : fonction serveur si configurée, sinon ancien circuit Web3Forms
    if (apiEnabled) {
      void submitMessageSecure('insurance', {
        firstName: fName || 'Chauffeur', lastName: lName || '-', phone: insuranceForm.phone, email: insuranceForm.email,
        city: insuranceForm.city, insuranceType: insuranceForm.insuranceType, vehicleModel: insuranceForm.vehicleModel,
        vehiclePlate: insuranceForm.vehiclePlate, notes: insuranceForm.notes,
      });
    } else {
    const mailData = new FormData();
    mailData.append('access_key', '7dc10224-3e56-4c49-850d-cb01c1e52a5e');
    mailData.append('subject', `🛡️ Nouvelle Demande Devis Assurance VTC - ${fName} ${lName}`);
    mailData.append('Nom complet', `${fName} ${lName}`);
    mailData.append('Téléphone', insuranceForm.phone);
    mailData.append('Email', insuranceForm.email || 'Non renseigné');
    mailData.append('Ville', insuranceForm.city || 'Non renseignée');
    mailData.append('Type Assurance', insuranceForm.insuranceType === 'rc_circulation_pro' ? 'RC Circulation Pro (Transport Personnes)' : insuranceForm.insuranceType === 'flotte_vtc' ? 'Assurance Flotte VTC' : 'Véhicule Tout Risque VTC');
    mailData.append('Modèle Véhicule', insuranceForm.vehicleModel || 'Non renseigné');
    mailData.append('Plaque Véhicule', insuranceForm.vehiclePlate || 'Non renseignée');
    mailData.append('Notes / Message', insuranceForm.notes || 'Aucun');

    mailData.append('📄 Carte Grise', cloudinaryUrls.carteGrise || 'Non fournie');
    mailData.append('📄 Permis de Conduire', cloudinaryUrls.permisConduire || 'Non fournie');
    mailData.append('📄 Relevé d Information (+36 mois)', cloudinaryUrls.releveInformation || 'Non fournie');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: mailData,
        headers: { 'Accept': 'application/json' }
      });
      await res.json();
    } catch (err) {
      console.error('Web3Forms insurance submit error:', err);
    }
    }

    // 2. Open WhatsApp Web / App with prefilled message
    const insuranceTypeLabel = insuranceForm.insuranceType === 'rc_circulation_pro' ? 'RC Circulation Pro' : insuranceForm.insuranceType === 'flotte_vtc' ? 'Assurance Flotte VTC' : 'Véhicule Tout Risque VTC';

    const waMessage = `*** 🛡️ DEMANDE DE DEVIS ASSURANCE VTC NORDRIVE ***

- Chauffeur : ${fName} ${lName}
- Telephone : ${insuranceForm.phone}
- Email : ${insuranceForm.email || 'Non renseigne'}
- Ville : ${insuranceForm.city || 'Non renseignee'}
- Offre : ${insuranceTypeLabel}
- Vehicule : ${insuranceForm.vehicleModel || 'Non specifie'} ${insuranceForm.vehiclePlate ? `(${insuranceForm.vehiclePlate})` : ''}

📄 PIECES JOINTES :
- Carte Grise : ${cloudinaryUrls.carteGrise ? '✅ Envoyée (' + cloudinaryUrls.carteGrise + ')' : '❌ À envoyer'}
- Permis de Conduire : ${cloudinaryUrls.permisConduire ? '✅ Envoyé (' + cloudinaryUrls.permisConduire + ')' : '❌ À envoyer'}
- Relevé d'Information (+36 mois) : ${cloudinaryUrls.releveInformation ? '✅ Envoyé (' + cloudinaryUrls.releveInformation + ')' : '❌ À envoyer'}

Bonjour, je souhaite recevoir mon devis d'assurance VTC.`;

    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waMessage)}`;
    window.open(whatsappUrl, '_blank');

    track('Devis assurance envoyé', { offre: insuranceForm.insuranceType });
    setInsuranceIsSubmitting(false);
    setInsuranceSubmitted(true);
  };

  const faqList = [
    {
      q: "Quel est le rôle d'un gestionnaire de flotte et rattacheur VTC comme Nordrive ?",
      a: "En tant que gestionnaire de flotte VTC agréé par le Ministère des Transports et partenaire officiel d'Uber, Bolt et Heetch, Nordrive rattache votre compte chauffeur à sa flotte. Vous bénéficiez d'un statut salarié sécurisé (contrat CDI ou CDD), de fiches de paie mensuelles, et vous conservez 100% de votre chiffre d'affaires (0% de commission). Vous ne payez que 50€/semaine uniquement si vous travaillez (0€ si vous êtes en repos ou congés)."
    },
    {
      q: "Puis-je inscrire et rouler avec un véhicule de plus de 12 ans ?",
      a: "Oui, tout à fait ! C'est l'un des avantages exclusifs majeurs de notre flotte VTC : grâce à notre licence de transporteur et notre statut de flotte agréée, les véhicules de plus de 12 ans en excellent état de circulation sont acceptés sur les applications Uber, Bolt et Heetch."
    },
    {
      q: "En combien de temps mon rattachement et mon macaron VTC sont-ils activés ?",
      a: "Avec Nordrive, le rattachement est express : votre macaron VTC et l'activation de vos comptes plateformes vous sont délivrés en moins d'1 heure maximum après réception de vos pièces (Carte VTC & Permis). Vous commencez à rouler le jour même."
    },
    {
      q: "Comment fonctionne la règle des 50€/semaine et du 0€ si je ne roule pas ?",
      a: "Notre engagement est clair et sans ambiguïté : 50€ par semaine uniquement si vous roulez. Si vous partez en vacances, prenez des jours de repos ou n'enregistrez aucune course sur la semaine, vous payez exactement 0,00€. Aucun frais caché ni pénalité."
    },
    {
      q: "Comment et quand sont versés mes revenus par Nordrive ?",
      a: "Tous vos relevés Uber, Bolt et Heetch sont conciliés chaque semaine avec une précision mathématique. Vos gains nets sont virés automatiquement chaque lundi matin sur votre compte bancaire par virement SEPA sécurisé (Qonto)."
    },
    {
      q: "Est-ce que je bénéficie d'une fiche de paie et d'un contrat CDI ?",
      a: "Oui ! Le rattachement à notre flotte agréée vous confère un contrat de travail en règle (CDI ou CDD) et une fiche de paie officielle chaque mois. Cela vous assure des droits sociaux complets (assurance maladie, retraite, mutuelle, justificatifs de revenus pour logement ou crédit)."
    },
    {
      q: "Comment fonctionne le parrainage chauffeur jusqu'à 200€ offerts ?",
      a: "Pour chaque chauffeur VTC que vous parrainez et qui rejoint la flotte Nordrive, vous recevez jusqu'à 200€ de prime de parrainage dès que son dossier est validé et qu'il commence à rouler."
    },
    {
      q: "Puis-je me rattacher à Nordrive si je suis déjà inscrit sur Uber ou Bolt ?",
      a: "Absolument. Nous effectuons le rattachement direct de vos comptes Uber, Bolt ou Heetch existants en quelques minutes, sans aucune interruption de service et sans perdre votre note chauffeur ni votre historique."
    },
    {
      q: "Y a-t-il un engagement de durée ?",
      a: "Aucun engagement de durée. Vous êtes totalement libre de suspendre ou de quitter la flotte à tout moment d'un simple message, sans frais ni préavis contraignant."
    }
  ];

  // SEO : titre, description, canonique et données structurées propres à chaque page
  useEffect(() => {
    applySeo(currentPath, faqList.map(({ q, a }) => ({ q, a })));
  }, [currentPath]);

  // Formulaire de devis assurance VTC (affiché dans AssurancePage)
  const renderInsuranceForm = () => (
            <div className="dd-card-glow" style={{ background: 'linear-gradient(160deg, rgba(10, 16, 36, 0.96) 0%, rgba(5, 10, 22, 0.99) 100%)', border: '1px solid rgba(56, 189, 248, 0.28)', boxShadow: '0 0 50px rgba(56, 189, 248, 0.1), 0 24px 80px rgba(0,0,0,0.8)', padding: isMobile ? '24px 18px' : '36px 32px', borderRadius: '28px' }}>
              
              {!insuranceSubmitted ? (
                <form onSubmit={handleInsuranceSubmit}>
                  
                  <div style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.15)', paddingBottom: '14px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <FileText size={20} style={{ color: '#38BDF8' }} />
                      Formulaire Devis Assurance VTC Express
                    </h3>
                  </div>

                  {/* IDENTITÉ */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">👤 Prénom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Jean"
                        value={insuranceForm.firstName}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, firstName: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">👤 Nom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Dupont"
                        value={insuranceForm.lastName}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, lastName: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">📱 Téléphone WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="06 12 34 56 78"
                        value={insuranceForm.phone}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, phone: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">✉️ Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="prenom.nom@gmail.com"
                        value={insuranceForm.email}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, email: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">📍 Ville de résidence *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Paris, Lyon, Lille..."
                        value={insuranceForm.city}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, city: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">🛡️ Formule souhaitée</label>
                      <select
                        value={insuranceForm.insuranceType}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, insuranceType: e.target.value as any })}
                        className="dd-input"
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="rc_circulation_pro">RC Circulation Pro (Transport de personnes)</option>
                        <option value="flotte_vtc">Assurance Véhicule Flotte VTC</option>
                        <option value="vehicule_tout_risque">Assurance Véhicule Tout Risque VTC</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">🚘 Modèle du Véhicule (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: Toyota Corolla, Peugeot 508..."
                        value={insuranceForm.vehicleModel}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, vehicleModel: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label">🔤 Immatriculation (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: AB-123-CD"
                        value={insuranceForm.vehiclePlate}
                        onChange={(e) => setInsuranceForm({ ...insuranceForm, vehiclePlate: e.target.value })}
                        className="dd-input"
                      />
                    </div>
                  </div>

                  {/* UPLOAD DES 3 DOCUMENTS */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: isMobile ? '16px' : '20px', borderRadius: '18px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <UploadCloud size={20} style={{ color: '#38BDF8' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📁 PIÈCES JUSTIFICATIVES À JOINDRE (3 DOCUMENTS)
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                      
                      {/* Document 1: Carte Grise */}
                      <div style={{ background: insuranceDocs.carteGrise ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.8)', border: insuranceDocs.carteGrise ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: insuranceDocs.carteGrise ? '#34D399' : '#38BDF8', marginBottom: '6px', textTransform: 'uppercase' }}>
                          {insuranceDocs.carteGrise ? '✓ Carte Grise' : '1. Carte Grise *'}
                        </div>
                        {insuranceDocs.carteGrise ? (
                          <div style={{ fontSize: '11px', color: '#A7F3D0', wordBreak: 'break-all', fontWeight: 600 }}>
                            {insuranceDocs.carteGrise.name}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Format PDF / JPG / PNG</span>
                        )}
                        <label className="dd-btn" style={{ display: 'inline-block', marginTop: '8px', padding: '6px 12px', fontSize: '10.5px', background: insuranceDocs.carteGrise ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)', color: insuranceDocs.carteGrise ? '#34D399' : '#38BDF8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                          {insuranceDocs.carteGrise ? 'Changer' : 'Parcourir...'}
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleInsuranceFileChange('carteGrise', e)} style={{ display: 'none' }} />
                        </label>
                      </div>

                      {/* Document 2: Permis de conduire */}
                      <div style={{ background: insuranceDocs.permisConduire ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.8)', border: insuranceDocs.permisConduire ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: insuranceDocs.permisConduire ? '#34D399' : '#38BDF8', marginBottom: '6px', textTransform: 'uppercase' }}>
                          {insuranceDocs.permisConduire ? '✓ Permis de Conduire' : '2. Permis de conduire *'}
                        </div>
                        {insuranceDocs.permisConduire ? (
                          <div style={{ fontSize: '11px', color: '#A7F3D0', wordBreak: 'break-all', fontWeight: 600 }}>
                            {insuranceDocs.permisConduire.name}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Format PDF / JPG / PNG</span>
                        )}
                        <label className="dd-btn" style={{ display: 'inline-block', marginTop: '8px', padding: '6px 12px', fontSize: '10.5px', background: insuranceDocs.permisConduire ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)', color: insuranceDocs.permisConduire ? '#34D399' : '#38BDF8', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                          {insuranceDocs.permisConduire ? 'Changer' : 'Parcourir...'}
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleInsuranceFileChange('permisConduire', e)} style={{ display: 'none' }} />
                        </label>
                      </div>

                      {/* Document 3: Relevé d'information +36 mois */}
                      <div style={{ background: insuranceDocs.releveInformation ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.8)', border: insuranceDocs.releveInformation ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed rgba(56, 189, 248, 0.3)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: insuranceDocs.releveInformation ? '#34D399' : '#F59E0B', marginBottom: '6px', textTransform: 'uppercase' }}>
                          {insuranceDocs.releveInformation ? '✓ Relevé d\'Info (+36m)' : '3. Relevé d\'Information *'}
                        </div>
                        {insuranceDocs.releveInformation ? (
                          <div style={{ fontSize: '11px', color: '#A7F3D0', wordBreak: 'break-all', fontWeight: 600 }}>
                            {insuranceDocs.releveInformation.name}
                          </div>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>Relevé d'assuré (+36 mois)</span>
                        )}
                        <label className="dd-btn" style={{ display: 'inline-block', marginTop: '8px', padding: '6px 12px', fontSize: '10.5px', background: insuranceDocs.releveInformation ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)', color: insuranceDocs.releveInformation ? '#34D399' : '#FBBF24', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                          {insuranceDocs.releveInformation ? 'Changer' : 'Parcourir...'}
                          <input type="file" accept="image/*,application/pdf" onChange={(e) => handleInsuranceFileChange('releveInformation', e)} style={{ display: 'none' }} />
                        </label>
                      </div>

                    </div>
                  </div>

                  <div className="dd-form-group" style={{ marginBottom: '24px' }}>
                    <label className="dd-form-label">💬 Remarques ou précisions (Optionnel)</label>
                    <textarea
                      rows={2}
                      placeholder="Précisez votre bonus/malus actuel, antécédents ou toute question particulière..."
                      value={insuranceForm.notes}
                      onChange={(e) => setInsuranceForm({ ...insuranceForm, notes: e.target.value })}
                      className="dd-input"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={insuranceIsSubmitting}
                    className="dd-btn dd-btn-primary"
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      borderRadius: '100px',
                      fontSize: '15px',
                      fontWeight: 900,
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #FBE5A9 0%, #E5C158 55%, #C99A22 100%)',
                      color: '#1B1305',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(229, 193, 88, 0.35)',
                      opacity: insuranceIsSubmitting ? 0.7 : 1,
                      cursor: insuranceIsSubmitting ? 'wait' : 'pointer'
                    }}
                  >
                    {insuranceIsSubmitting ? (
                      <span>⏳ Téléversement des pièces & Envoi en cours...</span>
                    ) : (
                      <span>🛡️ Recevoir mon devis d'Assurance par Email & WhatsApp →</span>
                    )}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#34D399' }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', marginBottom: '12px' }}>
                    Votre demande d'assurance VTC a été envoyée !
                  </h3>
                  <p style={{ fontSize: '14px', color: '#A7F3D0', maxWidth: '600px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                    Merci <strong>{insuranceForm.firstName}</strong>. Vos pièces justificatives (Carte Grise, Permis et Relevé d'information) ont été transmises à notre équipe. Nous étudions votre profil et vous envoyons le devis le plus avantageux dans les plus brefs délais.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a
                      href="https://wa.me/33743767400"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dd-btn dd-btn-whatsapp"
                      style={{ padding: '12px 24px', borderRadius: '100px', fontSize: '13.5px', fontWeight: 800, background: '#25D366', color: '#FFF', textDecoration: 'none' }}
                    >
                      <MessageSquare size={16} /> Ouvrir WhatsApp Direct
                    </a>
                    <button
                      onClick={() => setInsuranceSubmitted(false)}
                      style={{ padding: '12px 24px', borderRadius: '100px', fontSize: '13.5px', fontWeight: 700, background: 'rgba(255, 255, 255, 0.08)', color: '#FFF', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer' }}
                    >
                      Nouveau devis
                    </button>
                  </div>
                </div>
              )}

            </div>
  );

  // Registration Form Render helper (closure)
  const renderRegistrationForm = () => {
    const allDocsUploaded = !!(
      optionalDocs.vtcRecto &&
      optionalDocs.vtcVerso &&
      optionalDocs.rcCirculation &&
      optionalDocs.carteGrise
    );
    
    return (
      <div className="dd-card-glow flyer-card-left" style={{ background: 'linear-gradient(165deg, rgba(22, 33, 47, 0.96) 0%, rgba(11, 18, 27, 0.99) 100%)', border: '1.5px solid rgba(229, 178, 70, 0.35)', boxShadow: '0 0 50px rgba(0,0,0,0.8), 0 0 30px rgba(229, 178, 70, 0.1)', padding: isMobile ? '20px 14px 18px' : '28px 24px 24px', borderRadius: isMobile ? '20px' : '24px', position: 'relative' }}>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} onFocusCapture={() => trackOnce('form-start', 'Formulaire démarré')}>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
            />

            {/* HEADER — Value Anchor */}
            <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(229, 178, 70, 0.2)' }}>
              <h3 style={{ fontSize: isMobile ? '19px' : '21px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.3px', lineHeight: 1.25, margin: 0 }}>
                Votre dossier de rattachement
              </h3>
              <p style={{ fontSize: '13px', color: '#A9B6C7', lineHeight: 1.45, margin: '4px 0 0' }}>
                4 champs obligatoires. Les documents peuvent suivre plus tard.
              </p>
            </div>

            {/* OPTION EXPRESS : WHATSAPP FLASH */}
            <a
              href="https://wa.me/33743767400?text=Bonjour%20Nordrive%2C%20je%20souhaite%20rejoindre%20la%20flotte%20(50%E2%82%AC%2Fsemaine)%20directement%20par%20WhatsApp."
              target="_blank"
              rel="noopener noreferrer"
              className="nord-flash-whatsapp"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', flexShrink: 0 }}>
                  <MessageSquare size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFF' }}>⚡ Inscription Flash WhatsApp (30 sec)</div>
                  <div style={{ fontSize: '10.5px', color: '#A7F3D0' }}>Pas le temps de remplir ? Cliquez ici !</div>
                </div>
              </div>
              <span style={{ background: '#25D366', color: '#064E3B', fontWeight: 800, fontSize: '11px', padding: '4px 10px', borderRadius: '100px', whiteSpace: 'nowrap' }}>
                En 1 clic →
              </span>
            </a>

            {/* FORM FIELDS — DIRECT COMPLET */}
            <div className="dd-form-group">
              <label className="dd-form-label">👤 Nom complet *</label>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Ex: Jean Dupont"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="dd-input"
              />
            </div>

            <div className="dd-form-group">
              <label className="dd-form-label">📱 Téléphone WhatsApp *</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                pattern={FR_PHONE_PATTERN}
                title="Numéro de téléphone, par exemple 06 12 34 56 79"
                placeholder="06 12 34 56 79"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="dd-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
              <div className="dd-form-group">
                <label className="dd-form-label">📍 Ville *</label>
                <input
                  type="text"
                  required
                  autoComplete="address-level2"
                  placeholder="Paris, Lyon, Lille..."
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="dd-input"
                />
              </div>

              <div className="dd-form-group">
                <label className="dd-form-label">✉️ Email</label>
                <input
                  type="email"
                  placeholder="prenom@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="dd-input"
                />
              </div>
            </div>

            <div className="dd-form-group">
              <label className="dd-form-label">🪪 Avez-vous la carte VTC ? *</label>
              <div className="dd-radio-chips">
                <div
                  onClick={() => setFormData({ ...formData, vtcCardStatus: 'oui', hasVtcCard: true })}
                  className={`dd-radio-chip ${formData.vtcCardStatus === 'oui' ? 'active' : ''}`}
                >
                  ✓ Oui, j'ai ma carte
                </div>

                <div
                  onClick={() => setFormData({ ...formData, vtcCardStatus: 'encours', hasVtcCard: false })}
                  className={`dd-radio-chip ${formData.vtcCardStatus === 'encours' ? 'active' : ''}`}
                >
                  🎓 Examen réussi
                </div>

                <div
                  onClick={() => setFormData({ ...formData, vtcCardStatus: 'non', hasVtcCard: false })}
                  className={`dd-radio-chip ${formData.vtcCardStatus === 'non' ? 'active' : ''}`}
                >
                  ⏳ Pas encore
                </div>
              </div>
            </div>

            {/* SECTION DÉTAILS VÉHICULE & PIÈCES (FACULTATIF & PLIABLE) */}
            <div style={{ margin: '14px 0 12px' }}>
              <button
                type="button"
                onClick={() => setShowExtendedDocs(!showExtendedDocs)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '12px',
                  background: showExtendedDocs ? 'rgba(229, 193, 88, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px dashed ' + (showExtendedDocs ? 'rgba(229, 193, 88, 0.5)' : 'rgba(255, 255, 255, 0.18)'),
                  color: showExtendedDocs ? '#FFE29F' : '#CBD5E1',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📎</span>
                  <span>Ajouter mon véhicule et documents maintenant (facultatif)</span>
                </span>
                <span style={{ fontSize: '11px', color: '#E5C158', fontWeight: 800 }}>{showExtendedDocs ? '▲ Masquer' : '▼ Dérouler'}</span>
              </button>
            </div>

            {showExtendedDocs && (
              <div style={{ marginTop: '10px', marginBottom: '14px', padding: '14px', borderRadius: '16px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div className="dd-form-group">
                  <label className="dd-form-label">🚘 Avez-vous votre propre véhicule ?</label>
                  <div className="dd-radio-chips">
                    <div
                      onClick={() => setFormData({ ...formData, hasVehicle: true })}
                      className={`dd-radio-chip ${formData.hasVehicle ? 'active' : ''}`}
                    >
                      🚗 Oui, j'ai ma voiture
                    </div>
                    <div
                      onClick={() => setFormData({ ...formData, hasVehicle: false })}
                      className={`dd-radio-chip ${!formData.hasVehicle ? 'active' : ''}`}
                    >
                      🔍 Non, je cherche un véhicule
                    </div>
                  </div>
                </div>

                {formData.hasVehicle && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Modèle du véhicule</label>
                      <input
                        type="text"
                        placeholder="Ex: Toyota Corolla, Peugeot 508..."
                        value={formData.vehicleModel}
                        onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                        className="dd-input"
                        style={{ padding: '9px 12px' }}
                      />
                    </div>
                    <div>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Immatriculation</label>
                      <input
                        type="text"
                        placeholder="Ex: AB-123-CD"
                        value={formData.vehiclePlate}
                        onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value.toUpperCase() })}
                        className="dd-input"
                        style={{ padding: '9px 12px' }}
                      />
                    </div>
                  </div>
                )}

                <div className="dd-form-group">
                  <label className="dd-form-label">📱 Sur quelles applications comptez-vous rouler ?</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'uber', label: 'Uber', color: '#FFF' },
                      { id: 'bolt', label: 'Bolt', color: '#34D399' },
                      { id: 'heetch', label: 'Heetch', color: '#F472B6' },
                      { id: 'caocao', label: 'CaoCao', color: '#38BDF8' }
                    ].map(app => {
                      const isSelected = formData.platforms.includes(app.id as PlatformType);
                      return (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormData({ ...formData, platforms: formData.platforms.filter(p => p !== app.id) });
                            } else {
                              setFormData({ ...formData, platforms: [...formData.platforms, app.id as PlatformType] });
                            }
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '100px',
                            border: isSelected ? `1.5px solid ${app.color}` : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            color: isSelected ? '#FFF' : '#94A3B8',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isSelected ? `✓ ${app.label}` : `+ ${app.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SIGNATURE TACTILE */}
                <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                  <SignaturePad
                    onSignatureChange={handleSignatureChange}
                    isMobile={isMobile}
                  />
                </div>

                {/* DOCUMENTS FACULTATIFS */}
                <div style={{
                  marginTop: '14px',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(2, 10, 26, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UploadCloud size={15} style={{ color: '#38BDF8' }} />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#E0F2FE' }}>
                        Documents rattachement express (facultatif maintenant)
                      </span>
                    </div>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 7px', borderRadius: '9999px', fontSize: '9.5px', fontWeight: 800 }}>
                      ⚡ PRIORITAIRE
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#7DD3FC', marginBottom: '10px', lineHeight: 1.4 }}>
                    Joignez vos pièces maintenant ou envoyez-les plus tard directement sur WhatsApp !
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                    <label className={`dd-doc-dropzone ${optionalDocs.vtcRecto ? 'uploaded' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange('vtcRecto', e)} hidden />
                      <CreditCard size={14} style={{ color: optionalDocs.vtcRecto ? '#10B981' : '#38BDF8', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, display: 'block', color: '#E2E8F0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          Carte VTC (Recto)
                        </span>
                        <span style={{ fontSize: '9.5px', color: optionalDocs.vtcRecto ? '#34D399' : '#64748B', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{optionalDocs.vtcRecto ? `✓ ${optionalDocs.vtcRecto.name}` : '+ Choisir photo'}</span>
                      </div>
                    </label>

                    <label className={`dd-doc-dropzone ${optionalDocs.vtcVerso ? 'uploaded' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange('vtcVerso', e)} hidden />
                      <CreditCard size={14} style={{ color: optionalDocs.vtcVerso ? '#10B981' : '#38BDF8', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, display: 'block', color: '#E2E8F0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          Carte VTC (Verso)
                        </span>
                        <span style={{ fontSize: '9.5px', color: optionalDocs.vtcVerso ? '#34D399' : '#64748B', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{optionalDocs.vtcVerso ? `✓ ${optionalDocs.vtcVerso.name}` : '+ Choisir photo'}</span>
                      </div>
                    </label>

                    <label className={`dd-doc-dropzone ${optionalDocs.rcCirculation ? 'uploaded' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange('rcCirculation', e)} hidden />
                      <ShieldCheck size={14} style={{ color: optionalDocs.rcCirculation ? '#10B981' : '#38BDF8', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, display: 'block', color: '#E2E8F0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          RC Circulation
                        </span>
                        <span style={{ fontSize: '9.5px', color: optionalDocs.rcCirculation ? '#34D399' : '#64748B', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{optionalDocs.rcCirculation ? `✓ ${optionalDocs.rcCirculation.name}` : '+ Choisir photo'}</span>
                      </div>
                    </label>

                    <label className={`dd-doc-dropzone ${optionalDocs.carteGrise ? 'uploaded' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileChange('carteGrise', e)} hidden />
                      <Car size={14} style={{ color: optionalDocs.carteGrise ? '#10B981' : '#38BDF8', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, display: 'block', color: '#E2E8F0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          Carte Grise
                        </span>
                        <span style={{ fontSize: '9.5px', color: optionalDocs.carteGrise ? '#34D399' : '#64748B', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{optionalDocs.carteGrise ? `✓ ${optionalDocs.carteGrise.name}` : '+ Choisir photo'}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* RGPD Consent Checkbox */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '14px', marginTop: '6px' }}>
              <input
                type="checkbox"
                required
                checked={rgpdConsent}
                onChange={e => setRgpdConsent(e.target.checked)}
                style={{ margin: 0, marginTop: '3px', accentColor: '#E5C158', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.5 }}>
                J'accepte que mes informations soient traitées par <strong style={{ color: '#CBD5E1' }}>Nordrive Services</strong> pour créer mon dossier de rattachement VTC. *
              </span>
            </label>

            <button 
              type="submit" 
              className="dd-btn dd-btn-gold"
              disabled={isSubmitting || !rgpdConsent}
              style={{ 
                width: '100%', 
                marginTop: '8px', 
                padding: '17px', 
                borderRadius: '14px', 
                fontSize: '15px', 
                fontWeight: 800, 
                letterSpacing: '0.2px',
                opacity: (isSubmitting || !rgpdConsent) ? 0.5 : 1,
                cursor: (isSubmitting || !rgpdConsent) ? 'not-allowed' : 'pointer'
              }}
            >
              <span>{isSubmitting ? "Validation en cours…" : "Je rejoins la flotte Nordrive →"}</span>
            </button>

            <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: '12.5px', color: '#A9B6C7', lineHeight: 1.5 }}>
              Sans engagement · Réponse sous 1h · 1ère semaine offerte
            </p>

          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            {/* Success Icon — Nordic Compass Circle */}
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(2, 132, 199, 0.3) 0%, rgba(13, 148, 136, 0.1) 100%)', border: '2px solid #38BDF8', display: 'grid', placeItems: 'center', fontSize: '32px', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(56, 189, 248, 0.4)' }}>
              🧭
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', marginBottom: '6px', letterSpacing: '-0.5px' }}>Cap vers le sommet !</h3>
            <p style={{ fontSize: '13px', color: '#BAE6FD', marginBottom: '14px', lineHeight: 1.6 }}>
              Bienvenue <strong style={{ color: '#FFF' }}>{createdDriverName}</strong> 🏔️
            </p>
            
            {(() => {
              return (
                <>
                  {allDocsUploaded ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '12px', padding: '12px', marginBottom: '16px', textAlign: 'left', fontSize: '12px', lineHeight: 1.5, color: '#A7F3D0' }}>
                      <strong>🎉 TOUT EST TRANSMIS AVEC SUCCÈS !</strong><br />
                      Vos documents et informations ont bien été reçus par e-mail et sont en cours d'examen prioritaire ⚡.<br />
                      Cliquez sur le bouton ci-dessous pour finaliser votre rattachement sur WhatsApp.
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '12px', padding: '12px', marginBottom: '16px', textAlign: 'left', fontSize: '12px', lineHeight: 1.5, color: '#FDE68A' }}>
                      <strong>⚠️ ÉTAPE FINALE OBLIGATOIRE :</strong><br />
                      1. Cliquez sur le bouton vert ci-dessous pour ouvrir WhatsApp et envoyer le texte pré-rempli.<br />
                      2. <strong>Joignez ensuite vos photos de documents</strong> (Carte VTC, Carte Grise...) directement dans la discussion en cliquant sur l'icône trombone 📎 de WhatsApp.
                    </div>
                  )}

                  {/* Status Tracker */}
                  <div style={{ background: 'rgba(2, 10, 26, 0.85)', padding: '14px', borderRadius: '14px', textAlign: 'left', fontSize: '12px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '16px' }}>
                    {[
                      { label: 'Dossier reçu', value: '✓ Confirmé', color: '#10B981' },
                      { label: 'Appel conseiller', value: 'Sous 2h', color: '#38BDF8' },
                      { label: 'Macaron provisoire', value: 'Sous 60 min', color: '#34D399' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: '#7DD3FC' }}>{label} :</span>
                        <strong style={{ color }}>{value}</strong>
                      </div>
                    ))}

                    {/* Missing documents list — shown only when incomplete */}
                    {!allDocsUploaded && (() => {
                      const missingDocs = [
                        { key: 'vtcRecto', label: 'Carte VTC (Recto)' },
                        { key: 'vtcVerso', label: 'Carte VTC (Verso)' },
                        { key: 'rcCirculation', label: 'RC Circulation' },
                        { key: 'carteGrise', label: 'Carte Grise' },
                      ].filter(d => !optionalDocs[d.key as keyof typeof optionalDocs]);
                      if (missingDocs.length === 0) return null;
                      return (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#FCA5A5', fontWeight: 700 }}>Documents manquants :</span>
                          </div>
                          {missingDocs.map(d => (
                            <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: '#FDE68A', fontSize: '11px' }}>
                              <span style={{ color: '#F87171', fontWeight: 700 }}>✗</span>
                              <span>{d.label}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <a
                    href={allDocsUploaded
                      ? `https://wa.me/33743767400?text=${encodeURIComponent(`Bonjour Nordrive, je viens de remplir le formulaire au nom de ${createdDriverName}. Tous mes documents ont bien été transmis par e-mail. Je vous contacte pour valider mon rattachement.`)}`
                      : `https://wa.me/33743767400?text=${encodeURIComponent(`Bonjour Nordrive, je viens de remplir le formulaire au nom de ${createdDriverName}. Je vous joins ci-dessous mes documents pour valider mon rattachement...`)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dd-btn dd-btn-whatsapp"
                    style={{ width: '100%', borderRadius: '12px' }}
                  >
                    <MessageSquare size={16} />
                    <span>{allDocsUploaded ? 'Finaliser mon rattachement sur WhatsApp' : 'Envoyer mes documents sur WhatsApp'}</span>
                  </a>
                </>
              );
            })()}
          </div>
        )}

      </div>
    );
  };

  return (
    <div className={`${currentPath !== '/' ? 'is-subpage' : 'is-homepage'} flyer-studio-bg`} style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Custom Glowing Pointer Cursor */}
      <CustomCursor />

      {/* Dynamic Interactive 3D Canvas Background */}
      <Background3D />

      {/* ═══════════════════════════════════════════════════════
           TRANSPARENT HEADER MATCHING USER CROP
      ═══════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: scrolled || mobileMenuOpen ? 'rgba(10, 16, 25, 0.82)' : 'transparent',
          backdropFilter: scrolled || mobileMenuOpen ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: scrolled || mobileMenuOpen ? 'blur(14px)' : 'none',
          borderBottom: scrolled || mobileMenuOpen ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid transparent',
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            padding: isMobile ? '10px 18px' : '16px 28px',
            minHeight: isMobile ? '56px' : '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* LOGO NORDRIVE (3D N EMBLEM + "ORDRIVE" UPPERCASE LETTER-SPACING) */}
          <a
            href="/"
            onClick={(e) => navigateTo(e, '/')}
            style={{ 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0px',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img 
              src="/nordrive-exact-3d-user-model.png" 
              alt="N" 
              style={{ 
                height: isMobile ? '22px' : '24px', 
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 12px rgba(229, 178, 70, 0.6))',
                flexShrink: 0,
                marginRight: isMobile ? '3px' : '4px'
              }} 
            />
            <span style={{ fontSize: isMobile ? '14.5px' : '16.5px', fontWeight: 900, color: '#FFF', letterSpacing: isMobile ? '3px' : '4.5px', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", lineHeight: 1 }}>
              ORDRIVE
            </span>
            <span className="flyer-gold-text" style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 900, marginLeft: '6px', letterSpacing: '1px' }}>
              VTC
            </span>
          </a>

          {/* LIENS NAVIGATION DESKTOP */}
          {!isNarrow && (
            <nav style={{ display: 'flex', gap: '26px', alignItems: 'center' }}>
              {navLinks.filter(l => !l.mobileOnly).map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => goTo(e, link)}
                  style={{
                    fontSize: '13px',
                    fontWeight: link.accent ? 800 : 600,
                    color: navColor(link.accent),
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    borderBottom: currentPath === link.href ? '2px solid #E5C158' : '2px solid transparent',
                    paddingBottom: '2px',
                    transition: 'color 0.2s',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {/* BOUTON NOUS REJOINDRE (DESKTOP SEULEMENT) & MENU 3 TRAITS FINS (MOBILE SEULEMENT COMME NORDVPN) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showAdminButton && !isMobile && (
              <button onClick={onOpenAdminCrm} style={{ background: 'transparent', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '100px', color: '#C4B5FD', padding: '4px 10px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lock size={10} /> CRM
              </button>
            )}

            {/* WhatsApp rapide direct sur desktop */}
            {!isMobile && (
              <a
                href="https://wa.me/33743767400"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  borderRadius: '100px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  background: 'rgba(37, 211, 102, 0.12)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#25D366',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <MessageSquare size={13} />
                <span>07 43 76 74 00</span>
              </a>
            )}

            {/* Bouton Nous rejoindre uniquement sur Desktop */}
            {!isMobile && (
              <a
                href="#formulaire"
                onClick={(e) => scrollToSection(e, 'formulaire')}
                style={{
                  padding: '8px 22px',
                  fontSize: '12.5px',
                  borderRadius: '100px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, rgba(229, 178, 70, 0.2) 0%, rgba(200, 131, 0, 0.3) 100%)',
                  border: '1.5px solid #E5B246',
                  color: '#FFE29F',
                  boxShadow: '0 0 15px rgba(229, 178, 70, 0.25)',
                  whiteSpace: 'nowrap',
                }}
              >
                Je rejoins la flotte
              </a>
            )}

            {/* LES 3 TRAITS FINS MENU HAMBURGER (≡) PURE DESIGN STYLE NORDVPN SUR MOBILE */}
            {isNarrow && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  cursor: 'pointer',
                  padding: '4px',
                  margin: 0,
                  lineHeight: 1,
                }}
                aria-label="Menu Navigation"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE DROPDOWN MENU DRAWER */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '480px',
            background: 'rgba(16, 20, 36, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '20px',
            padding: '20px 24px',
            zIndex: 999,
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {navLinks.map((link, i, arr) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => goTo(e, link)}
              style={{ color: navColor(link.accent) === 'rgba(255, 255, 255, 0.88)' ? '#FFF' : navColor(link.accent), fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none' }}
            >
              {link.label}
            </a>
          ))}
          
          <a 
            href="#formulaire" 
            onClick={(e) => { scrollToSection(e, 'formulaire'); setMobileMenuOpen(false); }} 
            style={{ 
              marginTop: '12px',
              padding: '12px 20px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 800,
              color: '#1B1305',
              background: 'linear-gradient(135deg, #FBE5A9 0%, #E5C158 55%, #C99A22 100%)',
              borderRadius: '100px',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(229, 193, 88, 0.3)'
            }}
          >
            Je rejoins la flotte — dossier en 1h
          </a>
        </div>
      )}

      <main style={{ position: 'relative', zIndex: 1 }}>
        {!KNOWN_PATHS.includes(currentPath) && <NotFoundPage onNavigate={navigateTo} />}

        {currentPath === '/' && (
          <HomePage
            form={renderRegistrationForm()}
            faq={faqList}
            onNavigate={navigateTo}
            onScrollTo={scrollToSection}
          />
        )}

        {currentPath === '/comparatif' && <ComparatifPage onNavigate={navigateTo} />}

        {currentPath === '/assurance' && <AssurancePage form={renderInsuranceForm()} onNavigate={navigateTo} />}

        {currentPath === '/simulateur' && <SimulatorPage onNavigate={navigateTo} />}

        {currentPath === '/parrainage' && (
          <ParrainagePage
            form={referralForm}
            setForm={setReferralForm}
            submitted={referralSubmitted}
            setSubmitted={setReferralSubmitted}
            error={referralError}
            onSubmit={handleReferralSubmit}
            phonePattern={FR_PHONE_PATTERN}
            onNavigate={navigateTo}
          />
        )}

        {currentPath === '/qui-sommes-nous' && <AboutPage onNavigate={navigateTo} />}

        {currentPath === '/faq' && <FaqPage faq={faqList} onNavigate={navigateTo} />}

        {currentPath === '/contact' && (
          <ContactPage
            form={contactForm}
            setForm={setContactForm}
            submitted={contactSubmitted}
            onSubmit={handleContactSubmit}
            phonePattern={FR_PHONE_PATTERN}
            onNavigate={navigateTo}
          />
        )}

        {/* SECTION: VILLES COUVERTES (Interactive flex-pills tag list) */}
        <section id="villes" className="dd-container" style={{ padding: '60px 20px 80px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div className="reveal-on-scroll" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 36px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '1px' }}>📍 Expansion Nationale</span>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: '32px', fontWeight: 900, color: '#FFF', margin: '6px 0 12px' }}>
              Villes ouvertes au rattachement VTC
            </h2>
            <p style={{ fontSize: '13.5px', color: '#9CA3AF', lineHeight: '1.6' }}>
              Nordrive est présent dans les plus grandes métropoles françaises. Profitez de nos agréments locaux pour travailler immédiatement.
            </p>
          </div>

          <div className="reveal-on-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            {[
              { city: 'Paris & Île-de-France', status: 'Actif' },
              { city: 'Lyon & Rhône-Alpes', status: 'Actif' },
              { city: 'Marseille & Provence', status: 'Actif' },
              { city: 'Lille & Nord', status: 'Actif' },
              { city: 'Bordeaux & Gironde', status: 'Actif' },
              { city: 'Nantes & Loire', status: 'Actif' },
              { city: 'Nice & Côte d\'Azur', status: 'Actif' },
            ].map(({ city, status }) => {
              return (
                <div 
                  key={city}
                  className="dd-card-glow"
                  style={{ 
                    padding: '12px 20px', 
                    borderRadius: '100px', 
                    background: 'rgba(16, 22, 38, 0.6)', 
                    border: '1px solid rgba(56, 189, 248, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16, 22, 38, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56, 189, 248, 0.15)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(16, 22, 38, 0.6)';
                  }}
                >
                  <span style={{ color: '#38BDF8', fontSize: '14px' }}>📍</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>{city}</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.25)' }}>{status}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* FOOTER OFFICIEL NORDRIVE VTC */}
      <footer 
        style={{ 
          borderTop: '1px solid rgba(229, 178, 70, 0.25)', 
          marginTop: '60px',
          padding: isMobile ? '40px 16px 140px' : '50px 20px 60px', 
          background: 'linear-gradient(180deg, #090f17 0%, #05080d 100%)', 
          fontSize: '12px', 
          color: '#94A3B8', 
          position: 'relative', 
          zIndex: 10,
        }}
      >
        <div className="dd-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '20px', flexDirection: isMobile ? 'column' : 'row' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <img src="/nordrive-exact-3d-user-model.png" alt="N" style={{ height: '22px', width: 'auto' }} />
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#FFF', letterSpacing: '3px' }}>NORDRIVE</span>
                <span className="flyer-gold-text" style={{ fontSize: '13px', fontWeight: 900 }}>VTC</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, maxWidth: '420px', lineHeight: 1.4 }}>
                Spécialiste N°1 du rattachement flotte VTC agréée Uber, Bolt et Heetch. Contrats CDI / CDD, 50€/semaine travaillée (0€ si inactif), véhicules +12 ans acceptés.
              </p>
            </div>

            <a
              href="https://wa.me/33743767400"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '100px',
                background: 'rgba(37, 211, 102, 0.12)',
                border: '1px solid rgba(37, 211, 102, 0.4)',
                color: '#25D366',
                fontWeight: 800,
                fontSize: '12.5px',
                textDecoration: 'none'
              }}
            >
              <MessageSquare size={15} />
              <span>Assistance & Inscription : 07 43 76 74 00</span>
            </a>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', flexDirection: isMobile ? 'column-reverse' : 'row', textAlign: isMobile ? 'center' : 'left' }}>
            <div>
              © 2026 Nordrive VTC. Tous droits réservés. · <span style={{ color: '#E5B246' }}>nordrive-flotte.com</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#64748B', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-end' }}>
              <a href="/faq" onClick={(e) => navigateTo(e, '/faq')} style={{ color: '#94A3B8', textDecoration: 'none' }}>FAQ</a>
              <span>·</span>
              <a href="/contact" onClick={(e) => navigateTo(e, '/contact')} style={{ color: '#94A3B8', textDecoration: 'none' }}>Contact</a>
              <span>·</span>
              <a href="/parrainage" onClick={(e) => navigateTo(e, '/parrainage')} style={{ color: '#E5B246', textDecoration: 'none', fontWeight: 700 }}>Parrainage 200€</a>
              <span>·</span>
              <a href="/simulateur" onClick={(e) => navigateTo(e, '/simulateur')} style={{ color: '#94A3B8', textDecoration: 'none' }}>Simulateur</a>
              <span>·</span>
              <a href="/assurance" onClick={(e) => navigateTo(e, '/assurance')} style={{ color: '#38BDF8', textDecoration: 'none' }}>Assurance VTC</a>
              <span>·</span>
              <button onClick={() => setLegalModalContent('mentions')} style={{ background: 'none', border: 'none', padding: 0, color: '#64748B', cursor: 'pointer', fontSize: '12px' }}>Mentions légales</button>
              <span>·</span>
              <button onClick={() => setLegalModalContent('confidentialite')} style={{ background: 'none', border: 'none', padding: 0, color: '#64748B', cursor: 'pointer', fontSize: '12px' }}>Confidentialité</button>
              <span>·</span>
              <button onClick={() => setLegalModalContent('cgu')} style={{ background: 'none', border: 'none', padding: 0, color: '#64748B', cursor: 'pointer', fontSize: '12px' }}>CGV/CGU</button>
            </div>
          </div>
        </div>
      </footer>




      {/* LEGAL MODAL */}
      {legalModalContent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0F172A', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={20} style={{ color: '#38BDF8' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', margin: 0 }}>
                  {legalModalContent === 'mentions' && 'Mentions Légales — Nordrive Services'}
                  {legalModalContent === 'confidentialite' && 'Politique de Confidentialité — Nordrive'}
                  {legalModalContent === 'cgu' && 'Conditions Générales d\'Utilisation'}
                  {legalModalContent === 'rgpd' && 'RGPD — Données Personnelles'}
                </h3>
              </div>
              <button onClick={() => setLegalModalContent(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '13px', color: '#94A3B8', lineHeight: 1.7 }}>
              {legalModalContent === 'mentions' && (
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>1. Éditeur du site</h4>
                  <p style={{ margin: '0 0 16px' }}>Le site Nordrive est édité par la société <strong>Nordrive Services SAS</strong>, société de gestion de flotte VTC agréée, dont le siège social est situé à Paris, France.</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>2. Contact</h4>
                  <p style={{ margin: '0 0 16px' }}>Email : nordrivevtc@gmail.com | Téléphone : +33 7 43 76 74 00 | WhatsApp : +33 7 43 76 74 00</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>3. Hébergement</h4>
                  <p style={{ margin: 0 }}>Ce site est hébergé de manière sécurisée par Vercel Inc. (440 N Barranca Ave #4133, Covina, CA 91723, USA) et Supabase Inc. (infrastructures européennes certifiées ISO 27001).</p>
                </div>
              )}

              {legalModalContent === 'confidentialite' && (
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Collecte et protection des données</h4>
                  <p style={{ margin: '0 0 16px' }}>Les données soumises via le formulaire de rattachement (Nom, Prénom, Téléphone, Email, Carte VTC, Documents justificatifs) sont strictement réservées à l'établissement de votre dossier de rattachement auprès de Nordrive Services.</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Sécurité des documents</h4>
                  <p style={{ margin: '0 0 16px' }}>Vos pièces justificatives sont chiffrées en transit (TLS 1.3) et conservées sur des serveurs sécurisés conformes aux normes européennes.</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Conservation</h4>
                  <p style={{ margin: 0 }}>Aucune donnée n'est revendue à des tiers. Vous pouvez demander la suppression de vos données à tout moment par simple email à nordrivevtc@gmail.com.</p>
                </div>
              )}

              {legalModalContent === 'cgu' && (
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Conditions d'utilisation de la plateforme Nordrive</h4>
                  <p style={{ margin: '0 0 16px' }}>Le rattachement à la flotte Nordrive est soumis à la vérification de la validité de votre Carte Professionnelle VTC et de la conformité de vos documents légaux.</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Processus de rattachement</h4>
                  <p style={{ margin: '0 0 16px' }}>La soumission du formulaire vaut demande de constitution de dossier. Le rattachement officiel n'est définitif qu'après validation de vos 6 pièces justificatives et signature du contrat de rattachement.</p>

                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Frais Flotte & Règlement</h4>
                  <p style={{ margin: 0 }}>Les frais de gestion de flotte s'élèvent à 50€ par semaine active. Si le chauffeur ne réalise aucun chiffre d'affaires sur la semaine (0€ de CA), aucun frais n'est prélevé (0€).</p>
                </div>
              )}

              {legalModalContent === 'rgpd' && (
                <div>
                  <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Vos droits RGPD (Règlement Général sur la Protection des Données)</h4>
                  <p style={{ margin: '0 0 16px' }}>Conformément à la réglementation européenne RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez des droits suivants :</p>
                  
                  <ul style={{ margin: '0 0 16px', paddingLeft: '20px' }}>
                    <li>Droit d'accès et d’obtention d'une copie de vos données</li>
                    <li>Droit de rectification de vos informations personnelles</li>
                    <li>Droit à l'effacement ("droit à l'oubli")</li>
                    <li>Droit à la limitation du traitement</li>
                  </ul>

                  <p style={{ margin: 0 }}>Pour exercer l'un de ces droits, contactez notre Délégué à la Protection des Données (DPO) par email : <strong style={{ color: '#38BDF8' }}>nordrivevtc@gmail.com</strong>.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'right', background: 'rgba(0,0,0,0.2)' }}>
              <button
                onClick={() => setLegalModalContent(null)}
                style={{ padding: '8px 20px', background: '#0284C7', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}



      {/* FLOATING GREEN WHATSAPP BUBBLE BUTTON (Positioned Above Bottom Bar) */}
      <a
        href="https://wa.me/33743767400?text=Bonjour%20Nordrive%2C%20je%20souhaite%20me%20rattacher%20%C3%A0%20votre%20flotte"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: isMobile ? (scrolled ? '84px' : '20px') : '28px',
          right: '18px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37, 211, 102, 0.55), 0 0 15px rgba(37, 211, 102, 0.35)',
          zIndex: 995,
          transition: 'bottom 0.3s ease, transform 0.25s ease',
          textDecoration: 'none',
        }}
        title="WhatsApp Direct Nordrive"
      >
        <MessageSquare size={24} fill="#FFF" color="#FFF" />
      </a>

      {/* FLOATING BLUE TELEGRAM BUBBLE BUTTON (Positioned Left of WhatsApp) */}
      <a
        href="https://t.me/+bCYOZ_WQcf5iMWE0"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: isMobile ? (scrolled ? '84px' : '20px') : '28px',
          right: '78px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
          color: '#FFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(42, 171, 238, 0.50), 0 0 15px rgba(42, 171, 238, 0.30)',
          zIndex: 995,
          transition: 'bottom 0.3s ease, transform 0.25s ease',
          textDecoration: 'none',
        }}
        title="Groupe Telegram Nordrive"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#FFF" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 1 0 24 12.056A12.014 12.014 0 0 0 11.944 0ZM16.906 7.224c.1-.002.321.039.465.178a.66.66 0 0 1 .193.378c.024.176.054.578.03.916c-.24 2.537-.76 4.605-1.264 6.064c-.263.764-.521 1.293-.711 1.618c-.378.648-.756.608-1.14.396c-.246-.136-1.508-1.011-2.19-1.508c-.41-.3-.176-.64.092-.89c.073-.067 1.34-1.247 2.142-2.05c.115-.114.22-.334.024-.466c-.197-.132-.489-.044-.698.026c-.296.1-1.87 1.205-3.257 2.12c-.388.257-.74.381-1.057.371c-.348-.01-.754-.145-1.124-.264c-.454-.146-.816-.224-.785-.473c.016-.13.191-.263.524-.4c2.052-.907 3.42-1.505 4.104-1.793c1.954-.822 3.028-1.208 3.368-1.24c.076-.007.246-.018.356.011Z"/>
        </svg>
      </a>

      {/* STICKY FLOATING MOBILE BOTTOM CONVERSION DOCK (STYLE WINDRIVE / NORDVPN ULTRA-FLUID) */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '50%',
            transform: scrolled ? 'translate3d(-50%, 0, 0) scale(1)' : 'translate3d(-50%, 80px, 0) scale(0.92)',
            opacity: scrolled ? 1 : 0,
            pointerEvents: scrolled ? 'auto' : 'none',
            width: 'calc(100% - 24px)',
            maxWidth: '460px',
            zIndex: 998,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform, opacity',
          }}
        >
          {/* BOUTON PRINCIPAL JE ME RATTACHE EN 1H */}
          <a
            href="#formulaire"
            onClick={(e) => scrollToSection(e, 'formulaire')}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '100px',
              background: 'linear-gradient(135deg, #FBE5A9 0%, #E5C158 55%, #C99A22 100%)',
              color: '#1B1305',
              fontSize: '14.5px',
              fontWeight: 800,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5), 0 0 18px rgba(229, 193, 88, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Je me rattache en 1h</span>
            <ArrowRight size={16} />
          </a>

          {/* BOUTON 3 TRAITS FINS MENU HAMBURGER (CERCLE OBSCUR) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
              flexShrink: 0,
            }}
            aria-label="Menu Mobile Bottom"
          >
            {mobileMenuOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
        </div>
      )}
    </div>
  );
};