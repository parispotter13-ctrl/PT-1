const dialog = document.querySelector("#account-dialog");
const accountButton = document.querySelector("[data-account]");
const closeButton = document.querySelector(".close");
const signInButton = document.querySelector("[data-sign-in]");
const programmeButtons = document.querySelectorAll(".select-programme");

const clerkReady = new Promise((resolve) => {
  window.addEventListener("load", async () => {
    if (!window.Clerk) {
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

    if (button.dataset.programme !== "foundation") {
      alert("This programme is coming soon.");
      return;
    }

    button.disabled = true;
    button.textContent = "Opening secure checkout…";

    try {
      const token = await Clerk.session.getToken();

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const checkout = await response.json();

      if (!response.ok || !checkout.url) {
        throw new Error(checkout.error || "Checkout could not be created.");
      }

      window.location.assign(checkout.url);
    } catch (error) {
      console.error(error);
      alert("Checkout could not be opened. Please try again.");
      button.disabled = false;
      button.innerHTML = 'Choose <span>→</span>';
    }
  });
});
