// --- Player Page Initialization ---
window.onload = () => {
    if (!localStorage.getItem('access_token')) {
      window.location.href = 'index.html';
      return;
    }
    toggleUIAfterLogin();
  };
  
  // Function to show the player area and start the QR scanner
  function toggleUIAfterLogin() {
    document.getElementById('player-area').style.display = 'block';
    startQrScanner();
  }
  
  // --- QR-Code Scanner Setup ---
  window.qrScannerActive = false;
  window.qrScanner = null;
  
  function startQrScanner() {
    if (window.qrScannerActive) return; // Prevent multiple scanners
  
    window.qrScanner = new Html5Qrcode("qr-reader");
    window.qrScannerActive = true;
    document.getElementById('qr-reader').style.display = 'block';
    document.getElementById('start-playback').style.display = 'none'; 
    document.getElementById('scan-next').style.display = 'none'; 
  
    const qrConfig = { fps: 10, qrbox: 250 };
  
    window.qrScanner.start(
      { facingMode: "environment" },
      qrConfig,
      (decodedText, decodedResult) => {
        console.log("QR Code Scanned:", decodedText);
        const cleanedText = decodedText.replace(/\s/g, '');
        const match = cleanedText.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          const trackUri = `spotify:track:${match[1]}`;
          window.lastScannedTrackUri = trackUri;
          alert("Track loaded: " + trackUri);
          window.playTrack(trackUri);
          stopQrScanner(); // Stop scanner after scanning
        } else {
          alert("Invalid Spotify QR Code. Try again.");
        }
      }
    ).catch(err => console.error("QR code scanning failed:", err));
  }
  
  // Stops the scanner and shows "Scan Next Song" button
  function stopQrScanner() {
    if (window.qrScanner) {
      window.qrScanner.stop().then(() => {
        window.qrScannerActive = false;
        document.getElementById('qr-reader').style.display = 'none';
        document.getElementById('scan-next').style.display = 'block'; 
      }).catch(err => console.error("Error stopping QR scanner:", err));
    }
  }
  
  // --- Spotify Web Playback SDK Integration ---
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
      document.getElementById('start-playback').disabled = false;
    });
    
    player.connect();
  
    window.playTrack = async function(trackUri) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert("Session expired. Please log in again.");
        logout();
        return;
      }
      
      let waitTime = 0;
      while (!window.deviceId && waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 200));
        waitTime += 200;
      }
      if (!window.deviceId) {
        alert("Spotify player is not ready yet. Try again soon.");
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
          document.getElementById('start-playback').style.display = 'none';
          document.getElementById('scan-next').style.display = 'block'; 
        } else if (response.status === 401) {
          alert("Session expired. Logging out...");
          logout();
        } else {
          const data = await response.json();
          console.error("Spotify API error:", data);
        }
      } catch (error) {
        console.error("Error playing track:", error);
      }
    };
  };
  
  // --- Event Listeners ---
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-playback').addEventListener('click', () => {
      if (window.lastScannedTrackUri) {
        window.playTrack(window.lastScannedTrackUri);
      } else {
        alert("No track loaded. Scan a QR code first.");
      }
    });
  
    document.getElementById('scan-next').addEventListener('click', startQrScanner);
  });
  
  // --- Logout Function ---
  function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
  }
  