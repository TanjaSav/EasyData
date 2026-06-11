document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const serverSelect = document.getElementById('serverSelect');

  // Load saved server URL
  chrome.storage.local.get(['easyDataServerUrl'], (result) => {
    const savedUrl = result.easyDataServerUrl || 'https://easydata.is';
    serverSelect.value = savedUrl;
    checkServerStatus(savedUrl);
  });

  serverSelect.addEventListener('change', (e) => {
    const selectedUrl = e.target.value;
    chrome.storage.local.set({ easyDataServerUrl: selectedUrl }, () => {
      checkServerStatus(selectedUrl);
    });
  });

  function checkServerStatus(baseUrl) {
    statusDot.className = 'dot';
    statusText.innerText = 'Checking...';

    fetch(`${baseUrl}/health`)
      .then(res => {
        if (res.ok) {
          statusDot.className = 'dot online';
          statusText.innerText = 'Online';
        } else {
          statusDot.className = 'dot';
          statusText.innerText = 'Offline';
        }
      })
      .catch(() => {
        statusDot.className = 'dot';
        statusText.innerText = 'Offline';
      });
  }
});
