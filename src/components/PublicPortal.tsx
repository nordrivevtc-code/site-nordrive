import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Gift, 
  Phone, 
  Mail, 
  MapPin, 
  Send,
  Award,
  Users,
  Lock,
  UploadCloud,
  ShieldCheck,
  CreditCard,
  Car,
  Menu,
  X,
  ArrowRight,
  FileText,
  CheckCircle2,
  Wallet,
  Banknote
} from 'lucide-react';
import type { Driver, DriverDocument, PlatformType } from '../types/fleet';
import { Background3D } from './Background3D';
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

export const PublicPortal: React.FC<PublicPortalProps> = ({ onRegisterDriver, onOpenAdminCrm, drivers }) => {
  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(typeof window !== 'undefined' ? window.location.pathname : '/');
  const isSubpage = currentPath !== '/';

  // popstate listener for back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
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



  // Display period for examples
  const [examplePeriod, setExamplePeriod] = useState<'semaine' | 'mois'>('semaine');
  const [beforeAfterActive, setBeforeAfterActive] = useState<'before' | 'after'>('after');

  // FAQ Accordion Toggle
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // RGPD Consent
  const [rgpdConsent, setRgpdConsent] = useState<boolean>(false);

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
    friendFirstName: '',
    friendLastName: '',
    friendPhone: '',
    friendEmail: '',
    friendHasVtc: false,
    friendHasVehicle: false
  });
  const [referralSubmitted, setReferralSubmitted] = useState<boolean>(false);

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

  // Simulator State (CA Hebdomadaire & Mensuel)
  const [simPeriod, setSimPeriod] = useState<'semaine' | 'mois'>('semaine');
  const [weeklyTurnover, setWeeklyTurnover] = useState<number>(1000);
  const [monthlyTurnover, setMonthlyTurnover] = useState<number>(4000);

  // Simulator Math: Auto-Entrepreneur vs Nordrive
  // Hebdomadaire
  const autoNetWeek = Math.round(weeklyTurnover * 0.71);
  const fleetFeeWeekly = weeklyTurnover > 0 ? 50 : 0; // 50€/semaine travaillée
  const fleetNetWeek = Math.max(0, weeklyTurnover - fleetFeeWeekly);
  const gainExtraWeek = fleetNetWeek - autoNetWeek;

  // Mensuel
  const autoNetMonth = Math.round(monthlyTurnover * 0.71);
  const fleetFeeMonthly = monthlyTurnover > 0 ? 50 * 4 : 0; // 200€/mois
  const fleetNetMonth = Math.max(0, monthlyTurnover - fleetFeeMonthly);
  const gainExtraMonth = fleetNetMonth - autoNetMonth;

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

    // Upload files to Cloudinary in background/sequentially
    for (const key of docKeys) {
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
            console.log(`Cloudinary upload success for ${key}:`, uploadResult.secure_url);
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
    }, uploadedDocsList);

    // Asynchronously send complete data to Email inbox via Web3Forms API
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
      const data = await res.json();
      console.log('Web3Forms submit success:', data);
    } catch (err) {
      console.error('Web3Forms submit error:', err);
    }

    // Format professional WhatsApp notification message
    const vtcLabel = formData.vtcCardStatus === 'oui' ? 'Oui [OK]' : formData.vtcCardStatus === 'encours' ? 'En cours [Attente]' : 'Non';
    const vehicleLabel = formData.hasVehicle ? `Oui (${formData.vehicleModel || 'Non specifie'} - ${formData.vehiclePlate || 'N/A'})` : 'Non';
    const platformsLabel = formData.platforms.map(p => p.toUpperCase()).join(', ') || 'Aucune';

    const allDocsUploaded = !!(
      cloudinaryUrls.vtcRecto &&
      cloudinaryUrls.vtcVerso &&
      cloudinaryUrls.rcCirculation &&
      cloudinaryUrls.carteGrise &&
      cloudinaryUrls.memoAssurance &&
      cloudinaryUrls.signature
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
      if (!cloudinaryUrls.memoAssurance) missingLabels.push('Memo Assurance');
      if (!cloudinaryUrls.signature) missingLabels.push('Photo Signature');

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

    setCreatedDriverName(`${fName} ${lName}`);
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Send E-mail via Web3Forms API
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
    .then(data => console.log('Web3Forms contact success:', data))
    .catch(err => console.error('Web3Forms contact error:', err));

    // 2. Format WhatsApp notification message
    const waContactMessage = `*** NOUVEAU MESSAGE DE CONTACT - NORDRIVE ***

- Nom : ${contactForm.name}
- Telephone : ${contactForm.phone}
${contactForm.email ? `- Email : ${contactForm.email}\n` : ''}- Message : ${contactForm.message}`;

    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waContactMessage)}`;
    window.open(whatsappUrl, '_blank');

    setContactSubmitted(true);
  };

  const handleReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fName = referralForm.friendFirstName || referralForm.friendLastName || 'Mon Ami';
    const lName = referralForm.friendFirstName ? referralForm.friendLastName : '';

    const waReferralMessage = `*** DEMANDE DE PARRAINAGE (200€) - NORDRIVE ***

- Le Parrain (Moi) : ${referralForm.referrerName}
- Mon Téléphone : ${referralForm.referrerPhone}

- Mon Ami Parrainé : ${fName} ${lName}
- Téléphone Ami : ${referralForm.friendPhone}

