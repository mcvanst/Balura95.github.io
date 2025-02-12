// --- Player Page Initialization ---

window.onload = () => {
    // Check if an access token exists. If not, redirect to login page.
    if (!localStorage.getItem('access_token')) {
      window.location.href = 'index.html';
      return;
    }
    // Initialize UI for the player area
    toggleUIAfterLogin();
  };
  
  // Function to show the player area and start the QR scanner.
  function toggleUIAfterLogin() {
    const playerArea = document.getElementById('player-area');
    if (playerArea) {
      playerArea.style.display = 'block';
    }
    // Start the QR-code scanner
    startQrScanner();
  }
  
  // --- QR-Code Scanner Setup ---
  
  // Global variables for QR scanner state
  window.qrScannerActive = false;
  window.qrScanner = null;
  
  function startQrScanner() {
    // If the scanner is already active, do nothing.
    if (window.qrScannerActive) return;
  
    // Initialize the scanner on the element with id "qr-reader"
    window.qrScanner = new Html5Qrcode("qr-reader");
    window.qrScannerActive = true;
    const qrConfig = { fps: 10, qrbox: 250 };
  
    window.qrScanner.start(
      { facingMode: "environment" },
      qrConfig,
      (decodedText, decodedResult) => {
        console.log("QR Code Scanned:", decodedText);
        // Remove any spaces and extract the track ID.
        const cleanedText = decodedText.replace(/\s/g, '');
        const match = cleanedText.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          const trackUri = `spotify:track:${match[1]}`;
          window.lastScannedTrackUri = trackUri;
          alert("Track loaded: " + trackUri);
          // Auto-start playback
          window.playTrack(trackUri);
          // Stop the scanner to save energy
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
  
  // --- Spotify Web Playback SDK Integration ---
  
  // Global variable for the Spotify device ID.
  window.deviceId = null;
  
  // This function is automatically called when the Spotify SDK is ready.
  window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
  
    const player = new Spotify.Player({
      name: 'Web Player',
      getOAuthToken: cb => { cb(token); }
    });
  
    player.addListener('ready', ({ device_id }) => {
      window.deviceId = device_id;
      console.log("Spotify SDK ready. Device ID:", device_id);
      // Optionally, enable your play button here if it was disabled.
      const playButton = document.getElementById('start-playback');
      if (playButton) {
        playButton.disabled = false;
      }
    });
    
    player.connect();
  
    // Define playTrack: plays the given track URI using the active device.
    window.playTrack = async function(trackUri) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error("No access token found.");
        alert("Not logged in. Please log in with Spotify.");
        return;
      }
      
      // Wait up to 10 seconds for the deviceId to be set.
      let waitTime = 0;
      while (!window.deviceId && waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 200));
        waitTime += 200;
      }
      if (!window.deviceId) {
        alert("Spotify player is not ready yet. Please wait a moment and try again.");
        return;
      }
      
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
  
  // --- Event Listener for Play Button ---
  
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
    } else {
      console.error("Play button not found.");
    }
  });
  
  // --- Logout Function (optional) ---
  
  function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html'; // or your login page
  }
  