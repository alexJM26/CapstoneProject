import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export const supabase = createClient("https://qguuhcavrukdmprrtxik.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndXVoY2F2cnVrZG1wcnJ0eGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NDgxNjMsImV4cCI6MjA3NDMyNDE2M30.FHTmwOGGNX10cVmYf7toVIkqHCsc2IvnbzVHgHme408");

//Function to update navbar UI
async function updateNavbar() {
  const pfpImg = document.querySelector(".PFPImg");
  const dropdown = document.querySelector(".dropdown-menu");

  if (!pfpImg || !dropdown) return; //Navbar not on this page

  const { data: { user } } = await supabase.auth.getUser();

  //Clear old items
  dropdown.innerHTML = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("user_id", user.id)
      .single();

    //update PFP
    if (profile?.avatar_url) pfpImg.src = profile.avatar_url;
    else pfpImg.src = "../images/loggedInPFP.png";

    //Logged-in menu items
    dropdown.innerHTML = `
      <a class="dropdown-item" href="../userPages/profile.html">My Profile</a>
      <a class="dropdown-item" href="../userPages/myReads.html">My Reads</a>
      <a class="dropdown-item" href="../userPages/myCollections.html">My Collections</a>
      <a class="dropdown-item" href="../userPages/settings.html">User Settings</a>
      <div class="dropdown-item"><hr style="background-color: var(--darkBrown);"></div>
      <a id="logout-btn" class="dropdown-item" href="#">Logout</a>
    `;

    //logout handler
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = "../loginPages/login.html";
    });
  } else {
    //Not logged in
    pfpImg.src = "../images/loggedOutPFP.svg";
    dropdown.innerHTML = `
      <a class="dropdown-item" href="../loginPages/login.html">Login / Create Account</a>
    `;
  }
}

updateNavbar();

//auto-redirect logged-in users away from login/signup pages
const path = window.location.pathname;
if (path.includes("login.html") || path.includes("createAccount.html")) {
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = "../index.html";
  });
}