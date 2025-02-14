// Bereits vorhandene automatische Token-Erneuerung (alle 30 Minuten)
setInterval(refreshToken, 30 * 60 * 1000);

// --- Neuer Code: Token sofort erneuern, wenn der Tab wieder aktiv wird ---

async function refreshToken() {
    // Hole den gespeicherten Refresh-Token aus dem localStorage
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.warn('Kein Refresh-Token gefunden. Der Benutzer muss sich neu anmelden.');
      M.toast({html: "Bitte erneut anmelden", classes: "rounded", displayLength: 1000});
      return;
    }
  
    // Erstelle den Request-Body gemäß den Spotify-Anforderungen
    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });
  
    try {
      const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString() // URL-encodierter String
      });
  
      if (!response.ok) {
        throw new Error(`HTTP-Fehler: ${response.status}`);
      }
  
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        console.log('Access Token wurde erfolgreich erneuert.');
      } else {
        console.error('Keine Access Token in der Antwort erhalten:', data);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Tokens:', error);
    }
  }
  

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

document.addEventListener('deviceready', function() {
  console.log('Device ready: InAppBrowser is available');
  
  document.addEventListener('click', function(event) {
    // Ermittle das nächste <a>-Element, falls ein inneres Element geklickt wurde.
    var anchor = event.target.closest('a');
    
    if (anchor && anchor.href && anchor.href.startsWith('http')) {
      event.preventDefault();
      console.log('Intercepted link:', anchor.href);
      
      // Verwende window.open, das vom InAppBrowser-Plugin überschrieben wurde.
      window.open(anchor.href, '_self', 'location=no');
    }
  }, false);
});

function handleOpenURL(url) {
  // Oft ist ein kleiner Delay sinnvoll, um sicherzustellen, dass die App initialisiert ist.
  setTimeout(function() {
    console.log("handleOpenURL aufgerufen mit URL:", url);

    // Extrahiere den "code"-Parameter aus der URL.
    var code = extractCodeFromUrl(url);
    if (code) {
      // Hier kannst du den Code verarbeiten – z.B. den Token-Austausch starten.
      processSpotifyCallback(code);
    } else {
      console.warn("Kein Code in der URL gefunden.");
    }
  }, 0);
}

// Hilfsfunktion: Extrahiert den "code" Parameter aus der URL.
function extractCodeFromUrl(url) {
  try {
    var urlObj = new URL(url);
    return urlObj.searchParams.get("code");
  } catch (e) {
    console.error("Fehler beim Parsen der URL:", e);
    return null;
  }
}

// Beispiel: Verarbeite den Auth-Code und starte den Token-Austausch.
// Passe diese Funktion an deine existierende Logik an.
function processSpotifyCallback(code) {
  console.log("Spotify-Callback-Code:", code);
  // Hier kannst du z.B. deine getToken()-Funktion aufrufen oder den weiteren Authentifizierungsfluss einleiten.
  // Beispiel:
  // getToken(code);
}