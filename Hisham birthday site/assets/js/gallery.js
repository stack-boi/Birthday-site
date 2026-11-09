/* ============================================================
   Hisham · 23 — polaroid reel
   ============================================================ */

(function () {
  "use strict";

  const track = document.getElementById("reelTrack");
  const dotsWrap = document.getElementById("reelDots");
  const countEl = document.getElementById("reelCount");
  const lightbox = document.getElementById("photoLightbox");

  if (!track || !lightbox) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rawPhotos = Array.isArray(window.HISHAM_GALLERY) ? window.HISHAM_GALLERY : [];
  const videoPattern = /\.(mp4|webm|ogv|m4v|mov)(?:[?#].*)?$/i;

  const photos = rawPhotos
    .filter((photo) => photo && typeof photo.src === "string" && photo.src.trim())
    .map((photo) => ({
      src: photo.src,
      type: photo.type === "video" || videoPattern.test(photo.src) ? "video" : "image",
      caption: typeof photo.caption === "string" && photo.caption.trim() ? photo.caption.trim() : "A favourite frame",
      alt: typeof photo.alt === "string" && photo.alt.trim() ? photo.alt.trim() : photo.caption || "Polaroid photo"
    }));

  if (!photos.length) return;

  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxVideo = document.getElementById("lightboxVideo");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxCount = document.getElementById("lightboxCount");
  const lightboxClose = lightbox.querySelector("[data-lightbox-close]");
  const lightboxPrev = lightbox.querySelector("[data-lightbox-prev]");
  const lightboxNext = lightbox.querySelector("[data-lightbox-next]");

  const cards = [];
  let active = 0;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragEndedAt = 0;
  let scrollTicking = false;
  let lightboxIndex = 0;

  const pad = (number) => String(number).padStart(2, "0");

  function makeCard(photo, index) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "polaroid";
    card.dataset.index = String(index);
    card.style.setProperty("--tilt", `${((index % 5) - 2) * 0.85}deg`);
    card.setAttribute("aria-label", `${photo.type === "video" ? "Play video" : "Open polaroid"}: ${photo.caption}`);

    const frame = document.createElement("span");
    frame.className = "polaroid-photo";

    if (photo.type === "video") {
      const video = document.createElement("video");
      video.src = photo.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.tabIndex = -1;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("loadedmetadata", () => {
        try {
          if (Number.isFinite(video.duration) && video.duration > 0.2) video.currentTime = 0.1;
        } catch (error) {
          /* browsers that cannot seek before data loads just show the first frame */
        }
      });
      video.addEventListener("error", () => {
        frame.classList.add("is-missing");
        frame.textContent = "Video unavailable";
      });

      frame.classList.add("is-video");
      frame.appendChild(video);

      const play = document.createElement("span");
      play.className = "polaroid-play";
      play.setAttribute("aria-hidden", "true");
      play.textContent = "▶";
      frame.appendChild(play);
    } else {
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = "";
      img.loading = index < 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        frame.classList.add("is-missing");
        frame.textContent = "Photo unavailable";
      });
      frame.appendChild(img);
    }

    const caption = document.createElement("span");
    caption.className = "polaroid-caption";
    caption.textContent = photo.caption;

    const stamp = document.createElement("span");
    stamp.className = "polaroid-stamp";
    stamp.setAttribute("aria-hidden", "true");
    stamp.textContent = `${pad(index + 1)} / ${pad(photos.length)}`;

    const tape = document.createElement("span");
    tape.className = "polaroid-tape";
    tape.setAttribute("aria-hidden", "true");

    card.append(stamp, tape, frame, caption);
    return card;
  }

  function build() {
    const fragment = document.createDocumentFragment();
    photos.forEach((photo, index) => {
      const card = makeCard(photo, index);
      cards.push(card);
      fragment.appendChild(card);
    });
    track.appendChild(fragment);

    if (dotsWrap && photos.length <= 24) {
      photos.forEach((photo, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "reel-dot";
        dot.dataset.index = String(index);
        dot.setAttribute("aria-label", `Go to ${photo.type === "video" ? "video" : "polaroid"} ${index + 1}: ${photo.caption}`);
        dot.addEventListener("click", () => scrollToIndex(index));
        dotsWrap.appendChild(dot);
      });
    } else if (dotsWrap) {
      dotsWrap.hidden = true;
    }

    updateUI();
  }

  function anchorDelta(card) {
    const trackRect = track.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const cardRect = card.getBoundingClientRect();
    return cardRect.left - (trackRect.left + padding);
  }

  function scrollToIndex(index) {
    const card = cards[(index + cards.length) % cards.length];
    if (!card) return;
    track.scrollBy({
      left: anchorDelta(card),
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }

  function scrollByCards(direction) {
    syncActive();
    scrollToIndex(active + direction);
  }

  function syncActive() {
    if (!cards.length) return;
    const trackRect = track.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const anchor = trackRect.left + padding;
    let closest = 0;
    let distance = Infinity;

    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardDistance = Math.abs(rect.left - anchor);
      if (cardDistance < distance) {
        distance = cardDistance;
        closest = index;
      }
    });

    if (closest !== active) {
      active = closest;
      updateUI();
    }
  }

  function updateUI() {
    if (countEl) countEl.textContent = `${pad(active + 1)} / ${pad(photos.length)}`;

    if (dotsWrap) {
      dotsWrap.querySelectorAll(".reel-dot").forEach((dot, index) => {
        dot.classList.toggle("is-active", index === active);
        dot.setAttribute("aria-current", index === active ? "true" : "false");
      });
    }
  }

  function renderLightbox() {
    const photo = photos[lightboxIndex];
    const isVideo = photo.type === "video";

    if (lightboxVideo) {
      if (isVideo) {
        lightboxVideo.hidden = false;
        if (lightboxVideo.getAttribute("src") !== photo.src) {
          lightboxVideo.src = photo.src;
        }
        lightboxVideo.setAttribute("aria-label", photo.alt);
      } else {
        lightboxVideo.pause();
        lightboxVideo.hidden = true;
        lightboxVideo.removeAttribute("src");
        lightboxVideo.removeAttribute("aria-label");
        if (typeof lightboxVideo.load === "function") lightboxVideo.load();
      }
    }

    if (lightboxImg) {
      if (isVideo) {
        lightboxImg.hidden = true;
        lightboxImg.removeAttribute("src");
        lightboxImg.alt = "";
      } else {
        lightboxImg.hidden = false;
        lightboxImg.src = photo.src;
        lightboxImg.alt = photo.alt;
      }
    }

    if (lightboxCaption) lightboxCaption.textContent = photo.caption;
    if (lightboxCount) lightboxCount.textContent = `${pad(lightboxIndex + 1)} / ${pad(photos.length)}`;
  }

  function playLightboxVideo() {
    if (!lightboxVideo || lightboxVideo.hidden) return;
    const attempt = lightboxVideo.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        /* autoplay blocked — the native controls are still there */
      });
    }
  }

  function stopLightboxVideo() {
    if (lightboxVideo && !lightboxVideo.hidden) lightboxVideo.pause();
  }

  function stepLightbox(direction) {
    lightboxIndex = (lightboxIndex + direction + photos.length) % photos.length;
    renderLightbox();
    if (lightbox.open) playLightboxVideo();
  }

  function openLightbox(index) {
    lightboxIndex = index;
    renderLightbox();
    document.documentElement.classList.add("has-lightbox");
    if (typeof lightbox.showModal === "function") {
      if (!lightbox.open) lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
    if (lightboxClose) lightboxClose.focus({ preventScroll: true });
    playLightboxVideo();
  }

  function closeLightbox() {
    stopLightboxVideo();
    if (typeof lightbox.close === "function" && lightbox.open) {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
      document.documentElement.classList.remove("has-lightbox");
    }
  }

  build();

  track.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      syncActive();
      scrollTicking = false;
    });
  }, { passive: true });

  const prevButton = document.querySelector("[data-reel-prev]");
  const nextButton = document.querySelector("[data-reel-next]");
  if (prevButton) prevButton.addEventListener("click", () => scrollByCards(-1));
  if (nextButton) nextButton.addEventListener("click", () => scrollByCards(1));

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCards(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCards(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      scrollToIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      scrollToIndex(photos.length - 1);
    }
  });

  track.addEventListener("click", (event) => {
    if (Date.now() - dragEndedAt < 320) return;
    const card = event.target.closest(".polaroid");
    if (!card) return;
    openLightbox(Number(card.dataset.index));
  });

  // Mouse drag. Touch devices use native horizontal scrolling.
  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragStartX = event.clientX;
    dragStartScroll = track.scrollLeft;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) > 4) dragMoved = true;
    track.scrollLeft = dragStartScroll - distance;
  });

  function endDrag(event) {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    if (dragMoved) dragEndedAt = Date.now();
    if (event && track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener("click", () => stepLightbox(1));

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  lightbox.addEventListener("keydown", (event) => {
    if (event.target === lightboxVideo) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepLightbox(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepLightbox(1);
    }
  });

  lightbox.addEventListener("close", () => {
    stopLightboxVideo();
    document.documentElement.classList.remove("has-lightbox");
  });
})();
