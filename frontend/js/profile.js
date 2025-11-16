import { supabase } from "./session.js";
import { authenticatedFetch } from '../js/session.js';

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  //check if viewing another user's profile
  const params = new URLSearchParams(window.location.search);
  const targetUsername = params.get("username");
  const targetUserId = params.get("user_id");

  let viewedProfile;
  if (targetUsername || targetUserId) {
    const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, created_at, bio, favorite_genres, favorite_book, avatar_choice")
    .eq(targetUsername ? "username" : "user_id", targetUsername || targetUserId)
    .single();

    if (error || !data) {
      console.error("Error loading target profile:", error);
      return;
    }
    viewedProfile = data;
  } else {
    //default to current user
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, created_at, bio, favorite_genres, favorite_book, avatar_choice")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }
    viewedProfile = data;
  }

  const avatarNum = viewedProfile.avatar_choice || 1;
  const avatarPath = `../images/pfp/${avatarNum}.svg`;

  document.getElementById("profileUsername").textContent = viewedProfile.username;
  document.getElementById("profileCreatedAt").textContent = `Member since ${new Date(viewedProfile.created_at).toLocaleDateString()}`;
  document.getElementById("profileBio").textContent = viewedProfile.bio || "No bio yet.";
  document.getElementById("profileGenres").textContent = viewedProfile.favorite_genres ? viewedProfile.favorite_genres.join(", ") : "No favorite genres yet.";
  document.getElementById("profileBook").textContent = viewedProfile.favorite_book || "No favorite book yet.";
  document.getElementById("profileAvatar").src = avatarPath;
  //document.getElementById("navProfileImg").src = avatarPath;

  //only show “Edit Profile” and "Make Collection" buttons if viewing user's own profile
  const editBtn = document.getElementById("editProfileBtn");
  if (viewedProfile.user_id === user.id) {
    editBtn.style.display = "inline-block";
  } else {
    editBtn.style.display = "none";
  }
  const collectionBtn = document.getElementById("makeCollection");
  if (collectionBtn) {
    collectionBtn.style.display = (viewedProfile.user_id === user.id) ? "inline-block" : "none";
  }

  //load follower/following count
  await loadFollowData(viewedProfile.user_id, user.id);

  //load reviews
  const isOwner = viewedProfile.user_id === user.id;
  await loadUserReviews(viewedProfile.user_id, isOwner);
  
  //no longer only loading collections if own profile
  if (viewedProfile.user_id === user.id) {
    await loadUserCollections(viewedProfile.user_id);
  } else {
    await loadUserCollections(viewedProfile.user_id);
  }

  //PRE-FILL EDIT PROFILE MODAL FIELDS
  if (viewedProfile.user_id === user.id) {
    document.getElementById("bioInput").value =
      viewedProfile.bio || "";

    document.getElementById("genresInput").value =
      viewedProfile.favorite_genres && viewedProfile.favorite_genres.length > 0
        ? viewedProfile.favorite_genres.join(", ")
        : "";

    document.getElementById("bookInput").value =
      viewedProfile.favorite_book || "";
  }

  //generate avatar grid in modal
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
  for (let i = 1; i <= 21; i++) {
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
}

