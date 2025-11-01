import { supabase } from "./session.js";

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, created_at, bio, favorite_genres, favorite_book, avatar_url")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error loading profile:", error);
    return;
  }

  document.getElementById("profileUsername").textContent = data.username;
  document.getElementById("profileCreatedAt").textContent = `Member since ${new Date(data.created_at).toLocaleDateString()}`;
  document.getElementById("profileBio").textContent = data.bio || "No bio yet.";
  document.getElementById("profileGenres").textContent = data.favorite_genres ? data.favorite_genres.join(", ") : "No favorite genres yet.";
  document.getElementById("profileBook").textContent = data.favorite_book || "No favorite book yet.";
  document.getElementById("profileAvatar").src = data.avatar_url || "../images/loggedOutPFP.svg";
  document.getElementById("navProfileImg").src = data.avatar_url || "../images/loggedOutPFP.svg";

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

  const { error } = await supabase
    .from("profiles")
    .update({
      bio,
      favorite_genres: genres ? genres.split(",").map(g => g.trim()) : null,
      favorite_book
    })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating profile:", error);
  } else {
    $("#editProfileModal").modal("hide");
    loadProfile();
  }
});

loadProfile();