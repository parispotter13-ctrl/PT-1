const FOUNDATION_PAYMENT_LINK =
  "https://buy.stripe.com/test_5kQ6oJfEq5667Kq9L88Ra00";

const dialog = document.querySelector("#account-dialog");
const accountButton = document.querySelector("[data-account]");
const closeButton = document.querySelector(".close");
const signInButton = document.querySelector("[data-sign-in]");
const programmeButtons = document.querySelectorAll(".select-programme");

window.addEventListener("load", async () => {
  try {
    await Clerk.load({
      ui: { ClerkUI: window.__internal_ClerkUICtor },
    });
  } catch (error) {
    console.error("Unable to load Clerk:", error);
  }
});

accountButton.addEventListener("click", async () => {
  if (window.Clerk?.isSignedIn) {
    window.location.href = "/account/";
    return;
  }

  if (window.Clerk) {
    Clerk.openSignIn({
      afterSignInUrl: `${window.location.origin}/account/`,
      afterSignUpUrl: `${window.location.origin}/account/`,
    });
  }
});

closeButton.addEventListener("click", () => dialog.close());

signInButton.addEventListener("click", () => {
  dialog.close();

  Clerk.openSignIn({
    afterSignInUrl: `${window.location.origin}/account/`,
    afterSignUpUrl: `${window.location.origin}/account/`,
  });
});

programmeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.programme !== "foundation") {
      alert("This programme is coming soon.");
      return;
    }

    window.location.assign(FOUNDATION_PAYMENT_LINK);
  });
});
