document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginContainer = document.getElementById("login-container");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const dashboardContainer = document.getElementById("dashboard-container");
  const myActivitiesList = document.getElementById("my-activities-list");
  const signedInUser = document.getElementById("signed-in-user");
  const logoutButton = document.getElementById("logout-button");
  const signupButton = document.getElementById("signup-button");

  let currentUser = null;

  function setMessage(element, text, type) {
    element.textContent = text;
    element.className = type;
    element.classList.remove("hidden");
  }

  function clearMessage(element) {
    element.textContent = "";
    element.className = "hidden";
  }

  function updateAuthView() {
    const signedIn = Boolean(currentUser);
    loginContainer.classList.toggle("hidden", signedIn);
    dashboardContainer.classList.toggle("hidden", !signedIn);
    signedInUser.classList.toggle("hidden", !signedIn);
    logoutButton.classList.toggle("hidden", !signedIn);
    signupButton.disabled = !signedIn;
    signedInUser.textContent = signedIn ? `Signed in as ${currentUser.email}` : "";
  }

  async function loadCurrentUser() {
    const response = await fetch("/auth/me");
    if (response.ok) {
      currentUser = await response.json();
    }
    updateAuthView();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) => `<li><span class="participant-email">${email}</span></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function fetchMyActivities() {
    if (!currentUser) return;

    const response = await fetch("/me/activities");
    if (!response.ok) return;

    const activities = await response.json();
    myActivitiesList.innerHTML = activities.length
      ? activities
          .map(
            (activity) => `
              <article class="dashboard-item">
                <h4>${activity.name}</h4>
                <p>${activity.description}</p>
                <p><strong>Schedule:</strong> ${activity.schedule}</p>
                <button type="button" data-dashboard-activity="${activity.name}">Unregister</button>
              </article>`
          )
          .join("")
      : "<p>You are not registered for any activities yet.</p>";

    document.querySelectorAll("[data-dashboard-activity]").forEach((button) => {
      button.addEventListener("click", () => unregisterActivity(button.dataset.dashboardActivity));
    });
  }

  async function unregisterActivity(activity) {
    const response = await fetch(
      `/activities/${encodeURIComponent(activity)}/unregister`,
      { method: "DELETE" }
    );
    const result = await response.json();
    setMessage(messageDiv, response.ok ? result.message : result.detail, response.ok ? "success" : "error");
    if (response.ok) {
      await fetchActivities();
      await fetchMyActivities();
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
        fetchMyActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(loginMessage, result.detail, "error");
      return;
    }
    currentUser = result;
    loginForm.reset();
    clearMessage(loginMessage);
    updateAuthView();
    await fetchMyActivities();
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST" });
    currentUser = null;
    updateAuthView();
    myActivitiesList.innerHTML = "";
  });

  // Initialize app
  loadCurrentUser().then(() => {
    fetchActivities();
    fetchMyActivities();
  });
});
