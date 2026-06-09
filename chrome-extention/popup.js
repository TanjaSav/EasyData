document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  // Check the production server status
  checkServerStatus();

  function checkServerStatus() {
    fetch('https://easydata.is/health')
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
