// src/utils/soundManager.ts

export const playSound = (type: 'correct' | 'incorrect' | 'success') => {
  // Solo ejecutar en el navegador
  if (typeof window === 'undefined') return;

  const audio = new Audio(`/sounds/${type}.mp3`);
  audio.volume = 0.6; // Volumen al 60% para no ser estridente
  audio.preload = 'auto';
  
  // Reproducir y silenciar errores si el navegador bloquea el audio
  audio.play().catch(() => {
    console.warn(`🔇 Sonido "${type}" bloqueado por políticas del navegador`);
  });
};