import { supabase } from "./session.js";

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, created_at, bio, favorite_genres, favorite_book, avatar_choice")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error loading profile:", error);
    return;
  }

  const avatarNum = data.avatar_choice || 1;
  const avatarPath = `../images/pfp/${avatarNum}.svg`;

  document.getElementById("profileUsername").textContent = data.username;
  document.getElementById("profileCreatedAt").textContent = `Member since ${new Date(data.created_at).toLocaleDateString()}`;
  document.getElementById("profileBio").textContent = data.bio || "No bio yet.";
  document.getElementById("profileGenres").textContent = data.favorite_genres ? data.favorite_genres.join(", ") : "No favorite genres yet.";
  document.getElementById("profileBook").textContent = data.favorite_book || "No favorite book yet.";
  document.getElementById("profileAvatar").src = avatarPath;
  document.getElementById("navProfileImg").src = avatarPath;

  //Generate avatar grid in modal
  const avatarContainer = document.getElementById("avatarOptions");
  avatarContainer.innerHTML = "";
  for (let i = 1; i <= 20; i++) {
    const img = document.createElement("img");
    img.src = `../images/pfp/${i}.svg`;
    img.classList.add("avatar-option");
    if (i === avatarNum) img.classList.add("selected");
    img.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option").forEach(opt => opt.classList.remove("selected"));
      img.classList.add("selected");
      img.dataset.selected = true;
    });
    avatarContainer.appendChild(img);
  }

  // generate icons for collections
  const iconContainer = document.getElementById("iconOptions");
  iconContainer.innerHTML = "";
  for (let i = 1; i <= 12; i++) {
    const img = document.createElement("img");
    img.src = `../images/collections/${i}.svg`;
    img.classList.add("icon-option");
    img.addEventListener("click", () => {
      document.querySelectorAll(".icon-option").forEach(opt => opt.classList.remove("selected"));
      img.classList.add("selected");
      img.dataset.selected = true;
    });
    iconContainer.appendChild(img);
  }

  //Load related reads (user_books)
  const { data: reads } = await supabase
    .from("user_books")
    .select("book_id, status, books(title)")
    .eq("user_id", user.id);

  const readsContainer = document.getElementById("profileReads");
  readsContainer.innerHTML = reads && reads.length
    ? reads.map(r => `<div><strong>${r.books.title}</strong> – ${r.status}</div>`).join("")
    : "You have no books logged.";

  //Load user collections (lists)
  const { data: lists } = await supabase
    .from("lists")
    .select("name, description")
    .eq("user_id", user.id);

  const collectionsContainer = document.getElementById("profileCollections");
  collectionsContainer.innerHTML = lists && lists.length
    ? lists.map(l => `<div><strong>${l.name}</strong>: ${l.description || ""}</div>`).join("")
    : "You have no collections yet.";
}

document.getElementById("editProfileBtn").addEventListener("click", () => {
  $("#editProfileModal").modal("show");
});

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const bio = document.getElementById("bioInput").value.trim();
  const genres = document.getElementById("genresInput").value.trim();
  const favorite_book = document.getElementById("bookInput").value.trim();

  const selectedImg = document.querySelector(".avatar-option.selected");
  const avatar_choice = selectedImg
    ? parseInt(selectedImg.src.match(/\/(\d+)\.svg$/)[1])
    : 1;

  const { error } = await supabase
    .from("profiles")
    .update({
      bio,
      favorite_genres: genres ? genres.split(",").map(g => g.trim()) : null,
      favorite_book,
      avatar_choice
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
  } else {
    $("#editProfileModal").modal("hide");
    loadProfile();
  }
});

document.addEventListener("click", e => {
  if (e.target.closest(".openReviewPopup")) {
      popupReview.style.display = "grid";
      popupBackdrop.style.display = "block";
  }
  if (e.target.closest(".closeReview")) {
      popupReview.style.display = "none";
      popupBackdrop.style.display = "none";
  }
});

loadProfile();