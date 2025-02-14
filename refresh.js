// Bereits vorhandene automatische Token-Erneuerung (alle 30 Minuten)
setInterval(refreshToken, 30 * 60 * 1000);

// --- Neuer Code: Token sofort erneuern, wenn der Tab wieder aktiv wird ---

// Wenn der Tab wieder sichtbar wird, den Access Token sofort aktualisieren
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshToken();
  }
});

// Alternativ kann auch das Fenster-Fokus-Ereignis genutzt werden:
window.addEventListener('focus', () => {
  refreshToken();
});
