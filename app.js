const dialog = document.querySelector('#account-dialog');

const paymentLinks = {
  foundation: 'https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00',
  performance: 'https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00',
  sessions: 'https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00',
};

document.querySelector('[data-account]').addEventListener('click', () => dialog.showModal());
document.querySelector('.close').addEventListener('click', () => dialog.close());

document.querySelector('[data-sign-in]').addEventListener('click', () => {
  window.location.href = '/account/';
});

document.querySelectorAll('.select-programme').forEach((button) => {
  button.addEventListener('click', () => {
    const url = paymentLinks[button.dataset.programme];

    if (url && !url.includes('REPLACE_')) {
      window.location.assign(url);
    } else {
      alert('Checkout is being configured. Please try again shortly.');
    }
  });
});
