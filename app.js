const dialog = document.querySelector('#account-dialog');
document.querySelector('[data-account]').addEventListener('click', () => dialog.showModal());
document.querySelector('.close').addEventListener('click', () => dialog.close());
document.querySelector('[data-sign-in]').addEventListener('click', () => {
  // Replace with Clerk's sign-in redirect once its publishable key is configured.
  window.location.href = '/account/';
});
document.querySelectorAll('.select-programme').forEach((button) => button.addEventListener('click', async () => {
  const programme = button.dataset.programme;
  button.textContent = 'Preparing checkout…';
  try {
    const response = await fetch('/api/create-checkout', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({programme})});
    const {url} = await response.json();
    if (!url) throw new Error('No checkout link returned');
    window.location.assign(url);
  } catch {
    button.textContent = 'Choose →';
    dialog.showModal();
  }
}));
