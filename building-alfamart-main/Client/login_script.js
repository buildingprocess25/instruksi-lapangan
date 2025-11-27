// login_script.js

const APPS_SCRIPT_POST_URL =
  "https://script.google.com/macros/s/AKfycbzPubDTa7E2gT5HeVLv9edAcn1xaTiT3J4BtAVYqaqiFAvFtp1qovTXpqpm-VuNOxQJ/exec";

const PYTHON_API_LOGIN_URL =
  "https://building-alfamart.onrender.com/api/login";

async function logLoginAttempt(username, cabang, status) {
  const logData = {
    requestType: "loginAttempt",
    username: username,
    cabang: cabang,
    status: status,
  };

  try {
    await fetch(APPS_SCRIPT_POST_URL, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(logData),
    });
  } catch (error) {
    console.error("Failed to log login attempt:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const eyeOpen = document.getElementById("eyeOpen");
  const eyeSlashed = document.getElementById("eyeSlashed");

  if (togglePassword) {
    togglePassword.addEventListener("click", () => {
      const type =
        passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = type;

      eyeOpen.style.display = type === "text" ? "block" : "none";
      eyeSlashed.style.display = type === "text" ? "none" : "block";
    });
  }

  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const loginType = document.getElementById("loginType")?.value || "";
    const username = loginForm.username.value;
    const password = passwordInput.value;

    loginMessage.textContent = "Logging in...";
    loginMessage.className = "login-message";
    loginMessage.style.display = "block";

    try {
      const response = await fetch(PYTHON_API_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, cabang: password }),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        logLoginAttempt(username, password, "Success");

        const userRole = (result.role || "").toUpperCase();

        // ===========================================
        // VALIDASI ROLE BERDASARKAN loginType
        // ===========================================

        // LOGIN RAB = hanya KONTRAKTOR
        if (loginType === "rab") {
          if (userRole !== "KONTRAKTOR") {
            loginMessage.textContent =
              "Akses ditolak. Halaman RAB hanya untuk KONTRAKTOR.";
            loginMessage.className = "login-message error";
            return; // Tetap di halaman login
          }
        }

        // LOGIN SPK = hanya MANAGER
        if (loginType === "spk") {
          if (
            userRole !== "MANAGER" &&
            userRole !== "BRANCH BUILDING & MAINTENANCE MANAGER"
          ) {
            loginMessage.textContent =
              "Akses ditolak. Halaman SPK hanya untuk MANAGER.";
            loginMessage.className = "login-message error";
            return;
          }
        }

        // Jika role sesuai → lanjut login
        loginMessage.textContent = "Login berhasil! Mengarahkan...";
        loginMessage.className = "login-message success";

        sessionStorage.setItem("authenticated", "true");
        sessionStorage.setItem("loggedInUserEmail", username);
        sessionStorage.setItem("loggedInUserCabang", password);
        sessionStorage.setItem("userRole", userRole);

        setTimeout(() => {
            if (loginType === "rab") {
                window.location.href = "/Estimasi_rab/index.html";
            } 
            else if (loginType === "spk") {
                window.location.href = "/SPK_form/index.html";
            } 
            else {
                window.location.href = "/";
            }
        }, 1200);
      } else {
        if (result.message === "Invalid credentials") {
          loginMessage.textContent =
            "Email benar, tetapi password salah.";
        } else {
          loginMessage.textContent =
            result.message || "Username atau password salah.";
        }

        loginMessage.className = "login-message error";
        logLoginAttempt(username, password, "Failed");
      }
    } catch (error) {
      console.error(error);
      logLoginAttempt(username, password, "Failed");
      loginMessage.textContent =
        "Gagal terhubung ke server. Silakan coba lagi.";
      loginMessage.className = "login-message error";
    }
  });
});
