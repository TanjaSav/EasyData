document.addEventListener('DOMContentLoaded', () => {
  const geminiBtn = document.getElementById('geminiBtn');
  const claudeBtn = document.getElementById('claudeBtn');
  const actionLink = document.getElementById('actionLink');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Load the active platform preference
  chrome.storage.local.get(['activePlatform'], (result) => {
    const active = result.activePlatform || 'gemini';
    setPlatform(active);
  });

  // Check the local EasyData server status
  checkServerStatus();

  // Toggle to Gemini
  geminiBtn.addEventListener('click', () => {
    setPlatform('gemini');
  });

  // Toggle to Claude
  claudeBtn.addEventListener('click', () => {
    setPlatform('claude');
  });

  function setPlatform(platform) {
    if (platform === 'gemini') {
      geminiBtn.classList.add('active');
      claudeBtn.classList.remove('active');
      actionLink.innerText = 'Open Gemini Workspace';
      actionLink.href = 'https://gemini.google.com';
    } else {
      claudeBtn.classList.add('active');
      geminiBtn.classList.remove('active');
      actionLink.innerText = 'Open Claude Workspace';
      actionLink.href = 'https://claude.ai';
    }
    
    // Persist choice in local storage
    chrome.storage.local.set({ activePlatform: platform });
  }

  function checkServerStatus() {
    fetch('http://localhost:3000/health')
      .then(res => {
        if (res.ok) {
          statusDot.className = 'dot online';
          statusText.innerText = 'Connected';
        } else {
          statusDot.className = 'dot';
          statusText.innerText = 'Offline';
        }
      })
      .catch(() => {
        // Fallback to testing the production endpoint
        fetch('https://easydata.is/mcp', { method: 'HEAD' })
          .then(() => {
            statusDot.className = 'dot online';
            statusText.innerText = 'Cloud Online';
          })
          .catch(() => {
            statusDot.className = 'dot';
            statusText.innerText = 'Offline';
          });
      });
  }
});
