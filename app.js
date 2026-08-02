const paymentLinks = {
  foundation: "https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00",
  performance: "PASTE-YOUR-PERFORMANCE-STRIPE-LINK-HERE",
  sessions: "PASTE-YOUR-1-TO-1-SESSION-STRIPE-LINK-HERE",
};

const dialog = document.querySelector("#account-dialog");
const accountButton = document.querySelector("[data-account]");
const closeButton = document.querySelector(".close");
const signInButton = document.querySelector("[data-sign-in]");
const programmeButtons = document.querySelectorAll(".select-programme");

const clerkReady = new Promise((resolve) => {
  window.addEventListener("load", async () => {
    if (!window.Clerk) {
      console.error("Clerk did not load.");
      resolve(false);
      return;
    }

    try {
      await Clerk.load({
        ui: { ClerkUI: window.__internal_ClerkUICtor },
      });
      resolve(true);
    } catch (error) {
      console.error("Unable to load Clerk:", error);
      resolve(false);
    }
  });
});

async function openSignIn() {
  const ready = await clerkReady;

  if (!ready) {
    alert("Sign-in could not load. Please refresh and try again.");
    return;
  }

  Clerk.openSignIn({
    afterSignInUrl: `${window.location.origin}/account/`,
    afterSignUpUrl: `${window.location.origin}/account/`,
  });
}

accountButton.addEventListener("click", async () => {
  const ready = await clerkReady;

  if (ready && Clerk.isSignedIn) {
    window.location.href = "/account/";
    return;
  }

  openSignIn();
});

closeButton.addEventListener("click", () => dialog.close());

signInButton.addEventListener("click", () => {
  dialog.close();
  openSignIn();
});

programmeButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const ready = await clerkReady;

    if (!ready) {
      alert("Sign-in could not load. Please refresh and try again.");
      return;
    }

    if (!Clerk.isSignedIn) {
      Clerk.openSignUp({
        afterSignUpUrl: window.location.href,
      });
      return;
    }

    const paymentLink = paymentLinks[button.dataset.programme];

    if (!paymentLink || paymentLink.includes("PASTE-YOUR")) {
      alert("Checkout is being configured. Please try again shortly.");
      return;
    }

    window.location.assign(paymentLink);
  });
});