async function loadUserReviews(userID, isOwner) {
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("review_id, rating, text, created_at, books(title)")
    .eq("user_id", userID)
    .order("created_at", { ascending: false });

  const container = document.getElementById("profileReviews");
  if (error) {
    console.error("Error loading reviews:", error);
    container.textContent = "Unable to load reviews.";
    return;
  }

  if (!reviews || reviews.length === 0) {
    container.textContent = "No reviews yet.";
    return;
  }

  container.innerHTML = reviews
    .map(r => {
    //generate "stars" HTML according to rating
    const stars = Array.from({ length: 5 }, (_, i) => {
      if (r.rating > i) {
        return `
          <label class="starsFull">&#9733;</label>
        `;
      }
      else {
        return `
          <label class="stars">&#9733;</label>
        `;
      }
    }).join("");

    return `
      <div class="my-3 text-left" style="padding: 5%; background-color: var(--lightBrown); border: solid; border-color: var(--darkBrown);">
        <strong>${r.books?.title || "Unknown Title"}</strong>
        <div>${stars}</div>
        <div>${r.text || "(No text provided.)"}</div>
        <div style="font-size: smaller; color: var(--offWhite); margin-top: 2%;"> Date Created: ${new Date(r.created_at).toLocaleDateString()}</div>

        ${isOwner ? `
          <button class="main-button-brown-xsmall edit-review-btn mt-2" data-review-id="${r.review_id}" data-rating="${r.rating}" data-text="${r.text || ""}">
            Edit Review
          </button>
          ` : ""}
      </div>
    `;
  })
  .join("");

  //click listener for Edit button
  if (isOwner) {
    document.querySelectorAll(".edit-review-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditReviewModal(btn));
    });
  }
}

async function loadUserCollections(userId) {
  const container = document.getElementById("profileCollections");
  container.innerHTML = "Loading...";

  try {
    //if viewing own profile use normal endpoint
    //if viewing someone else's call the same route but pass `?user_id=...`
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isOwnProfile = currentUser && currentUser.id === userId;
    const url = isOwnProfile
      ? `/collections/get_collections`
      : `/collections/get_collections?user_id=${userId}`;

    const res = await authenticatedFetch(url);
    if (!res.ok) throw new Error("Failed to load collections");

    const data = await res.json();
    const collections = Array.isArray(data.collections) ? data.collections : [];

    if (!collections.length) {
      container.textContent = "No collections yet.";
      return;
    }

    //build previews for each collection
    container.innerHTML = "";

    for (const c of collections) {
      //fetch preview books. Limit to 3
      const previewRes = await authenticatedFetch(
        `/collections/get_collection_books/${c.collectionId}`
      );

      let previewBooks = [];
      if (previewRes.ok) {
        const bookData = await previewRes.json();
        previewBooks = (bookData.books || [])
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .slice(0, 3);
      }

      const preview =
        previewBooks.length > 0
          ? previewBooks.map(b => b.title).join(", ") +
            (previewBooks.length === 3 ? "…" : "")
          : "No books yet";

      const div = document.createElement("div");
      div.className = "collection-preview";
      div.dataset.collectionId = c.collectionId;
      div.innerHTML = `
        <strong class="collection-link" style="cursor:pointer;">
          ${c.name}
        </strong>
        <div style="font-size: 0.9em; color: var(--offWhite);">
          ${preview}
        </div>
      `;

      div.addEventListener("click", () =>
        openCollectionPopup(c.collectionId, c.name)
      );

      container.appendChild(div);
    }
  } catch (err) {
    console.error("Error loading collections:", err);
    container.textContent = "Unable to load collections.";
  }
}

//function to handle counts and follow/unfollow actions
async function loadFollowData(viewedUserId, currentUserId) {
  //fetch counts
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followed_id", viewedUserId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", viewedUserId)
  ]);

  const followerEl = document.getElementById("followerCount");
  const followingEl = document.getElementById("followingCount");
  if (followerEl && followingEl) {
    followerEl.textContent = `${followerCount || 0} followers`;
    followingEl.textContent = `${followingCount || 0} following`;
  }

  //don’t show follow button on own profile
  if (viewedUserId === currentUserId) {
    const followBtn = document.getElementById("followBtn");
    if (followBtn) followBtn.style.display = "none";
    return;
  }

  const followBtn = document.getElementById("followBtn");
  followBtn.style.display = "inline-block";

  //check if user already follows
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", currentUserId)
    .eq("followed_id", viewedUserId);

  let isFollowing = existing && existing.length > 0;
  followBtn.textContent = isFollowing ? "Unfollow" : "Follow";

  followBtn.onclick = async () => {
    if (isFollowing) {
      await supabase.from("follows").delete().match({
        follower_id: currentUserId,
        followed_id: viewedUserId
      });
    } else {
      await supabase.from("follows").insert([{ follower_id: currentUserId, followed_id: viewedUserId }]);
    }
    isFollowing = !isFollowing;
    followBtn.textContent = isFollowing ? "Unfollow" : "Follow";
    loadFollowData(viewedUserId, currentUserId);  //refresh counts
  };
}

