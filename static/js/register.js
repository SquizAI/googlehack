document.getElementById("register-form").addEventListener("submit", async function(event) {
    event.preventDefault();
    const username = document.getElementById("reg-username").value;
    const password = document.getElementById("reg-password").value;
    const avatar = document.getElementById("avatar").files[0];

    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("avatar", avatar);

    try {
        const response = await fetch("/register", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            // Handle successful registration
            window.location.href = "/";
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert("Registration failed: " + error.message);
    }
});
