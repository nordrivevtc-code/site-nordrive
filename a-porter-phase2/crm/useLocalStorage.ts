import { useState, useEffect } from 'react';

/**
 * Hook de persistance localStorage pour Nordrive CRM.
 * Sauvegarde automatiquement à chaque changement d'état.
 * Charge depuis localStorage au démarrage.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialiser depuis localStorage si disponible
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as T;
      }
      return initialValue;
    } catch (error) {
      console.warn(`[Nordrive] Erreur lecture localStorage "${key}":`, error);
      return initialValue;
    }
  });

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`[Nordrive] Erreur écriture localStorage "${key}":`, error);
    }
  }, [key, storedValue]);

  // Wrapper setValue pour supporter les mises à jour fonctionnelles
  const setValue = (value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value;
      return next;
    });
  };

  return [storedValue, setValue];
}

/**
 * Efface toutes les données Nordrive du localStorage.
 * Utile pour reset complet (debug).
 */
export function clearNordriveStorage(): void {
  const keys = [
    'nordrive_drivers',
    'nordrive_payroll',
    'nordrive_payroll_weeks',
    'nordrive_settings',
    'nordrive_vehicles',
    'nordrive_fines',
    'nordrive_contracts',
    'nordrive_maintenances',
    'nordrive_api_settings'
  ];
  keys.forEach(k => window.localStorage.removeItem(k));
  console.info('[Nordrive] Données localStorage effacées avec succès.');
}