async function openFollowList(type) {
  const { data: { user } } = await supabase.auth.getUser();
  const params = new URLSearchParams(window.location.search);
  const targetUsername = params.get("username");
  const targetUserId = params.get("user_id");

  //find viewed profile's user_id (needed for queries)
  let viewedUserId = targetUserId;
  if (!viewedUserId && targetUsername) {
    const { data } = await supabase.from("profiles").select("user_id").eq("username", targetUsername).single();
    viewedUserId = data.user_id;
  }
  if (!viewedUserId) viewedUserId = user.id;

  const isFollowers = type === "followers";
  const query = supabase
    .from("follows")
    .select(`
      ${isFollowers ? "follower_id" : "followed_id"},
      profiles:${isFollowers ? "follower_id" : "followed_id"}(username, avatar_choice)
    `)
    .eq(isFollowers ? "followed_id" : "follower_id", viewedUserId);

  const { data, error } = await query;
  if (error) {
    console.error("Error loading follow list:", error);
    return;
  }

  //display modal with results
  const listType = isFollowers ? "Followers" : "Following";
  let html = `<h5 style="color: var(--offWhite);" class="d-flex justify-content-center">${listType}</h5> 
              <hr style="background-color: var(--offWhite); width: 100%;" class="mb-4">`;
  if (data.length === 0) {
    html += `<p>No ${listType.toLowerCase()} yet.</p>`;
  } else {
    html += data
      .map(
        f => `
        <div class="d-flex align-items-center m-3">
          <img src="../images/pfp/${f.profiles.avatar_choice || 1}.svg" class="mr-2" style="height:40px;width:40px;">
          <a href="../userPages/profile.html?username=${f.profiles.username}">
            ${f.profiles.username}
          </a>
        </div>`
      )
      .join("");
  }

  const modalBody = document.getElementById("followModalBody");
  modalBody.innerHTML = html;
  $("#followModal").modal("show");
}

async function openCollectionPopup(collectionId, collectionName = "Collection") {
  const popup = document.getElementById("viewCollectionPopup");
  const backdrop = document.getElementById("popupBackdrop");
  const titleEl = document.getElementById("collectionPopupTitle");
  const booksEl = document.getElementById("collectionPopupBooks");

  //reset content
  booksEl.innerHTML = "Loading...";
  titleEl.textContent = collectionName;

  popup.classList.add("show");
  backdrop.style.display = "block";

  try {
    const res = await authenticatedFetch(
      `/collections/get_collection_books/${collectionId}`
    );
    if (!res.ok) throw new Error("Failed to fetch books");

    const data = await res.json();
    const books = Array.isArray(data.books) ? data.books : [];

    if (!books.length) {
      booksEl.textContent = "No books in this collection.";
      return;
    }

    //sort by position
    books.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    //render
    booksEl.innerHTML = books
      .map(b => {
        const cover = b.cover_img_url || "../images/bookCoverDefault.svg";

        return `
          <div class="collection-book-entry">
            <img src="${cover}" style="height:70px; border-radius:5px; margin-right:10px;">
            <strong>${b.title}</strong><br>
            <span style="font-size:0.9em; opacity:0.8;">
              ${b.author_name || "Unknown Author"}
            </span>
          </div>
          <hr style="opacity:0.2;">
        `;
      })
      .join("");
  } catch (err) {
    console.error("Popup load error:", err);
    booksEl.textContent = "Unable to load books.";
  }
}

let currentEditingReviewId = null;

