// auth.js – Spotify Authentication & PKCE Flow

const CLIENT_ID = '85528d9ddff344ebba781615c218d339';
const REDIRECT_URI = 'https://balura95.github.io'; // After successful auth, redirect here
const SCOPES = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

// When the document is ready, attach the login button handler
document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('spotify-login');
  if (loginButton) {
    loginButton.addEventListener('click', authenticateSpotify);
  }
  
  // Check if there's an authorization code in the URL (callback)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    getToken(code);
  }
});

function generateCodeVerifier() {
  // Create a random 128-byte string
  const array = new Uint8Array(128);
  window.crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function base64URLEncode(buffer) {
  let string = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach(byte => { string += String.fromCharCode(byte); });
  return btoa(string).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}

async function authenticateSpotify() {
  // Clear any existing tokens
  sessionStorage.clear();
  localStorage.clear();
  
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store the verifier for later use
  sessionStorage.setItem('code_verifier', codeVerifier);
  
  // Build the authorization URL
  const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}` +
                  `&response_type=code` +
                  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                  `&scope=${encodeURIComponent(SCOPES)}` +
                  `&code_challenge_method=S256` +
                  `&code_challenge=${codeChallenge}`;
  
  // Redirect to Spotify's authorization page
  window.location.href = authUrl;
}

async function getToken(code) {
  const codeVerifier = sessionStorage.getItem('code_verifier');
  if (!code || !codeVerifier) return;
  
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });
  
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: body
    });
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      // Remove query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Redirect to the menu
      window.location.href = 'menu.html';
    } else {
      console.error('Token exchange error:', data);
      M.toast({html: "Fehler beim Token-Austausch", classes: "rounded", displayLength: 3000});
    }
  } catch (error) {
    console.error("Error fetching token:", error);
    M.toast({html: "Error fetching token", classes: "rounded", displayLength: 3000});
  }
}