Je parraine cet ami pour qu'il rejoigne la flotte Nordrive VTC. Merci d'enregistrer ma prime de 200€ !`;

    // 1. Send E-mail via Web3Forms in background
    const referralData = new FormData();
    referralData.append('access_key', '7dc10224-3e56-4c49-850d-cb01c1e52a5e');
    referralData.append('subject', `Nouveau Parrainage VTC par ${referralForm.referrerName}`);
    referralData.append('Nom Parrain', referralForm.referrerName);
    referralData.append('Tel Parrain', referralForm.referrerPhone);
    referralData.append('Nom Ami', `${fName} ${lName}`);
    referralData.append('Tel Ami', referralForm.friendPhone);
    referralData.append('Carte VTC Ami', 'Oui (Confirmé)');

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: referralData,
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(res => res.json())
    .then(data => console.log('Web3Forms referral success:', data))
    .catch(err => console.error('Web3Forms referral error:', err));

    // 2. Open WhatsApp Web / App
    const whatsappUrl = `https://wa.me/33743767400?text=${encodeURIComponent(waReferralMessage)}`;
    window.open(whatsappUrl, '_blank');
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

    // Upload files to Cloudinary
    for (const key of docKeys) {
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
            console.log(`Cloudinary upload success for insurance doc ${key}:`, uploadResult.secure_url);
          }
        } catch (err) {
          console.error(`Error uploading ${key} to Cloudinary:`, err);
        }
      }
    }

    // 1. Send E-mail via Web3Forms API
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
      const data = await res.json();
      console.log('Web3Forms insurance submit success:', data);
    } catch (err) {
      console.error('Web3Forms insurance submit error:', err);
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

  // Registration Form Render helper (closure)
  const renderRegistrationForm = () => {
    const allDocsUploaded = !!(
      optionalDocs.vtcRecto &&
      optionalDocs.vtcVerso &&
      optionalDocs.rcCirculation &&
      optionalDocs.carteGrise &&
      optionalDocs.memoAssurance &&
      optionalDocs.signature
    );
    
    return (
      <div className="dd-card-glow flyer-card-left" style={{ background: 'linear-gradient(165deg, rgba(22, 33, 47, 0.96) 0%, rgba(11, 18, 27, 0.99) 100%)', border: '1.5px solid rgba(229, 178, 70, 0.35)', boxShadow: '0 0 50px rgba(0,0,0,0.8), 0 0 30px rgba(229, 178, 70, 0.1)', padding: isMobile ? '20px 14px 18px' : '28px 24px 24px', borderRadius: isMobile ? '20px' : '24px', position: 'relative' }}>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit}>

            {/* HEADER — Value Anchor */}
            <div style={{ textAlign: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(229, 178, 70, 0.2)' }}>
              <div style={{ display: 'inline-block', background: 'rgba(229, 178, 70, 0.15)', border: '1px solid #E5B246', color: '#FFE29F', fontSize: isMobile ? '10px' : '11px', fontWeight: 800, padding: '4px 14px', borderRadius: '100px', marginBottom: '8px', letterSpacing: '0.5px' }}>
                ⭐ DOSSIER EN LIGNE OFFICIEL
              </div>
              <h3 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: '4px' }}>
                Rattachement Flotte Nordrive <br />
                <span className="flyer-gold-text" style={{ fontSize: isMobile ? '22px' : '27px' }}>50€ / semaine si vous travaillez</span>
              </h3>
              <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#CBD5E1', lineHeight: 1.4, margin: 0 }}>
                Rattachement en <strong style={{ color: '#FFF' }}>1h chrono</strong> · Contrat CDI / CDD · 0€ si vacances · Véhicules +12 ans acceptés
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
                required
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
                style={{ margin: 0, marginTop: '3px', accentColor: '#38BDF8', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.5 }}>
                J'accepte que mes informations soient traitées par <strong style={{ color: '#CBD5E1' }}>Nordrive Services</strong> pour créer mon dossier de rattachement VTC. *
              </span>
            </label>

            <button 
              type="submit" 
              className="dd-btn dd-btn-primary" 
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
              <span>{isSubmitting ? "⏳ Validation en cours..." : "🏔️ Je rejoins la Flotte Nordrive →"}</span>
            </button>

            {/* GUARANTEE STRIP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '12px' }}>
              {[
                { icon: '🔒', label: 'Sans engagement' },
                { icon: '⚡', label: 'Réponse sous 1h' },
                { icon: '🎁', label: '1ère sem. offerte' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.12)', borderRadius: '10px', padding: '8px 4px' }}>
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#7DD3FC', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                </div>
              ))}
            </div>

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
                        { key: 'memoAssurance', label: 'Mémo Assurance' },
                        { key: 'signature', label: 'Photo Signature' },
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
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderBottom: 'none',
          boxShadow: 'none',
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
          {!isMobile && (
            <nav style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
              <a href="#calcul" onClick={(e) => scrollToSection(e, 'calcul')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>Notre concept</a>
              <a href="/assurance" onClick={(e) => navigateTo(e, '/assurance')} style={{ fontSize: '12.5px', fontWeight: 700, color: '#38BDF8', textDecoration: 'none', transition: 'color 0.2s' }}>Assurance VTC</a>
              <a href="#comparatif" onClick={(e) => scrollToSection(e, 'comparatif')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>Comparatif</a>
              <a href="#formules" onClick={(e) => scrollToSection(e, 'formules')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>Formules</a>
              <a href="/simulateur" onClick={(e) => navigateTo(e, '/simulateur')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>Simulateur</a>
              <a href="/parrainage" onClick={(e) => navigateTo(e, '/parrainage')} style={{ fontSize: '12.5px', fontWeight: 800, color: '#F59E0B', textDecoration: 'none' }}>Parrainage 200€</a>
              <a href="/faq" onClick={(e) => navigateTo(e, '/faq')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>FAQ</a>
              <a href="/contact" onClick={(e) => navigateTo(e, '/contact')} style={{ fontSize: '12.5px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)', textDecoration: 'none', transition: 'color 0.2s' }}>Contact</a>
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
                Nous rejoindre
              </a>
            )}

            {/* LES 3 TRAITS FINS MENU HAMBURGER (≡) PURE DESIGN STYLE NORDVPN SUR MOBILE */}
            {isMobile && (
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
          <a href="#calcul" onClick={(e) => { scrollToSection(e, 'calcul'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Notre concept</a>
          <a href="/assurance" onClick={(e) => { navigateTo(e, '/assurance'); setMobileMenuOpen(false); }} style={{ color: '#38BDF8', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>🛡️ Assurance VTC (Devis 1h)</a>
          <a href="#comparatif" onClick={(e) => { scrollToSection(e, 'comparatif'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Comparatif</a>
          <a href="#formules" onClick={(e) => { scrollToSection(e, 'formules'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Formules</a>
          <a href="/simulateur" onClick={(e) => { navigateTo(e, '/simulateur'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Simulateur</a>
          <a href="/parrainage" onClick={(e) => { navigateTo(e, '/parrainage'); setMobileMenuOpen(false); }} style={{ color: '#F59E0B', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Parrainage 200€</a>
          <a href="/faq" onClick={(e) => { navigateTo(e, '/faq'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>FAQ complète</a>
          <a href="/qui-sommes-nous" onClick={(e) => { navigateTo(e, '/qui-sommes-nous'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>Qui sommes-nous</a>
          <a href="/contact" onClick={(e) => { navigateTo(e, '/contact'); setMobileMenuOpen(false); }} style={{ color: '#FFF', fontSize: '15px', fontWeight: 700, textDecoration: 'none', padding: '10px 0' }}>Contact</a>
          
          <a 
            href="#formulaire" 
            onClick={(e) => { scrollToSection(e, 'formulaire'); setMobileMenuOpen(false); }} 
            style={{ 
              marginTop: '12px',
              padding: '12px 20px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 800,
              color: '#FFF',
              background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
              borderRadius: '100px',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(2, 132, 199, 0.35)'
            }}
          >
            Nous rejoindre — Dossier en 1h
          </a>
        </div>
      )}

      <main style={{ position: 'relative', zIndex: 1 }}>
        {currentPath === '/' && (
          <>
            {/* HERO SECTION NORDRIVE — ÉPURÉ, LUXE ET PUNCHY */}
            <section className="dd-hero-section" style={{ paddingBottom: isMobile ? '36px' : '56px', paddingTop: isMobile ? '85px' : '120px' }}>
              <div className="dd-container" style={{ maxWidth: '1040px', textAlign: 'center' }}>
                
                {/* 1. BADGE CAPSULE SUPÉRIEUR */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(229, 193, 88, 0.1)', border: '1px solid rgba(229, 193, 88, 0.35)', borderRadius: '100px', padding: isMobile ? '5px 14px' : '6px 18px', maxWidth: '92vw', marginBottom: isMobile ? '12px' : '18px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#E5C158', boxShadow: '0 0 10px #E5C158', flexShrink: 0 }}></span>
                  <span style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: 800, color: '#FFE29F', letterSpacing: isMobile ? '0.5px' : '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {isMobile ? "FLOTTE AGRÉÉE • UBER, BOLT, HEETCH" : "FLOTTE VTC AGRÉÉE • PARTENAIRE OFFICIEL UBER, BOLT & HEETCH"}
                  </span>
                </div>

                {/* 2. TITRE PRINCIPAL MAJESTUEUX */}
                <h1 style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontSize: isMobile ? '22px' : '56px',
                  fontWeight: 900,
                  letterSpacing: isMobile ? '0px' : '-1.5px',
                  lineHeight: 1.25,
                  color: '#FFF',
                  margin: isMobile ? '0 auto 10px' : '0 auto 16px',
                  padding: isMobile ? '0 10px' : 0,
                  maxWidth: '850px',
                }}>
                  Votre Rattachement VTC <br />
                  <span className="flyer-gold-text">en toute sérénité</span>
                </h1>

                {/* 3. SOUS-TITRE CLAIR & RASSURANT */}
                <p style={{
                  fontSize: isMobile ? '13px' : '16.5px',
                  color: '#CBD5E1',
                  maxWidth: '720px',
                  margin: isMobile ? '0 auto 16px' : '0 auto 22px',
                  lineHeight: 1.5,
                  padding: isMobile ? '0 6px' : 0,
                }}>
                  Roulez sur toutes les applications avec la flotte la plus transparente.
                  <strong style={{ color: '#FFF' }}> 50€ par semaine uniquement si vous roulez</strong>, 
                  virements bancaires garantis chaque lundi et zéro commission sur votre chiffre d'affaires.
                </p>

                {/* 4. LOGOS DES PLATEFORMES (ÉLÉGANTS & HARMONIEUX) */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? '14px' : '28px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '100px', padding: isMobile ? '5px 16px' : '8px 26px', marginBottom: isMobile ? '20px' : '28px' }}>
                  <span style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: 900, color: '#FFF', letterSpacing: '-0.5px' }}>Uber</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: 900, color: '#34D399', letterSpacing: '-0.5px' }}>Bolt</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                  <span style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: 900, color: '#FF0055', letterSpacing: '0.5px' }}>HEETCH</span>
                </div>

                {/* 5. ACTION HUB INSTANTANÉ (AU DESSUS DES CARTES POUR CONVERSION IMMÉDIATE) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '10px' : '16px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '380px' : 'none', margin: '0 auto 26px' }}>
                  {/* BOUTON WHATSAPP DIRECT */}
                  <a
                    href="https://wa.me/33743767400?text=Bonjour%20Nordrive%2C%20je%20souhaite%20m%27inscrire%20et%20avoir%20des%20infos%20sur%20le%20rattachement%20flotte%20VTC."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '12px 18px' : '15px 28px',
                      borderRadius: '100px',
                      background: 'linear-gradient(135deg, #25D366 0%, #1EBE5D 100%)',
                      color: '#FFF',
                      fontSize: isMobile ? '12.5px' : '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 8px 25px rgba(37, 211, 102, 0.45)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <MessageSquare size={17} />
                    <span>{isMobile ? "WhatsApp Direct (07 43 76 74 00)" : "Inscription Flash WhatsApp (07 43 76 74 00)"}</span>
                  </a>

                  {/* BOUTON FORMULAIRE EN LIGNE (SCROLL DOUX VERS #formulaire) */}
                  <a
                    href="#formulaire"
                    onClick={(e) => scrollToSection(e, 'formulaire')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '12px 18px' : '15px 26px',
                      borderRadius: '100px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1.5px solid rgba(229, 178, 70, 0.5)',
                      color: '#FFE29F',
                      fontSize: isMobile ? '12.5px' : '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>{isMobile ? "📝 Formulaire Express en ligne" : "📝 Formulaire Express (2 min)"}</span>
                  </a>
                </div>

                {/* 6. LES 3 PILIERS FORTS DE L'OFFRE (3 CARTES MODERNES ÉPURÉES) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: isMobile ? '12px' : '18px',
                  maxWidth: '960px',
                  margin: '0 auto 28px',
                  textAlign: 'left'
                }}>
                  {/* PILIER 1: 50€ FIXE */}
                  <div className="flyer-card-right-gold" style={{ padding: isMobile ? '18px 16px' : '24px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#FFE29F', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(229, 178, 70, 0.2)', padding: '3px 10px', borderRadius: '100px' }}>
                          OFFRE UNIQUE
                        </span>
                        <span style={{ fontSize: '16px' }}>💎</span>
                      </div>
                      <div className="flyer-gold-text" style={{ fontSize: isMobile ? '34px' : '44px', fontWeight: 900, lineHeight: 1, marginBottom: '4px' }}>
                        50€*
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#FFF', marginBottom: '6px' }}>
                        PAR SEMAINE TRAVAILLÉE
                      </div>
                      <p style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: 1.45, margin: 0 }}>
                        <strong style={{ color: '#34D399' }}>0€ si vous ne roulez pas.</strong> Zéro pourcentage sur votre CA, vous conservez 100% de vos gains nets.
                      </p>
                    </div>
                  </div>

                  {/* PILIER 2: VÉHICULES +12 ANS */}
                  <div className="flyer-card-left" style={{ padding: isMobile ? '18px 16px' : '24px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(56, 189, 248, 0.15)', padding: '3px 10px', borderRadius: '100px' }}>
                          ACCORD FLOTTE
                        </span>
                        <span style={{ fontSize: '16px' }}>🚗</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 900, color: '#FFF', lineHeight: 1.2, marginBottom: '6px' }}>
                        Véhicules +12 ans acceptés
                      </div>
                      <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.45, margin: 0 }}>
                        Notre statut officiel de gestionnaire de flotte agréé permet d'activer légalement vos véhicules de plus de 12 ans sur les plateformes.
                      </p>
                    </div>
                  </div>

                  {/* PILIER 3: MACARON < 1 HEURE */}
                  <div className="flyer-card-left" style={{ padding: isMobile ? '18px 16px' : '24px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#A7F3D0', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 10px', borderRadius: '100px' }}>
                          EXPRESS
                        </span>
                        <span style={{ fontSize: '16px' }}>⚡</span>
                      </div>
                      <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 900, color: '#FFF', lineHeight: 1.2, marginBottom: '6px' }}>
                        Macaron VTC en moins d'1h
                      </div>
                      <p style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.45, margin: 0 }}>
                        Attestation officielle immédiate. Contrats CDI ou CDD au choix, fiches de paie mensuelles et conformité juridique totale.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 7. CAPSULE PARRAINAGE 200€ */}
                <div>
                  <a
                    href="/parrainage"
                    onClick={(e) => navigateTo(e, '/parrainage')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#FFE29F',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'rgba(229, 178, 70, 0.1)',
                      border: '1px solid rgba(229, 178, 70, 0.25)',
                      padding: '5px 14px',
                      borderRadius: '100px',
                      maxWidth: '92vw'
                    }}
                  >
                    <Gift size={13} color="#E5C158" />
                    <span>🎁 Programme Parrainage : Jusqu'à 200 € offerts par chauffeur parrainé →</span>
                  </a>
                </div>

              </div>
            </section>

            {/* SECTION 2 : EXPLICATION CLAIRE — COMBIEN VOUS EMPOCHEZ (SEMAINE & MOIS) */}
            <section id="calcul-gains" className="dd-container" style={{ padding: isMobile ? '36px 14px 40px' : '50px 20px 50px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>

              {/* Header section explication */}
              <div className="reveal-on-scroll" style={{ textAlign: 'center', maxWidth: '850px', margin: '0 auto 20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '1.2px', background: 'rgba(16, 185, 129, 0.1)', padding: '5px 12px', borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  💶 Vos gains réels expliqués
                </span>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: isMobile ? '23px' : '34px', fontWeight: 900, color: '#FFF', margin: '12px 0 8px', lineHeight: 1.25 }}>
                  Combien vous empochez réellement ?
                </h2>
                <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#CBD5E1', lineHeight: isMobile ? '1.5' : '1.7', maxWidth: '700px', margin: '0 auto 16px' }}>
                  Chez Nordrive, nous prélevons uniquement <strong style={{ color: '#FFE29F' }}>50€ par semaine</strong> travaillée. <strong style={{ color: '#34D399' }}>Tout le reste de votre CA va directement dans votre poche.</strong>
                </p>

                {/* Toggle Sélecteur Semaine / Mois */}
                <div style={{ display: 'inline-flex', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '360px' : 'none', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '100px', padding: '4px', gap: '4px', marginBottom: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setExamplePeriod('semaine')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: isMobile ? '8px 12px' : '9px 20px',
                      borderRadius: '100px',
                      border: 'none',
                      background: examplePeriod === 'semaine' ? 'linear-gradient(135deg, #FFE29F 0%, #FFAE34 60%, #C88300 100%)' : 'transparent',
                      color: examplePeriod === 'semaine' ? '#1A1000' : '#CBD5E1',
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: examplePeriod === 'semaine' ? '0 4px 15px rgba(229, 178, 70, 0.4)' : 'none',
                    }}
                  >
                    ⚡ Vue Semaine
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamplePeriod('mois')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: isMobile ? '8px 12px' : '9px 20px',
                      borderRadius: '100px',
                      border: 'none',
                      background: examplePeriod === 'mois' ? 'linear-gradient(135deg, #FFE29F 0%, #FFAE34 60%, #C88300 100%)' : 'transparent',
                      color: examplePeriod === 'mois' ? '#1A1000' : '#CBD5E1',
                      fontSize: isMobile ? '12px' : '13px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: examplePeriod === 'mois' ? '0 4px 15px rgba(229, 178, 70, 0.4)' : 'none',
                    }}
                  >
                    📅 Vue Mois
                  </button>
                </div>
              </div>

              {/* ====== 3 EXEMPLES VISUELS EN CARDS ====== */}
              <div className="reveal-zoom" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? '14px' : '18px', maxWidth: '980px', margin: '0 auto 16px' }}>

                {/* Exemple 1 — 1 200€ / sem */}
                <div style={{
                  background: 'linear-gradient(160deg, rgba(16, 185, 129, 0.12) 0%, rgba(11, 17, 25, 0.95) 100%)',
                  border: '1.5px solid rgba(16, 185, 129, 0.5)',
                  borderRadius: isMobile ? '18px' : '22px',
                  padding: isMobile ? '20px 14px' : '24px 20px',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)',
                }}>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(16, 185, 129, 0.25)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#34D399', fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                    🌟 Le + courant
                  </div>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Banknote size={20} color="#34D399" />
                  </div>
                  
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    {examplePeriod === 'semaine' ? "Chiffre d'affaires semaine" : "Chiffre d'affaires mensuel"}
                  </p>
                  <div style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 900, color: '#FFF', lineHeight: 1.1 }}>
                    {examplePeriod === 'semaine' ? '1 200 €' : '4 800 €'}
                  </div>

                  <div style={{ margin: '8px auto', width: '85%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', color: '#F87171', fontWeight: 800 }}>
                      {examplePeriod === 'semaine' ? '− 50 €' : '− 200 €'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      {examplePeriod === 'semaine' ? '(frais Nordrive)' : '(4 sem × 50€)'}
                    </span>
                  </div>

                  <div style={{ margin: '6px auto', width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent)' }} />

                  <p style={{ fontSize: '10.5px', fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    💰 DANS VOTRE POCHE (NET)
                  </p>
                  <div style={{ fontSize: isMobile ? '32px' : '38px', fontWeight: 900, color: '#34D399', lineHeight: 1 }}>
                    {examplePeriod === 'semaine' ? '1 150 €' : '4 600 €'}
                  </div>
                  <p style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '6px' }}>✓ Virement chaque lundi</p>
                </div>

                {/* Exemple 2 — 1 000€ / sem */}
                <div style={{
                  background: 'linear-gradient(160deg, rgba(56, 189, 248, 0.08) 0%, rgba(11, 17, 25, 0.95) 100%)',
                  border: '1.5px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: isMobile ? '18px' : '22px',
                  padding: isMobile ? '20px 14px' : '24px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Wallet size={20} color="#38BDF8" />
                  </div>
                  
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    {examplePeriod === 'semaine' ? "Chiffre d'affaires semaine" : "Chiffre d'affaires mensuel"}
                  </p>
                  <div style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 900, color: '#FFF', lineHeight: 1.1 }}>
                    {examplePeriod === 'semaine' ? '1 000 €' : '4 000 €'}
                  </div>

                  <div style={{ margin: '8px auto', width: '85%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', color: '#F87171', fontWeight: 800 }}>
                      {examplePeriod === 'semaine' ? '− 50 €' : '− 200 €'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      {examplePeriod === 'semaine' ? '(frais Nordrive)' : '(4 sem × 50€)'}
                    </span>
                  </div>

                  <div style={{ margin: '6px auto', width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent)' }} />

                  <p style={{ fontSize: '10.5px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    💰 DANS VOTRE POCHE (NET)
                  </p>
                  <div style={{ fontSize: isMobile ? '32px' : '38px', fontWeight: 900, color: '#38BDF8', lineHeight: 1 }}>
                    {examplePeriod === 'semaine' ? '950 €' : '3 800 €'}
                  </div>
                  <p style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '6px' }}>✓ Virement chaque lundi</p>
                </div>

                {/* Exemple 3 — 500€ / sem */}
                <div style={{
                  background: 'linear-gradient(160deg, rgba(229, 178, 70, 0.08) 0%, rgba(11, 17, 25, 0.95) 100%)',
                  border: '1.5px solid rgba(229, 178, 70, 0.35)',
                  borderRadius: isMobile ? '18px' : '22px',
                  padding: isMobile ? '20px 14px' : '24px 20px',
                  textAlign: 'center',
                }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(229, 178, 70, 0.12)', border: '1px solid rgba(229, 178, 70, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <Wallet size={20} color="#E5C158" />
                  </div>
                  
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    {examplePeriod === 'semaine' ? "Chiffre d'affaires semaine" : "Chiffre d'affaires mensuel"}
                  </p>
                  <div style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 900, color: '#FFF', lineHeight: 1.1 }}>
                    {examplePeriod === 'semaine' ? '500 €' : '2 000 €'}
                  </div>

                  <div style={{ margin: '8px auto', width: '85%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12.5px', color: '#F87171', fontWeight: 800 }}>
                      {examplePeriod === 'semaine' ? '− 50 €' : '− 200 €'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                      {examplePeriod === 'semaine' ? '(frais Nordrive)' : '(4 sem × 50€)'}
                    </span>
                  </div>

                  <div style={{ margin: '6px auto', width: '60%', height: '2px', background: 'linear-gradient(90deg, transparent, rgba(229, 178, 70, 0.5), transparent)' }} />

                  <p style={{ fontSize: '10.5px', fontWeight: 800, color: '#FFE29F', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    💰 DANS VOTRE POCHE (NET)
                  </p>
                  <div style={{ fontSize: isMobile ? '32px' : '38px', fontWeight: 900, color: '#FFE29F', lineHeight: 1 }}>
                    {examplePeriod === 'semaine' ? '450 €' : '1 800 €'}
                  </div>
                  <p style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '6px' }}>✓ Virement chaque lundi</p>
                </div>

              </div>

              {/* BONUS : Semaine 0€ */}
              <div className="reveal-on-scroll" style={{ maxWidth: '980px', margin: '0 auto 16px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(229, 178, 70, 0.08) 100%)',
                  border: '1.5px dashed rgba(16, 185, 129, 0.4)',
                  borderRadius: isMobile ? '14px' : '16px',
                  padding: isMobile ? '14px 12px' : '18px 24px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  gap: isMobile ? '10px' : '16px',
                  textAlign: isMobile ? 'center' : 'left',
                }}>
                  <div style={{ fontSize: isMobile ? '28px' : '32px', lineHeight: 1 }}>🏖️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: isMobile ? '13.5px' : '14.5px', fontWeight: 800, color: '#FFF', marginBottom: '2px' }}>
                      Et si vous ne travaillez pas une semaine ?
                    </p>
                    <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#9CA3AF', lineHeight: 1.4, margin: 0 }}>
                      C'est simple : <strong style={{ color: '#34D399' }}>0€ de CA = 0€ de frais</strong>. Vous partez en vacances ou faites une pause ? Vous ne payez rien.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#34D399', fontSize: isMobile ? '16px' : '18px', fontWeight: 900, padding: isMobile ? '6px 14px' : '8px 18px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                    0€ = 0€
                  </div>
                </div>
              </div>

              {/* BOUTON SIMULATEUR COMPLET */}
              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <a
                  href="/simulateur"
                  onClick={(e) => navigateTo(e, '/simulateur')}
                  className="dd-btn dd-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '100px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    textDecoration: 'none'
                  }}
                >
                  <span>🧮 Tester le Simulateur Interactif Complet →</span>
                </a>
              </div>
            </section>

            {/* SECTION 3 : FORMULAIRE DE RATTACHEMENT EXPRESS */}
            <section id="formulaire" className="dd-container" style={{ padding: isMobile ? '36px 14px 40px' : '50px 20px 60px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="reveal-on-scroll" style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 24px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFE29F', textTransform: 'uppercase', letterSpacing: '1.2px', background: 'rgba(229, 178, 70, 0.12)', border: '1px solid rgba(229, 178, 70, 0.35)', padding: '5px 14px', borderRadius: '100px' }}>
                  🚀 Inscription Express en 2 Minutes
                </span>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: isMobile ? '23px' : '32px', fontWeight: 900, color: '#FFF', margin: '12px 0 6px' }}>
                  Rejoignez la Flotte Nordrive
                </h2>
                <p style={{ fontSize: isMobile ? '13px' : '14.5px', color: '#94A3B8', margin: 0 }}>
                  Renseignez vos coordonnées ci-dessous pour recevoir votre contrat et votre attestation de macaron.
                </p>
              </div>

              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                {renderRegistrationForm()}
              </div>
            </section>

            {/* SECTION 4 : QUESTIONS FRÉQUENTES (MINI-FAQ) */}
            <section id="faq" className="dd-container" style={{ maxWidth: '800px', padding: isMobile ? '36px 14px 40px' : '50px 20px 60px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div className="reveal-on-scroll" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFE29F', textTransform: 'uppercase', letterSpacing: '1px' }}>❄️ Réponses Directes</span>
                <h2 style={{ fontSize: isMobile ? '23px' : '30px', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>Questions fréquentes</h2>
              </div>

              {faqList.slice(0, 4).map((item, idx) => (
                <div key={idx} className="nord-accordion-item">
                  <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="nord-accordion-btn" style={{ padding: '14px 18px', fontSize: isMobile ? '13px' : '14.5px' }}>
                    <span>{item.q}</span>
                    <span className={`nord-accordion-plus ${openFaq === idx ? 'open' : ''}`}>+</span>
                  </button>
                  {openFaq === idx && (
                    <div style={{ padding: '0 18px 16px', color: '#CBD5E1', fontSize: '13px', lineHeight: '1.5', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <a
                  href="/faq"
                  onClick={(e) => navigateTo(e, '/faq')}
                  style={{
                    color: '#FFE29F',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>Voir toutes les questions & réponses (FAQ complète) →</span>
                </a>
              </div>
            </section>

            {/* SECTION 5 : BANNIÈRE D'ASSISTANCE WHATSAPP DIRECT */}
            <section className="dd-container" style={{ padding: isMobile ? '20px 14px 50px' : '30px 20px 70px', textAlign: 'center' }}>
              <div className="flyer-card-right-gold" style={{ maxWidth: '840px', margin: '0 auto', padding: isMobile ? '24px 16px' : '36px 32px', borderRadius: '22px' }}>
                <h3 style={{ fontSize: isMobile ? '22px' : '30px', fontWeight: 900, color: '#FFF', marginBottom: '8px' }}>
                  Une question ou besoin d'un macaron urgent ?
                </h3>
                <p style={{ fontSize: isMobile ? '13px' : '14.5px', color: '#CBD5E1', maxWidth: '580px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  Notre équipe de gestionnaires est disponible 7j/7 pour valider votre dossier et répondre à vos questions par message.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href="https://wa.me/33743767400?text=Bonjour%20Nordrive%2C%20j%27ai%20une%20question%20sur%20le%20rattachement."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '13px 26px',
                      borderRadius: '100px',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#FFF',
                      background: '#25D366',
                      border: 'none',
                      textDecoration: 'none',
                      boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)',
                    }}
                  >
                    <MessageSquare size={17} />
                    <span>WhatsApp Direct (07 43 76 74 00)</span>
                  </a>
                </div>
              </div>
            </section>
          </>
        )}

        {/* SECTION: CHAOS VS SÉRÉNITÉ (DÉDIÉ SUR /comparatif) */}
        {currentPath === '/comparatif' && (
        <section id="comparatif" className="dd-container" style={{ padding: isMobile ? '160px 20px 80px' : '120px 20px 80px' }}>
          <div style={{ marginBottom: '30px', textAlign: 'left', maxWidth: '1000px', margin: '0 auto 24px' }}>
            <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ← Retour à l'accueil
            </a>
          </div>
          <div className="reveal-on-scroll" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 36px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '1px' }}>⚖️ Comparaison Visuelle</span>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: '32px', fontWeight: 900, color: '#FFF', margin: '6px 0 12px' }}>
              Le Chaos de la Plaine vs Le Sommet Nordrive
            </h2>
            <p style={{ fontSize: '13.5px', color: '#9CA3AF', lineHeight: '1.6' }}>
              Voyez concrètement comment Nordrive transforme le cauchemar administratif en simplicité absolue.
            </p>

            {/* Toggle Switcher Buttons */}
            <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4px', borderRadius: '100px', marginTop: '24px' }}>
              <button 
                onClick={() => setBeforeAfterActive('before')} 
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '100px', 
                  border: 'none', 
                  background: beforeAfterActive === 'before' ? '#EF4444' : 'transparent',
                  color: beforeAfterActive === 'before' ? '#000' : '#FFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                ❌ L'Indépendance classique
              </button>
              <button 
                onClick={() => setBeforeAfterActive('after')} 
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '100px', 
                  border: 'none', 
                  background: beforeAfterActive === 'after' ? '#10B981' : 'transparent',
                  color: beforeAfterActive === 'after' ? '#000' : '#FFF',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                ✓ La Sérénité Nordrive
              </button>
            </div>
          </div>

          {/* Interactive Mockup Display */}
          <div className="reveal-zoom" style={{ maxWidth: '750px', margin: '0 auto' }}>
            {beforeAfterActive === 'before' ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '24px', padding: '32px', boxShadow: '0 12px 40px rgba(239, 68, 68, 0.08)' }}>
                <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '16px' }}>Le statut indépendant classique</span>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', marginBottom: '20px' }}>Le cauchemar des démarches obligatoires</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { title: 'URSSAF & Charges', text: 'Déclaration mensuelle complexe, majorations de retard, calculs compliqués de TVA.', alert: true },
                    { title: 'Zéro Protection Sociale', text: 'Aucun droit au chômage, mutuelle onéreuse et absence de fiche de paie officielle.', alert: true },
                    { title: 'Trésorerie & Risques', text: 'Responsabilité personnelle directe en cas de contrôle ou de litige.', alert: true },
                    { title: 'Support & Comptabilité', text: 'Comptable obligatoire (~2 000€/an), frais bancaires professionnels supplémentaires.', alert: true },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', background: 'rgba(2, 6, 16, 0.6)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '14px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '16px' }}>⚠️</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#EF4444' }}>{item.title}</strong>
                        <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '2px 0 0' }}>{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '24px', padding: '32px', boxShadow: '0 12px 40px rgba(16, 185, 129, 0.08)' }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#A7F3D0', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '100px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '16px' }}>Le statut de rattaché Nordrive</span>
                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#FFF', marginBottom: '20px' }}>Le confort du statut salarié</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { title: 'Zéro Administration', text: 'Nordrive gère 100% de la facturation, déclarations sociales et déclarations fiscales.', check: true },
                    { title: 'Vrai Contrat CDI', text: 'Bulletins de paie officiels édités chaque mois en toute conformité.', check: true },
                    { title: 'Protection Intégrale', text: 'Mutuelle de flotte incluse, assurance responsabilité professionnelle couverte, cumul de retraite.', check: true },
                    { title: 'Versement Garanti le Lundi', text: 'Paiement hebdomadaire de votre salaire net par virement automatique sur votre compte.', check: true },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', background: 'rgba(2, 6, 16, 0.6)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '14px', borderRadius: '12px' }}>
                      <span style={{ fontSize: '16px', color: '#10B981' }}>✓</span>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#34D399' }}>{item.title}</strong>
                        <p style={{ fontSize: '12.5px', color: '#9CA3AF', margin: '2px 0 0' }}>{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        {/* SECTION: ASSURANCE VTC (DEVIS DÉDIÉ SUR /assurance) */}
        {currentPath === '/assurance' && (
        <section id="assurance" className="dd-container" style={{ padding: isMobile ? '160px 20px 80px' : '120px 20px 80px' }}>
          <div style={{ marginBottom: '30px', textAlign: 'left', maxWidth: '1000px', margin: '0 auto 24px' }}>
            <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              ← Retour à l'accueil
            </a>
          </div>

          <div className="reveal-on-scroll" style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38BDF8', fontSize: '11px', fontWeight: 800, padding: '4px 14px', borderRadius: '100px', marginBottom: '12px' }}>
              🛡️ SERVICE ASSURANCE VTC & RC CIRCULATION
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", fontSize: isMobile ? '28px' : '36px', fontWeight: 900, color: '#FFF', margin: '6px 0 12px' }}>
              Obtenez votre Tarif d'Assurance VTC en 1h
            </h2>
            <p style={{ fontSize: '14.5px', color: '#9CA3AF', lineHeight: '1.6' }}>
              Remplissez le formulaire ci-dessous et joignez vos 3 documents (<strong style={{ color: '#FFF' }}>Carte Grise</strong>, <strong style={{ color: '#FFF' }}>Permis de conduire</strong> et <strong style={{ color: '#FFF' }}>Relevé d'information +36 mois</strong>). Vous recevrez immédiatement votre devis sur <strong style={{ color: '#34D399' }}>WhatsApp</strong> et par <strong style={{ color: '#38BDF8' }}>Email</strong>.
            </p>
          </div>

          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="dd-card-glow reveal-zoom" style={{ background: 'linear-gradient(160deg, rgba(10, 16, 36, 0.96) 0%, rgba(5, 10, 22, 0.99) 100%)', border: '1px solid rgba(56, 189, 248, 0.28)', boxShadow: '0 0 50px rgba(56, 189, 248, 0.1), 0 24px 80px rgba(0,0,0,0.8)', padding: isMobile ? '24px 18px' : '36px 32px', borderRadius: '28px' }}>
              
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
                      background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
                      color: '#FFF',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(2, 132, 199, 0.45)',
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
          </div>
        </section>
        )}

        {/* SECTION: SIMULATEUR DÉDIÉ SUR /simulateur */}
        {currentPath === '/simulateur' && (
          <section id="simulateur" className="dd-container" style={{ padding: isMobile ? '110px 14px 60px' : '120px 20px 80px' }}>
            <div style={{ marginBottom: '24px', textAlign: 'left', maxWidth: '1000px', margin: '0 auto 20px' }}>
              <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: isMobile ? '13px' : '14px' }}>
                ← Retour à l'accueil
              </a>
            </div>
            <div className={`dd-simulator-card reveal-zoom ${isSubpage ? 'is-revealed' : ''}`} style={{ padding: isMobile ? '20px 14px' : '32px 28px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '1.2px' }}>🏔️ Simulateur Nordrive</span>
                <h2 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 900, color: '#FFF', margin: '6px 0', lineHeight: 1.25 }}>Combien Allez-Vous Gagner de Plus ?</h2>
                <p style={{ fontSize: isMobile ? '12.5px' : '13.5px', color: '#9CA3AF', margin: 0 }}>Comparez vos revenus réels en Flotte Nordrive (50€/sem) par rapport à l'Auto-entrepreneur.</p>

                {/* Sélecteur Semaine / Mois pour le Simulateur */}
                <div style={{ display: 'inline-flex', width: isMobile ? '100%' : 'auto', maxWidth: isMobile ? '340px' : 'none', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '100px', padding: '4px', gap: '4px', marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setSimPeriod('semaine')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: isMobile ? '7px 10px' : '8px 18px',
                      borderRadius: '100px',
                      border: 'none',
                      background: simPeriod === 'semaine' ? 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)' : 'transparent',
                      color: simPeriod === 'semaine' ? '#FFF' : '#94A3B8',
                      fontSize: isMobile ? '11.5px' : '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: simPeriod === 'semaine' ? '0 4px 15px rgba(2, 132, 199, 0.4)' : 'none',
                    }}
                  >
                    ⚡ Par Semaine
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimPeriod('mois')}
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: isMobile ? '7px 10px' : '8px 18px',
                      borderRadius: '100px',
                      border: 'none',
                      background: simPeriod === 'mois' ? 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)' : 'transparent',
                      color: simPeriod === 'mois' ? '#FFF' : '#94A3B8',
                      fontSize: isMobile ? '11.5px' : '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: simPeriod === 'mois' ? '0 4px 15px rgba(2, 132, 199, 0.4)' : 'none',
                    }}
                  >
                    📅 Par Mois
                  </button>
                </div>
              </div>

              {/* BOUTONS PRÉSÉLECTION RAPIDE */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                {simPeriod === 'semaine' ? (
                  [500, 800, 1200, 1600, 2000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setWeeklyTurnover(val);
                        setMonthlyTurnover(val * 4);
                      }}
                      className={`nord-sim-preset-btn ${weeklyTurnover === val ? 'active' : ''}`}
                    >
                      {val.toLocaleString('fr-FR')} € / sem
                    </button>
                  ))
                ) : (
                  [2000, 3200, 4800, 6400, 8000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setMonthlyTurnover(val);
                        setWeeklyTurnover(Math.round(val / 4));
                      }}
                      className={`nord-sim-preset-btn ${monthlyTurnover === val ? 'active' : ''}`}
                    >
                      {val.toLocaleString('fr-FR')} € / mois
                    </button>
                  ))
                )}
              </div>

              {simPeriod === 'semaine' ? (
                <div className="dd-slider-box" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '0', marginBottom: '8px' }}>
                    <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#E5E7EB', fontWeight: 600 }}>Chiffre d'Affaires Semaine (Uber + Bolt) :</span>
                    <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>{weeklyTurnover.toLocaleString('fr-FR')} € / sem</span>
                  </div>

                  <input
                    type="range"
                    min="300"
                    max="2500"
                    step="50"
                    value={weeklyTurnover}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setWeeklyTurnover(val);
                      setMonthlyTurnover(val * 4);
                    }}
                    className="dd-range-input"
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#6B7280', fontFamily: 'monospace', marginTop: '4px' }}>
                    <span>300 €</span>
                    <span>800 €</span>
                    <span>1 200 €</span>
                    <span>1 800 €</span>
                    <span>2 500 €</span>
                  </div>
                </div>
              ) : (
                <div className="dd-slider-box" style={{ padding: isMobile ? '14px 12px' : '20px' }}>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '4px' : '0', marginBottom: '8px' }}>
                    <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#E5E7EB', fontWeight: 600 }}>Chiffre d'Affaires Mois (Uber + Bolt) :</span>
                    <span style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 900, color: '#38BDF8', fontFamily: 'monospace' }}>{monthlyTurnover.toLocaleString('fr-FR')} € / mois</span>
                  </div>

                  <input
                    type="range"
                    min="1200"
                    max="10000"
                    step="200"
                    value={monthlyTurnover}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setMonthlyTurnover(val);
                      setWeeklyTurnover(Math.round(val / 4));
                    }}
                    className="dd-range-input"
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#6B7280', fontFamily: 'monospace', marginTop: '4px' }}>
                    <span>1 200 €</span>
                    <span>3 000 €</span>
                    <span>5 000 €</span>
                    <span>7 500 €</span>
                    <span>10 000 €</span>
                  </div>
                </div>
              )}

              {/* Results Comparison Grid */}
              <div className="dd-sim-grid" style={{ gap: isMobile ? '12px' : '20px', marginTop: isMobile ? '14px' : '24px' }}>
                <div className="dd-sim-box-red" style={{ padding: isMobile ? '16px 12px' : '22px 20px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#FCA5A5' }}>Statut Auto-Entrepreneur</span>
                  <div className="dd-sim-val" style={{ color: '#EF4444', fontSize: isMobile ? '24px' : '32px' }}>
                    {simPeriod === 'semaine' ? `${autoNetWeek.toLocaleString('fr-FR')} €` : `${autoNetMonth.toLocaleString('fr-FR')} €`}
                  </div>
                  <p style={{ fontSize: '10.5px', color: '#9CA3AF', margin: '4px 0 0' }}>Après URSSAF (~25%) & charges non déductibles.</p>
                </div>

                <div className="dd-sim-box-green" style={{ padding: isMobile ? '16px 12px' : '22px 20px' }}>
                  <span style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: '#38BDF8', color: '#000', fontSize: '9.5px', fontWeight: 900, padding: '2px 10px', borderRadius: '9999px', textTransform: 'uppercase' }}>❄️ Flotte Nordrive</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#6EE7B7' }}>Net dans votre poche</span>
                  <div className="dd-sim-val" style={{ color: '#10B981', fontSize: isMobile ? '24px' : '32px' }}>
                    {simPeriod === 'semaine' ? `${fleetNetWeek.toLocaleString('fr-FR')} €` : `${fleetNetMonth.toLocaleString('fr-FR')} €`}
                  </div>
                  <p style={{ fontSize: '10.5px', color: '#A7F3D0', fontWeight: 600, margin: '4px 0 0' }}>
                    {simPeriod === 'semaine' ? 'Forfait 50€/sem • CDI • Viré chaque lundi' : 'Forfait 200€/mois • CDI • Viré chaque lundi'}
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'center', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: isMobile ? '12px 10px' : '14px', borderRadius: '12px', fontSize: isMobile ? '13px' : '14.5px', color: '#E0F2FE', marginTop: isMobile ? '14px' : '20px' }}>
                ⚡ En choisissant Nordrive, vous gagnez :{' '}
                <strong style={{ color: '#34D399', fontFamily: 'monospace', fontSize: isMobile ? '15px' : '17px' }}>
                  {simPeriod === 'semaine'
                    ? `+${gainExtraWeek.toLocaleString('fr-FR')} € / sem (+${(gainExtraWeek * 4).toLocaleString('fr-FR')} € / mois)`
                    : `+${gainExtraMonth.toLocaleString('fr-FR')} € / mois (+${Math.round(gainExtraMonth / 4).toLocaleString('fr-FR')} € / sem)`}
                </strong>{' '}
                de plus dans votre poche !
              </div>

            </div>
          </section>
        )}

        {currentPath === '/parrainage' && (
          <section id="parrainage" className="dd-container" style={{ padding: isMobile ? '180px 20px 60px' : '120px 20px 60px' }}>
            <div style={{ marginBottom: '30px', textAlign: 'left' }}>
              <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ← Retour à l'accueil
              </a>
            </div>
            <div className={`reveal-zoom ${isSubpage ? 'is-revealed' : ''}`} style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(16, 185, 129, 0.15) 100%)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: '24px', padding: isMobile ? '20px 16px' : '36px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: isMobile ? '20px' : '32px', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F59E0B', color: '#000', fontSize: '11px', fontWeight: 900, padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase', marginBottom: '12px' }}>
                <Gift size={14} /> 🎁 Programme Ambassadeur Nordrive
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#FFF', marginBottom: '8px' }}>
                Parrainez un confrère VTC et touchez <span style={{ color: '#F59E0B' }}>jusqu'à 200€</span>
              </h2>
              <p style={{ fontSize: '14px', color: '#D1D5DB', lineHeight: '1.6', marginBottom: '16px' }}>
                Recommandez Nordrive à vos confrères et collègues chauffeurs. Pour chaque chauffeur qui rejoint la flotte et effectue sa 1ère semaine de course, vous recevez une prime allant **jusqu'à 200€** versée directement sur votre compte.
              </p>
              <div style={{ background: 'rgba(2, 10, 26, 0.6)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '12px', padding: '14px', fontSize: '12.5px', color: '#9CA3AF', lineHeight: '1.5' }}>
                💡 <strong>Comment ça marche ?</strong><br />
                Remplissez le formulaire de parrainage ci-contre. Vos informations et celles de votre ami seront enregistrées. Dès que son rattachement est validé, vous touchez jusqu'à 200 euros !
              </div>
            </div>

            <div>
              {!referralSubmitted ? (
                <form onSubmit={handleReferralSubmit} style={{ display: 'grid', gap: '14px', background: 'linear-gradient(180deg, rgba(18, 28, 40, 0.95) 0%, rgba(11, 17, 25, 0.98) 100%)', border: '1px solid rgba(229, 193, 88, 0.3)', borderRadius: '20px', padding: isMobile ? '20px 16px' : '26px', width: '100%', boxShadow: '0 16px 45px rgba(0,0,0,0.7)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 193, 88, 0.2)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#E5C158', letterSpacing: '0.5px' }}>👤 VOUS (LE PARRAIN)</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Pour recevoir vos 200€</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Votre Nom complet *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Jean Dupont"
                        value={referralForm.referrerName}
                        onChange={(e) => setReferralForm({ ...referralForm, referrerName: e.target.value })}
                        className="dd-input"
                        style={{ padding: '11px', background: 'rgba(11, 17, 25, 0.8)' }}
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Votre Téléphone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 06 12 34 56 78"
                        value={referralForm.referrerPhone}
                        onChange={(e) => setReferralForm({ ...referralForm, referrerPhone: e.target.value })}
                        className="dd-input"
                        style={{ padding: '11px', background: 'rgba(11, 17, 25, 0.8)' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '10px', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.5px' }}>🤝 VOTRE AMI (LE FILLEUL)</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Chauffeur à rattacher</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Nom complet de votre ami *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Marie Martin"
                        value={referralForm.friendFirstName}
                        onChange={(e) => setReferralForm({ ...referralForm, friendFirstName: e.target.value })}
                        className="dd-input"
                        style={{ padding: '11px', background: 'rgba(11, 17, 25, 0.8)' }}
                      />
                    </div>
                    <div className="dd-form-group" style={{ marginBottom: 0 }}>
                      <label className="dd-form-label" style={{ fontSize: '11px' }}>Son Téléphone WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 07 12 34 56 78"
                        value={referralForm.friendPhone}
                        onChange={(e) => setReferralForm({ ...referralForm, friendPhone: e.target.value })}
                        className="dd-input"
                        style={{ padding: '11px', background: 'rgba(11, 17, 25, 0.8)' }}
                      />
                    </div>
                  </div>

                  <button type="submit" className="dd-btn dd-btn-gold" style={{ width: '100%', marginTop: '8px', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 800 }}>
                    <span>🎁 Enregistrer le Parrainage (Prime 200€) →</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent("Salut frérot ! Je te recommande Nordrive pour ton rattachement VTC : 50€/semaine si tu roules, 0€ si tu es en vacances, véhicules +12 ans acceptés et macaron en moins d'1 heure ! Inscris-toi ici : https://nordrive-flotte.com/")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(37, 211, 102, 0.12)',
                      border: '1px solid rgba(37, 211, 102, 0.35)',
                      color: '#25D366',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    <span>📲 Ou partager directement l'invitation sur WhatsApp</span>
                  </a>
                </form>
              ) : (
                <div style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '32px 24px', borderRadius: '18px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                  <div style={{ color: '#34D399', fontSize: '22px', fontWeight: 900, marginBottom: '10px' }}>✓ Parrainage Transmis !</div>
                  <p style={{ fontSize: '13.5px', color: '#A7F3D0', lineHeight: 1.6 }}>
                    Félicitations, la demande de parrainage pour votre ami **{referralForm.friendFirstName}** a bien été transmise à notre support Nordrive.
                  </p>
                  <div style={{ width: '60px', height: '1px', background: 'rgba(52, 211, 153, 0.25)', margin: '16px auto' }} />
                  <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
                    Dès que votre filleul effectue son rattachement et valide sa première semaine de courses, votre prime allant **jusqu'à 200€** est débloquée immédiatement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {currentPath === '/qui-sommes-nous' && (
          <>
            <section id="qui-sommes-nous" className="dd-container" style={{ padding: isMobile ? '180px 20px 60px' : '120px 20px 60px' }}>
              <div style={{ marginBottom: '30px', textAlign: 'left', maxWidth: '850px', margin: '0 auto 20px' }}>
                <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ← Retour à l'accueil
                </a>
              </div>
              <div style={{ maxWidth: '850px', margin: '0 auto', textAlign: 'center' }}>
                <div className={`reveal-on-scroll ${isSubpage ? 'is-revealed' : ''}`}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#7DD3FC', textTransform: 'uppercase', letterSpacing: '1px' }}>🏔️ Voir au Sommet</span>
                  <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFF', margin: '8px 0 16px' }}>Qui sommes-nous ?</h2>
                  <p style={{ fontSize: '15px', color: '#D1D5DB', lineHeight: '1.8', marginBottom: '24px' }}>
                    <strong>Nordrive</strong> est née d'une ambition forte : offrir aux chauffeurs VTC la solidité, la sérénité et la transparence à la hauteur des plus grands sommets. Nous plaçons la sécurité sociale et la réactivité au cœur de notre flotte.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', textAlign: 'left' }}>
                  <div className={`dd-card reveal-left reveal-delay-1 ${isSubpage ? 'is-revealed' : ''}`}>
                    <Users size={24} style={{ color: '#38BDF8', marginBottom: '8px' }} />
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>Proximité & Support Dédié</h4>
                    <p style={{ fontSize: '12.5px', color: '#9CA3AF' }}>Une équipe disponible sur WhatsApp 7j/7 pour vous assister à tout moment dans vos démarches et l'accès aux plateformes.</p>
                  </div>

                  <div className={`dd-card reveal-right reveal-delay-2 ${isSubpage ? 'is-revealed' : ''}`}>
                    <Award size={24} style={{ color: '#10B981', marginBottom: '8px' }} />
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>Conformité & Sécurité Maximum</h4>
                    <p style={{ fontSize: '12.5px', color: '#9CA3AF' }}>Rattachement agréé par le ministère des Transports, macaron provisoire délivré en 1h et contrat CDI officiel.</p>
                  </div>
                </div>
              </div>
            </section>

            <section id="support-humain" className="nord-founder-section dd-container">
              <div className="nord-founder-card reveal-zoom">
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '30px', alignItems: 'center' }}>
                  
                  <div className="nord-founder-avatars" style={{ flexShrink: 0 }}>
                    <div className="nord-founder-avatar">A</div>
                    <div className="nord-founder-avatar" style={{ marginLeft: '-24px', background: 'linear-gradient(135deg, #10B981 0%, #38BDF8 100%)' }}>R</div>
                  </div>

                  <div style={{ flexGrow: 1, textAlign: isMobile ? 'center' : 'left' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', color: '#C4B5FD', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px', textTransform: 'uppercase', marginBottom: '12px' }}>
                      👥 Vos interlocuteurs directs
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#FFF', marginBottom: '10px' }}>Un accompagnement humain avec l'équipe Nordrive</h3>
                    <p style={{ fontSize: '14.5px', color: '#D1D5DB', lineHeight: '1.7', marginBottom: '16px' }}>
                      "Nous avons fondé <strong>Nordrive</strong> avec une idée simple : en finir avec les intermédiaires anonymes et les flottes fantômes. Quand vous rejoignez Nordrive, vous travaillez directement avec nous. Nous gérons votre dossier de A à Z, nous vous conseillons sur l'optimisation de vos revenus et nous répondons à toutes vos questions sous 10 minutes sur WhatsApp."
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                      <a href="https://wa.me/33743767400?text=Bonjour%20l%27%C3%A9quipe%20Nordrive%2C%20je%20souhaite%20des%20infos" target="_blank" rel="noopener noreferrer" className="dd-btn dd-btn-whatsapp" style={{ padding: '10px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 700 }}>
                        <MessageSquare size={16} />
                        <span>Discuter en direct avec nous</span>
                      </a>
                    </div>
                  </div>

                </div>
              </div>
            </section>
          </>
        )}

        {currentPath === '/faq' && (
          <section id="faq" className="dd-container" style={{ maxWidth: '800px', padding: isMobile ? '180px 20px 50px' : '120px 20px 50px' }}>
            <div style={{ marginBottom: '30px', textAlign: 'left' }}>
              <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ← Retour à l'accueil
              </a>
            </div>
            <div className={`reveal-on-scroll ${isSubpage ? 'is-revealed' : ''}`} style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#7DD3FC', textTransform: 'uppercase', letterSpacing: '1px' }}>❄️ Votre Sérénité</span>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#FFF' }}>FAQ complète Nordrive</h2>
            </div>

            {faqList.map((item, idx) => (
              <div key={idx} className={`nord-accordion-item reveal-on-scroll reveal-delay-${(idx % 3) + 1} ${isSubpage ? 'is-revealed' : ''}`}>
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="nord-accordion-btn">
                  <span>{item.q}</span>
                  <span className={`nord-accordion-plus ${openFaq === idx ? 'open' : ''}`}>+</span>
                </button>
                {openFaq === idx && (
                  <div style={{ padding: '0 24px 20px', color: '#94A3B8', fontSize: '13.5px', lineHeight: '1.6', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {currentPath === '/contact' && (
          <section id="contact" className="dd-container" style={{ padding: isMobile ? '180px 20px 80px' : '120px 20px 80px' }}>
            <div style={{ marginBottom: '30px', textAlign: 'left', maxWidth: '900px', margin: '0 auto 20px' }}>
              <a href="/" onClick={(e) => navigateTo(e, '/')} style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ← Retour à l'accueil
              </a>
            </div>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className={`reveal-on-scroll ${isSubpage ? 'is-revealed' : ''}`} style={{ textAlign: 'center', marginBottom: '32px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px' }}>Support & Contact</span>
                <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#FFF', margin: '6px 0' }}>Une question ? Contactez l'équipe Nordrive</h2>
                <p style={{ fontSize: '13.5px', color: '#9CA3AF' }}>Nos conseillers vous répondent sous 2 heures ouvrées.</p>
              </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              
              {/* Direct Info Box */}
              <div className={`dd-card reveal-left reveal-delay-1 ${isSubpage ? 'is-revealed' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '12px' }}>Nos Coordonnées</h4>
                  <a href="tel:0743767400" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#D1D5DB', marginBottom: '10px', textDecoration: 'none' }}>
                    <Phone size={16} style={{ color: '#10B981' }} />
                    <span>07 43 76 74 00 (7j/7)</span>
                  </a>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#D1D5DB', marginBottom: '10px' }}>
                    <Mail size={16} style={{ color: '#8B5CF6' }} />
                    <span>nordrivevtc@gmail.com</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#D1D5DB' }}>
                    <MapPin size={16} style={{ color: '#F59E0B' }} />
                    <span>Paris & Île-de-France</span>
                  </div>
                </div>

                <a
                  href="https://wa.me/33743767400?text=Bonjour%20Nordrive%2C%20j%27ai%20une%20question"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dd-btn dd-btn-whatsapp"
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  <MessageSquare size={16} />
                  <span>Démarrer un chat WhatsApp</span>
                </a>
              </div>

              {/* Direct Message Form */}
              <div className={`dd-card reveal-right reveal-delay-2 ${isSubpage ? 'is-revealed' : ''}`}>
                {!contactSubmitted ? (
                  <form onSubmit={handleContactSubmit}>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#FFF', marginBottom: '12px' }}>Envoyer un message</h4>
                    
                    <div className="dd-form-group">
                      <label className="dd-form-label">Nom complet</label>
                      <input
                        type="text"
                        required
                        placeholder="Jean Dupont"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="dd-input"
                      />
                    </div>

                    <div className="dd-form-group">
                      <label className="dd-form-label">Téléphone</label>
                      <input
                        type="tel"
                        required
                        placeholder="06 12 34 56 79"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="dd-input"
                      />
                    </div>

                    <div className="dd-form-group">
                      <label className="dd-form-label">Message</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Bonjour, je souhaiterais des précisions sur..."
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="dd-input"
                        style={{ resize: 'none' }}
                      ></textarea>
                    </div>

                    <button type="submit" className="dd-btn dd-btn-primary" style={{ width: '100%' }}>
                      <Send size={15} />
                      <span>Envoyer mon message</span>
                    </button>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ color: '#10B981', fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>✓ Message Envoyé !</div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF' }}>Merci. Un conseiller Nordrive vous recontacte rapidement.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
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
              background: 'linear-gradient(135deg, #0284C7 0%, #0D9488 100%)',
              color: '#FFF',
              fontSize: '14.5px',
              fontWeight: 800,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 12px 30px rgba(2, 132, 199, 0.45), 0 0 15px rgba(56, 189, 248, 0.3)',
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