function openEditReviewModal(btn) {
  const reviewId = btn.dataset.reviewId;
  const rating = Number(btn.dataset.rating);
  const text = btn.dataset.text;

  currentEditingReviewId = reviewId;

  //fill stars
  const starContainer = document.getElementById("editReviewStars");
  starContainer.innerHTML = "";

  for (let i = 5; i >= 1; i--) {
    const checked = rating === i ? "checked" : "";
    starContainer.innerHTML += `
      <input type="radio" id="edit-star${i}" name="edit-rating" value="${i}" ${checked}>
      <label for="edit-star${i}">&#9733;</label>
    `;
  }

  //fill text
  document.getElementById("editReviewText").value = text;

  $("#editReviewModal").modal("show");
}

document.getElementById("saveReviewBtn").addEventListener("click", async () => {
  const newRating = Number(document.querySelector("input[name='edit-rating']:checked").value);
  const newText = document.getElementById("editReviewText").value;

  const { error } = await supabase
    .from("reviews")
    .update({ rating: newRating, text: newText })
    .eq("review_id", currentEditingReviewId);

  if (error) {
    console.error("Error saving review:", error);
    return;
  }

  $("#editReviewModal").modal("hide");
  loadProfile();  //reload profile data
});

document.getElementById("deleteReviewBtn").addEventListener("click", async () => {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("review_id", currentEditingReviewId);

  if (error) {
    console.error("Error deleting review:", error);
    return;
  }

  $("#editReviewModal").modal("hide");
  loadProfile();
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
    loadProfile();
  }

  // close popup
  document.querySelectorAll(".popup").forEach(p => p.classList.remove("show"));
  popupBackdrop.style.display = "none";
});

document.addEventListener("click", e => {
  const popupBackdrop = document.getElementById("popupBackdrop");  
  const editPage = document.getElementById("editProfileModal");
  const makeCollection = document.getElementById("makeCollectionPopup");

  // open collection popup
  if (e.target.closest(".makeCollectionPopup")) { 
    makeCollection.classList.add("show");
    popupBackdrop.style.display = "block";
  }

  // open edit profile popup
  if (e.target.closest("#editProfileBtn")) {
    editPage.classList.add("show");
    popupBackdrop.style.display = "block";
  }

  // close popups
  if (e.target.closest(".close") || e.target === popupBackdrop) { 
    document.querySelectorAll(".popup").forEach(p => p.classList.remove("show"));
    popupBackdrop.style.display = "none";
  }
});

document.getElementById("followerLink").addEventListener("click", e => {
  e.preventDefault();
  openFollowList("followers");
});

document.getElementById("followingLink").addEventListener("click", e => {
  e.preventDefault();
  openFollowList("following");
});

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('createCollectionForm');
  const nameInput = document.getElementById('collectionName');

  if (!form) return;

  form.addEventListener('submit', async(e) => {
    e.preventDefault();
    
    const name = (nameInput.value || '').trim();
    if (!name) {alert('Please enter collection name.'); return; }
    
    const selectedImg = document.querySelector('#iconOptions .icon-option.selected');
    if (!selectedImg) { alert('Pick an icon.'); return; }

    const iconId = (selectedImg.src.match(/\/collections\/(\d+)\.svg$/)?.[1] || '');
    if (!iconId) { alert('Couldnt figure out icon id.'); return; }

    const payload = {name, iconId: Number(iconId) };
    

    try{
      const res = await authenticatedFetch('/collections/create_collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data = null, text='';
      data = await res.json();

      if (!res.ok || (data && data.success == false)){
        let msg = data?.error || 'Something went wrong. Please try again.';

        //context for common errors
        if (res.status === 422) {
          msg = data?.error || 'Invalid collection data.';
        } else if (res.status === 401) {
          msg = 'You need to be logged in to create collections.';
        } else if (res.status === 500) {
          msg = 'Server error. Please try again later.';
        }

        alert(`Couldn't create collection: ${msg}`);
        console.error('Collection creation failed:', { status: res.status, data });
        return;
      }
      
      form.reset();
      const popup = document.getElementById('popup');
      const backdrop = document.getElementById('popupBackdrop');
      if (popup) popup.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';

    } catch(err){
      console.error(err);
      alert(`Network error: ${err?.message || err}`);
    }
  });

});

loadProfile();