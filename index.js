/* ===================================================
                    DOM ELEMENTS
=================================================== */

const questionView = document.getElementById("questionView");
const loadingView = document.getElementById("loadingView");
const resultView = document.getElementById("resultView");

const favoriteMovie = document.getElementById("favoriteMovie");
const movieEra = document.getElementById("movieEra");
const movieMood = document.getElementById("movieMood");

const recommendBtn = document.getElementById("recommendBtn");
const restartBtn = document.getElementById("restartBtn");

const carousel = document.getElementById("carousel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

let currentIndex = 0;

/* ===================================================
                    SCREEN CONTROL
=================================================== */

const sky = document.getElementById("sky");

for (let i = 0; i < 150; i++) {
  const star = document.createElement("div");
  star.classList.add("star");
  if (Math.random() > 0.85) {
    star.classList.add("large");
  }

  const size = Math.random() * 3 + 1;
  star.style.width = size + "px";
  star.style.height = size + "px";
  star.style.left = Math.random() * 100 + "vw";
  star.style.top = Math.random() * 100 + "vh";
  star.style.animationDuration = 2 + Math.random() * 5 + "s";
  star.style.animationDelay = Math.random() * 5 + "s";
  sky.appendChild(star);
}

function shootingStar() {
  const star = document.createElement("div");
  star.className = "shooting-star";
  star.style.top = Math.random() * 40 + "vh";
  star.style.left = "-250px";
  document.body.appendChild(star);
  star.animate(
    [
      {
        transform: "translate(0,0) rotate(-25deg)",
        opacity: 0,
      },

      {
        opacity: 1,
        offset: 0.08,
      },

      {
        transform: "translate(1700px,700px) rotate(-25deg)",
        opacity: 0,
      },
    ],

    {
      duration: 2200,
      easing: "ease-out",
    },
  );
  setTimeout(() => star.remove(), 2300);
}

setInterval(shootingStar, 8000 + Math.random() * 7000);

function showQuestions() {
  questionView.classList.remove("hidden");
  loadingView.classList.add("hidden");
  resultView.classList.add("hidden");
}

function showLoading() {
  questionView.classList.add("hidden");
  loadingView.classList.remove("hidden");
  resultView.classList.add("hidden");
}

function showResults() {
  questionView.classList.add("hidden");
  loadingView.classList.add("hidden");
  resultView.classList.remove("hidden");
}

/* ===================================================
                    UTILITIES
=================================================== */

function clearInputs() {
  favoriteMovie.value = "";
  movieEra.value = "";
  movieMood.value = "";
}

/* ===================================================
                CALL BACKEND API
=================================================== */

async function getRecommendation() {
  try {
    showLoading();
    recommendBtn.disabled = true;

    const response = await fetch("/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favoriteMovie: favoriteMovie.value.trim(),
        movieEra: movieEra.value.trim(),
        movieMood: movieMood.value.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Server error");
    }

    const data = await response.json();

    if (!data.movies) {
      throw new Error("No movies returned");
    }

    displayRecommendations(data.movies);
  } catch (err) {
    console.error(err);
    showQuestions();
    alert(err.message || "Something went wrong");
  } finally {
    recommendBtn.disabled = false;
  }
}

/* ===================================================
            DISPLAY RECOMMENDATION
=================================================== */

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    updateCarousel();
  }
});

nextBtn.addEventListener("click", () => {
  const maxIndex = carousel.children.length - 1;

  if (currentIndex < maxIndex) {
    currentIndex++;
    updateCarousel();
  }
});

function updateCarousel() {
  const firstCard = carousel.children[0];
  if (!firstCard) return;
  const cardWidth = firstCard.offsetWidth;
  carousel.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

  prevBtn.disabled = currentIndex === 0;

  nextBtn.disabled = currentIndex === carousel.children.length - 1;
}

function displayRecommendations(movies) {
  if (!movies || !Array.isArray(movies)) {
    console.error("Invalid movies:", movies);
    showQuestions();
    return;
  }

  carousel.innerHTML = "";

  movies.forEach((movie) => {
    const card = document.createElement("div");
    card.className = "card";
    const hasPoster = movie.poster && movie.poster.trim() !== "";
    const posterHTML = hasPoster
      ? `
            <img
                src="${movie.poster}"
                alt="${movie.title}"
                class="movie-poster"
                onerror="this.remove()"
            />
        `
      : "";

    card.innerHTML = `
        ${posterHTML}

        <div class="card-content">
            <h3>${movie.title} (${movie.year})</h3>
            <p>${movie.description}</p>
        </div>
    `;

    carousel.appendChild(card);
  });

  currentIndex = 0;
  updateCarousel();

  showResults();
}

/* ===================================================
                RESTART
=================================================== */

function restartApp() {
  clearInputs();

  const carousel = document.getElementById("carousel");
  if (carousel) carousel.innerHTML = "";

  showQuestions();
}

/* ===================================================
            EVENT LISTENERS
=================================================== */

recommendBtn.addEventListener("click", getRecommendation);

restartBtn.addEventListener("click", restartApp);

/* ===================================================
                INITIALIZATION
=================================================== */

showQuestions();
