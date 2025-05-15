// === Spotify Authentication & PKCE Setup ===
const CLIENT_ID = '2d5437645a254b48ae5f836f8f106543';
const REDIRECT_URI = 'https://mcvanst.github.io/jgajulian/'; // MUSS exakt mit deiner Redirect URI im Spotify Developer Dashboard übereinstimmen
const SCOPES = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Sobald das DOM geladen ist, wird der Login-Button belegt
document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('spotify-login');
  if (loginButton) {
    loginButton.addEventListener('click', authenticateSpotify);
  }
  
  // Falls in der URL bereits ein Authorization-Code vorhanden ist (Callback von Spotify)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    getToken(code);
  }
});

// Erzeuge einen Code-Verifier (zufälliger String) für PKCE
function generateCodeVerifier() {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return base64URLEncode(randomBytes);
}

// Hilfsfunktion: Base64 URL-encode für einen Buffer
function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Erzeuge die Code Challenge aus dem Code-Verifier
async function generateCodeChallenge(verifier) {
  if (!verifier) {
    console.error('Error: Code verifier is missing.');
    return;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  try {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(digest);
  } catch (error) {
    console.error('Error generating code challenge:', error);
  }
}

// Starte den Spotify-Authentifizierungsprozess
async function authenticateSpotify() {
  // Lösche eventuelle alte Daten
  sessionStorage.clear();
  localStorage.clear();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  sessionStorage.setItem('code_verifier', codeVerifier);

  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;
    
  window.location.href = authUrl;
}

// === Token Exchange ===
// Diese Funktion tauscht den Authorization-Code gegen Tokens aus.
// Bei Erfolg werden die Tokens gespeichert und der Benutzer wird zur menu.html weitergeleitet.
async function getToken(code) {
  const codeVerifier = sessionStorage.getItem('code_verifier');
  if (!code || !codeVerifier) return;
  
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body // alternativ: body.toString()
    });
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      // Entferne die Query-Parameter für eine saubere URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Weiterleitung zur menu.html statt zur player.html
      window.location.href = 'menu.html';
    } else {
      console.error('Invalid token response:', data);
    }
  } catch (error) {
    console.error('Error fetching token:', error);
  }
}

// Refresh token (falls benötigt)
async function refreshToken() {
  const refreshTokenVal = localStorage.getItem('refresh_token');
  if (!refreshTokenVal) return;
  
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshTokenVal
  });
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body // alternativ: body.toString()
    });
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      console.log('Access Token wurde erfolgreich erneuert.');
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
}

// Beim Seitenaufruf: Versuche, den Code gegen einen Token auszutauschen.
// Falls bereits ein Access Token vorhanden ist, leite sofort zur menu.html weiter.

// Funktion zur Überprüfung, ob der gespeicherte Token noch gültig ist




// Alle 30 Minuten den Access Token erneuern
setInterval(refreshToken, 30 * 60 * 1000);

function setViewportHeight() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
setViewportHeight();
window.addEventListener('resize', setViewportHeight);
