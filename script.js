// === Spotify Authentication & PKCE Setup ===
const CLIENT_ID = '85528d9ddff344ebba781615c218d339';
const REDIRECT_URI = 'https://balura95.github.io'; // Must match exactly in your Spotify Developer Dashboard
const SCOPES = 'user-read-playback-state user-modify-playback-state streaming user-read-email user-read-private';
const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Attach event listener for the login button after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('spotify-login');
    if (loginButton) {
        loginButton.addEventListener('click', authenticateSpotify);
    }
});

// Generate a code verifier (random string) for PKCE
function generateCodeVerifier() {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return base64URLEncode(randomBytes);
}

// Helper: Base64 URL-encode a buffer
function base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Generate the code challenge from the code verifier
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

// Globaler Status für den QR-Scanner
window.qrScannerActive = false;
window.qrScanner = null;

function startQrScanner() {
    // Falls der Scanner bereits aktiv ist, nichts tun.
    if (window.qrScannerActive) return;

    // Initialisiere den Scanner im Element mit der ID "qr-reader"
    window.qrScanner = new Html5Qrcode("qr-reader");
    window.qrScannerActive = true;
    const qrConfig = { fps: 10, qrbox: 250 };

    window.qrScanner.start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText, decodedResult) => {
            console.log("QR Code Scanned:", decodedText);
            // Entferne Leerzeichen
            const cleanedText = decodedText.replace(/\s/g, '');
            // Extrahiere die Track-ID aus der URL (mit optionalem intl-Teil)
            const match = cleanedText.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                const trackUri = `spotify:track:${match[1]}`;
                window.lastScannedTrackUri = trackUri;
                alert("Track loaded: " + trackUri);
                // Starte den Track
                window.playTrack(trackUri);
                // Stoppe den Scanner, um Energie zu sparen
                window.qrScanner.stop().then(() => {
                    console.log("QR scanner stopped.");
                    window.qrScannerActive = false;
                }).catch(err => {
                    console.error("Error stopping QR scanner:", err);
                });
            } else {
                console.error("Invalid QR Code scanned: " + cleanedText);
                alert("Invalid Spotify QR Code. Please scan a valid track URL.");
            }
        }
    ).catch(err => {
        console.error("QR code scanning failed:", err);
    });
}

// Beispiel für das erneute Starten des Scanners (z.B. per Swipe oder Button):
function restartQrScanner() {
    // Falls der Scanner gerade nicht aktiv ist, starte ihn erneut.
    if (!window.qrScannerActive) {
        startQrScanner();
    }
}
// Start the Spotify authentication process
async function authenticateSpotify() {
    sessionStorage.clear();
    localStorage.clear();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    sessionStorage.setItem('code_verifier', codeVerifier);
    
    const authUrl = `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
    window.location.href = authUrl;
}

// === Token Exchange & UI Toggling ===
function toggleUIAfterLogin() {
    document.getElementById('login-area').style.display = 'none';
    document.getElementById('player-area').style.display = 'block';
    startQrScanner();  // Startet den Scanner beim Anzeigen des Player-Bereichs.
}

async function getToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
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
            body
        });
        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            window.history.replaceState({}, document.title, '/');
            toggleUIAfterLogin();
        } else {
            console.error('Invalid token response:', data);
        }
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}

async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return;
    
    const body = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
    });
    
    try {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        const data = await response.json();
        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
    }
}

window.onload = () => {
    getToken(); // Token holen und UI aktualisieren
    if (localStorage.getItem('access_token')) {
        toggleUIAfterLogin();
    }

};

setInterval(refreshToken, 30 * 60 * 1000);

// === Spotify Web Playback SDK Integration ===
window.deviceId = null;
window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    const player = new Spotify.Player({
        name: 'Web Player',
        getOAuthToken: cb => { cb(token); }
    });
    
    player.addListener('ready', ({ device_id }) => {
        window.deviceId = device_id;
    });
    player.connect();

    window.playTrack = async function(trackUri) {
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.error("No access token found.");
            alert("Not logged in. Please authenticate with Spotify by refreshing this page.");
            return;
        }
        
        // Warte bis zu 10 Sekunden auf die deviceId
        let waitTime = 0;
        while (!window.deviceId && waitTime < 10000) {
            await new Promise(resolve => setTimeout(resolve, 200));
            waitTime += 200;
        }
        if (!window.deviceId) {
            alert("Spotify player is not ready yet. Please wait a moment and try again.");
            return;
        }
        
        // Jetzt starten wir die Wiedergabe
        try {
            let response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [trackUri] }),
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                }
            });
            if (response.status === 204) {
                console.log("Track started successfully.");
            } else if (response.status === 401) {
                console.error("Access token expired or invalid.");
                alert("Session expired. Logging out...");
                logout();
            } else {
                const data = await response.json();
                console.error("Spotify API error:", data);
            }
        } catch (error) {
            console.error("Error sending play request:", error);
        }
    };
    
};

function logout() {
    localStorage.clear();
    sessionStorage.clear();
    // Optionally, you could redirect the user to the login screen:
    location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('start-playback');
    if (playButton) {
        playButton.addEventListener('click', () => {
            if (window.lastScannedTrackUri) {
                window.playTrack(window.lastScannedTrackUri);
            } else {
                alert("No track loaded. Please scan a QR code first.");
            }
        });
    }
});

function detectSwipe(element, callback) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    element.addEventListener('touchstart', function(event) {
      touchStartX = event.changedTouches[0].screenX;
    }, false);
  
    element.addEventListener('touchend', function(event) {
      touchEndX = event.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;
      if (swipeDistance > 50) { // Swiped left
        callback('left');
      } else if (swipeDistance < -50) { // Swiped right (falls benötigt)
        callback('right');
      }
    }, false);
    
    // Optionale Desktop-Erkennung (Maus):
    let mouseStartX = 0;
    let mouseEndX = 0;
    let isMouseDown = false;
    
    element.addEventListener('mousedown', function(event) {
      isMouseDown = true;
      mouseStartX = event.screenX;
    }, false);
    
    element.addEventListener('mouseup', function(event) {
      if (!isMouseDown) return;
      mouseEndX = event.screenX;
      const swipeDistance = mouseStartX - mouseEndX;
      if (swipeDistance > 50) {
        callback('left');
      } else if (swipeDistance < -50) {
        callback('right');
      }
      isMouseDown = false;
    }, false);
  }
  

  document.addEventListener('DOMContentLoaded', function() {
    // Wir registrieren die Swipe-Erkennung an document.body (funktioniert oft zuverlässiger)
    detectSwipe(document.body, function(direction) {
      console.log("Swipe detected, direction:", direction);
      // Falls es sich um einen linken Swipe handelt:
      if (direction === 'left') {
        const instruction = document.getElementById('swipe-instruction');
        if (instruction && instruction.style.display !== 'none') {
          instruction.style.display = 'none';
          console.log("Instruction hidden on first swipe.");
        } else {
          // Hier kannst du weitere Aktionen definieren, wenn du möchtest.
          console.log("Subsequent swipe left detected.");
        }
      }
    });
  });
  
