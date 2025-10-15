const API = "http://" + window.location.hostname + ":3000/api/Auth";

export async function login(email, password) {
    const response = await fetch(API + "/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
            Email: email,
            Password: password,
        }),
    });
    
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Login failed");
    }
    return await response.json();
}

export async function logout() {
    const response = await fetch(API + "/Logout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        credentials: "include",
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Logout failed");
    }
}
