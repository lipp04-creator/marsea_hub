const API_BASE = "http://localhost:5000";

// Tampilkan/hide password
function togglePass(id) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = (input.type === "password") ? "text" : "password";
}

/* =======================
    REGISTER
======================= */
async function registerUser() {
  const nama  = document.getElementById("regNama").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass  = document.getElementById("regPass").value.trim();
  const error = document.getElementById("regError");

  const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

  if (!nama || !email || !pass) {
    error.style.display = "block";
    error.textContent = "Semua field wajib diisi.";
    return;
  }

  if (!emailRegex.test(email)) {
    error.style.display = "block";
    error.textContent = "Format email tidak valid.";
    return;
  }

  if (pass.length < 6) {
    error.style.display = "block";
    error.textContent = "Password minimal 6 karakter.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nama,
        email: email,
        password: pass
      })
    });

    const data = await res.json();

    if (!res.ok) {
      error.style.display = "block";
      error.textContent = data.message || "Registrasi gagal.";
      return;
    }

    alert("Registrasi berhasil! Silakan login.");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    error.style.display = "block";
    error.textContent = "Terjadi kesalahan koneksi.";
  }
}

/* =======================
    LOGIN
======================= */
async function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass  = document.getElementById("loginPass").value.trim();
  const error = document.getElementById("loginError");

  if (!email || !pass) {
    error.style.display = "block";
    error.textContent = "Email dan password wajib diisi.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: pass
      })
    });

    const data = await res.json();

    if (!res.ok) {
      error.style.display = "block";
      error.textContent = data.message || "Login gagal.";
      return;
    }

    // simpan session sederhana
    localStorage.setItem("marseaSession", "true");
    localStorage.setItem("marseaUser", JSON.stringify(data.user));

    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    error.style.display = "block";
    error.textContent = "Terjadi kesalahan koneksi.";
  }
}

/* =======================
    PROTECT PAGE
======================= */
function protectPage() {
  const session = localStorage.getItem("marseaSession");
  if (session !== "true") {
    window.location.href = "login.html";
  }
}

/* =======================
    LOGOUT
======================= */
function logout() {
  localStorage.removeItem("marseaSession");
  localStorage.removeItem("marseaUser");
  window.location.href = "login.html";
}
