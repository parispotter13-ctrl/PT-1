window.addEventListener('load', async () => {
  await Clerk.load({
    ui: { ClerkUI: window.__internal_ClerkUICtor },
  });

  const dialog = document.querySelector('#account-dialog');

  const paymentLinks = {
    foundation: 'https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00',
    performance: 'PASTE-YOUR-PERFORMANCE-STRIPE-LINK-HERE',
    sessions: 'PASTE-YOUR-SESSIONS-STRIPE-LINK-HERE',
  };

  document.querySelector('[data-account]').addEventListener('click', () => {
    if (Clerk.isSignedIn) {
      window.location.href = '/account/';
    } else {
      Clerk.openSignIn({
        afterSignInUrl: `${window.location.origin}/account/`,
        afterSignUpUrl: `${window.location.origin}/account/`,
      });
    }
  });

  document.querySelector('.close').addEventListener('click', () => dialog.close());

  document.querySelector('[data-sign-in]').addEventListener('click', () => {
    Clerk.openSignIn({
      afterSignInUrl: `${window.location.origin}/account/`,
      afterSignUpUrl: `${window.location.origin}/account/`,
    });
  });

  document.querySelectorAll('.select-programme').forEach((button) => {
    button.addEventListener('click', () => {
      if (!Clerk.isSignedIn) {
        Clerk.openSignUp({
          afterSignUpUrl: window.location.href,
        });
        return;
      }

      window.location.assign(paymentLinks[button.dataset.programme]);
    });
  });
});
