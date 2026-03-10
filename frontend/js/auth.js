const API_BASE = "http://127.0.0.1:8000";

// ========================
// Show Login / Register UI
// ========================
function showLogin() {
    document.getElementById("loginForm").classList.add("active");
    document.getElementById("registerForm").classList.remove("active");

    document.querySelectorAll(".tab-btn")[0].classList.add("active");
    document.querySelectorAll(".tab-btn")[1].classList.remove("active");
}

function showRegister() {
    document.getElementById("registerForm").classList.add("active");
    document.getElementById("loginForm").classList.remove("active");

    document.querySelectorAll(".tab-btn")[1].classList.add("active");
    document.querySelectorAll(".tab-btn")[0].classList.remove("active");
}


// ========================
// REGISTER
// ========================
document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const usernameInput = document.getElementById("registerUsername");
    const passwordInput = document.getElementById("registerPassword");

    const usernameError = document.getElementById("registerUsernameError");
    const passwordError = document.getElementById("registerPasswordError");

    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    let isValid = true;

    // Reset errors
    usernameInput.classList.remove("error");
    passwordInput.classList.remove("error");
    usernameError.style.display = "none";
    passwordError.style.display = "none";

    // Username check
    if (usernameInput.value.trim() === "") {
        usernameInput.classList.add("error");
        usernameError.textContent = "Username cannot be blank";
        usernameError.style.display = "block";
        isValid = false;
    }

    // Password check
    if (passwordInput.value.trim() === "") {
        passwordInput.classList.add("error");
        passwordError.textContent = "Password cannot be blank";
        passwordError.style.display = "block";
        isValid = false;
    }
    else if (!passwordRegex.test(passwordInput.value)) {
        passwordInput.classList.add("error");
        passwordError.textContent =
            "Minimum 8 characters, uppercase, lowercase, number & special character";
        passwordError.style.display = "block";
        isValid = false;
    }

    if (!isValid) return;

    // ✅ If validation passed → call backend
    try {
        const response = await fetch(`${API_BASE}/register/?username=${usernameInput.value}&password=${passwordInput.value}`, {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            passwordError.textContent = data.detail || "Registration failed";
            passwordError.style.display = "block";
            return;
        }

        showToast("Account created successfully!", "success");
        showLogin();

    } catch (error) {
        showToast("Invalid username or password!", "error");

    }
});



// ========================
// LOGIN
// ========================
document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_BASE}/login/?username=${username}&password=${password}`, {
            method: "POST"
        });

        // ❗ VERY IMPORTANT CHECK
        if (!response.ok) {
            showToast("Invalid username or password!", "error");
            return; // STOP — do NOT redirect
        }

        const data = await response.json();

        if (!data.access_token) {
            showToast("Login failed!", "error");
            return;
        }

        // 🔐 Save JWT token
        localStorage.setItem("token", data.access_token);

        // ✅ Redirect ONLY on success

        showToast("Login successful!", "success");

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1200);

        
    } catch (error) {
        showToast("Server error while logging in!", "error");
        console.error(error);
    }
});
function togglePassword(inputId, iconWrapper) {
    const input = document.getElementById(inputId);
    const icon = iconWrapper.querySelector(".material-icons");

    if (input.type === "password") {
        input.type = "text";
        icon.textContent = "visibility_off";  // 🔥 eye with slash
    } else {
        input.type = "password";
        icon.textContent = "visibility";  // 👁 normal eye
    }
}

function showToast(message, type = "success") {

    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span>${message}</span>
        <span class="close-btn">&times;</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3 sec
    setTimeout(() => {
        toast.remove();
    }, 3000);

    // Manual close
    toast.querySelector(".close-btn").onclick = () => {
        toast.remove();
    };
}




