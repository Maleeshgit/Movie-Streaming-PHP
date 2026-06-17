// ===== CONFIGURATION =====
const TMDB_API_KEY = "3fd2be6f0c70a2a598f084ddfb75487c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

// ===== STATE MANAGEMENT =====
let state = {
    currentPage: 1,
    totalPages: 1,
    currentCategory: 'trending',
    searchQuery: '',
    selectedGenre: '',
    selectedRating: '',
    selectedYear: '',
    sortBy: 'popularity.desc',
    favorites: [],
    watchHistory: [],
    genres: [],
    allYears: [],
    isAuthenticated: !!localStorage.getItem('jwt_token'),
    userId: localStorage.getItem('user_id'),
    username: localStorage.getItem('username'),
    jwtToken: localStorage.getItem('jwt_token'),
};

// ===== ELEMENTS =====
const elements = {
    moviesGrid: document.getElementById('moviesGrid'),
    loading: document.getElementById('loading'),
    pagination: document.getElementById('pagination'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageNumber: document.getElementById('pageNumber'),
    totalPages: document.getElementById('totalPages'),
    searchInput: document.getElementById('searchInput'),
    movieModal: document.getElementById('movieModal'),
    modalOverlay: document.getElementById('modalOverlay'),
    closeModal: document.getElementById('closeModal'),
    modalContent: document.getElementById('movieModal').querySelector('.modal-content'),
    genreFilter: document.getElementById('genreFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    yearFilter: document.getElementById('yearFilter'),
    sortFilter: document.getElementById('sortFilter'),
    resetBtn: document.getElementById('resetBtn'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    favoritesModal: document.getElementById('favoritesModal'),
    closeFavoritesModal: document.getElementById('closeFavoritesModal'),
    favoritesList: document.getElementById('favoritesList'),
    favoritesOverlay: document.getElementById('favoritesOverlay'),
    hero: document.getElementById('hero'),
    heroTitle: document.getElementById('heroTitle'),
    heroDescription: document.getElementById('heroDescription'),
    heroRating: document.getElementById('heroRating'),
    heroYear: document.getElementById('heroYear'),
    heroGenre: document.getElementById('heroGenre'),
    videoModal: document.getElementById('videoModal'),
    videoOverlay: document.getElementById('videoOverlay'),
    closeVideoModal: document.getElementById('closeVideoModal'),
    videoPlayer: document.getElementById('videoPlayer'),
};

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadGenres();
    await loadYears();
    setupEventListeners();
    updateFavoriteCount();
    updateAuthUI();
    if (state.isAuthenticated) {
        await loadWatchlistFromServer();
        await loadWatchHistoryFromServer();
    }
    await loadMovies();
});

function setupEventListeners() {
    // CinemaHub Logo click - reset to default state
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            state.selectedGenre = '';
            state.selectedRating = '';
            state.selectedYear = '';
            state.sortBy = 'popularity.desc';
            state.searchQuery = '';
            elements.genreFilter.value = '';
            elements.ratingFilter.value = '';
            elements.yearFilter.value = '';
            elements.sortFilter.value = 'popularity.desc';
            elements.searchInput.value = '';
            state.currentPage = 1;
            loadMovies();
        });
    }

    // Scroll buttons for rows
    document.querySelectorAll('.scroll-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.dataset.target;
            const scrollContainer = document.getElementById(targetId);
            if (scrollContainer) {
                const scrollAmount = 400;
                if (btn.classList.contains('prev-scroll')) {
                    scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                } else {
                    scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            }
        });
    });

    // Search
    elements.searchInput.addEventListener('input', debounce(() => {
        state.searchQuery = elements.searchInput.value;
        state.currentPage = 1;
        loadMovies();
    }, 500));

    // Filters
    elements.genreFilter.addEventListener('change', () => {
        state.selectedGenre = elements.genreFilter.value;
        state.currentPage = 1;
        loadMovies();
    });

    elements.ratingFilter.addEventListener('change', () => {
        state.selectedRating = elements.ratingFilter.value;
        state.currentPage = 1;
        loadMovies();
    });

    elements.yearFilter.addEventListener('change', () => {
        state.selectedYear = elements.yearFilter.value;
        state.currentPage = 1;
        loadMovies();
    });

    elements.sortFilter.addEventListener('change', () => {
        state.sortBy = elements.sortFilter.value;
        state.currentPage = 1;
        loadMovies();
    });

    // Reset filters
    elements.resetBtn.addEventListener('click', () => {
        state.selectedGenre = '';
        state.selectedRating = '';
        state.selectedYear = '';
        state.sortBy = 'popularity.desc';
        state.searchQuery = '';
        elements.genreFilter.value = '';
        elements.ratingFilter.value = '';
        elements.yearFilter.value = '';
        elements.sortFilter.value = 'popularity.desc';
        elements.searchInput.value = '';
        state.currentPage = 1;
        loadMovies();
    });

    // Pagination
    elements.prevBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadMovies();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    elements.nextBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            loadMovies();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Modal
    elements.closeModal.addEventListener('click', () => {
        elements.movieModal.classList.remove('active');
    });

    elements.modalOverlay.addEventListener('click', () => {
        elements.movieModal.classList.remove('active');
    });

    elements.modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Favorites
    elements.favoriteBtn.addEventListener('click', () => {
        if (!state.isAuthenticated) {
            alert('Please login to view your favorites!');
            document.getElementById('loginModal').classList.add('active');
            return;
        }
        elements.favoritesModal.classList.add('active');
        displayFavorites();
    });

    elements.closeFavoritesModal.addEventListener('click', () => {
        elements.favoritesModal.classList.remove('active');
    });

    elements.favoritesOverlay.addEventListener('click', () => {
        elements.favoritesModal.classList.remove('active');
    });

    if (elements.closeVideoModal) {
        elements.closeVideoModal.addEventListener('click', () => {
            closeVideoPlayer();
        });
    }

    if (elements.videoOverlay) {
        elements.videoOverlay.addEventListener('click', () => {
            closeVideoPlayer();
        });
    }

    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) {
            elements.movieModal.classList.remove('active');
        }
        if (e.target === elements.favoritesOverlay) {
            elements.favoritesModal.classList.remove('active');
        }
        if (e.target === elements.videoOverlay) {
            closeVideoPlayer();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.movieModal.classList.remove('active');
            elements.favoritesModal.classList.remove('active');
            closeVideoPlayer();
            document.getElementById('loginModal').classList.remove('active');
            document.getElementById('registerModal').classList.remove('active');
        }
    });

    // Authentication buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeLoginModal = document.getElementById('closeLoginModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const loginOverlay = document.getElementById('loginOverlay');
    const registerOverlay = document.getElementById('registerOverlay');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            loginModal.classList.add('active');
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            registerModal.classList.add('active');
        });
    }

    if (closeLoginModal) {
        closeLoginModal.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
    }

    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => {
            registerModal.classList.remove('active');
        });
    }

    if (loginOverlay) {
        loginOverlay.addEventListener('click', () => {
            loginModal.classList.remove('active');
        });
    }

    if (registerOverlay) {
        registerOverlay.addEventListener('click', () => {
            registerModal.classList.remove('active');
        });
    }

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.remove('active');
            registerModal.classList.add('active');
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.classList.remove('active');
            loginModal.classList.add('active');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            updateAuthUI();
            updateFavoriteCount();
            alert('Logged out successfully!');
            loadMovies();
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');
            
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            const result = await login(username, password);
            if (result.success) {
                loginModal.classList.remove('active');
                updateAuthUI();
                loginForm.reset();
                alert('Login successful!');
                loadMovies();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const errorDiv = document.getElementById('registerError');
            
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            const result = await register(username, email, password);
            if (result.success) {
                registerModal.classList.remove('active');
                updateAuthUI();
                registerForm.reset();
                alert('Registration successful!');
                loadMovies();
            } else {
                errorDiv.textContent = result.message;
                errorDiv.style.display = 'block';
            }
        });
    }
}

// ===== API CALLS =====
function isSearchOrFilterActive() {
    return !!(state.searchQuery || state.selectedGenre || state.selectedRating || state.selectedYear || state.sortBy !== 'popularity.desc');
}

async function loadAllCategoryRows() {
    const verticalSections = document.getElementById('verticalSections');
    const discoverSection = document.getElementById('discoverSection');
    
    if (verticalSections) verticalSections.style.display = 'flex';
    if (discoverSection) discoverSection.style.display = 'none';
    
    const trendingScroll = document.getElementById('trendingScroll');
    const upcomingScroll = document.getElementById('upcomingScroll');
    const topRatedScroll = document.getElementById('topRatedScroll');
    const popularScroll = document.getElementById('popularScroll');
    const recommendationsRow = document.getElementById('recommendationsRow');
    const recommendationsScroll = document.getElementById('recommendationsScroll');

    if (trendingScroll) trendingScroll.innerHTML = '<p class="row-loading">Loading...</p>';
    if (upcomingScroll) upcomingScroll.innerHTML = '<p class="row-loading">Loading...</p>';
    if (topRatedScroll) topRatedScroll.innerHTML = '<p class="row-loading">Loading...</p>';
    if (popularScroll) popularScroll.innerHTML = '<p class="row-loading">Loading...</p>';
    
    if (state.isAuthenticated) {
        if (recommendationsRow) recommendationsRow.style.display = 'block';
        if (recommendationsScroll) recommendationsScroll.innerHTML = '<p class="row-loading">Loading...</p>';
    } else {
        if (recommendationsRow) recommendationsRow.style.display = 'none';
    }

    loadRowCategory('trending', 'trendingScroll');
    loadRowCategory('upcoming', 'upcomingScroll');
    loadRowCategory('top_rated', 'topRatedScroll');
    loadRowCategory('popular', 'popularScroll');
    if (state.isAuthenticated) {
        loadRowCategory('recommendations', 'recommendationsScroll');
    }
}

async function loadRowCategory(category, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        let url = '';
        if (category === 'trending') {
            url = `${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&page=1`;
        } else if (category === 'upcoming') {
            url = `${TMDB_BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}&page=1`;
        } else if (category === 'top_rated') {
            url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&page=1`;
        } else if (category === 'popular') {
            url = `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=1`;
        } else if (category === 'recommendations') {
            if (state.isAuthenticated) {
                if (state.watchHistory && state.watchHistory.length > 0) {
                    // Fetch recommendations based on the user's latest watched movie
                    const latestWatched = state.watchHistory[0];
                    url = `${TMDB_BASE_URL}/movie/${latestWatched.id}/recommendations?api_key=${TMDB_API_KEY}&page=1`;
                } else if (state.favorites && state.favorites.length > 0) {
                    // Fallback to random favorite movie if no watch history exists yet
                    const randomFav = state.favorites[Math.floor(Math.random() * state.favorites.length)];
                    url = `${TMDB_BASE_URL}/movie/${randomFav.id}/recommendations?api_key=${TMDB_API_KEY}&page=1`;
                } else {
                    container.innerHTML = '<p class="row-empty">Watch movies or add to favorites to get recommendations!</p>';
                    return;
                }
            } else {
                container.innerHTML = '<p class="row-empty">Log in and watch movies to get recommendations!</p>';
                return;
            }
        }

        const response = await fetch(url);
        const data = await response.json();

        container.innerHTML = '';

        if (!data.results || data.results.length === 0) {
            container.innerHTML = '<p class="row-empty">No movies found.</p>';
        } else {
            data.results.forEach((movie) => {
                if (movie.poster_path) {
                    const movieCard = createMovieCard(movie);
                    container.appendChild(movieCard);
                }
            });
            
            // Set hero movie from trending if it is loaded
            if (category === 'trending' && data.results[0]) {
                setHeroMovie(data.results[0]);
            }
        }
    } catch (error) {
        console.error(`Error loading category ${category}:`, error);
        container.innerHTML = '<p class="row-error">Failed to load movies.</p>';
    }
}

async function loadMovies() {
    if (!isSearchOrFilterActive()) {
        await loadAllCategoryRows();
        return;
    }

    try {
        const discoverSection = document.getElementById('discoverSection');
        const verticalSections = document.getElementById('verticalSections');
        
        if (discoverSection) discoverSection.style.display = 'block';
        if (verticalSections) verticalSections.style.display = 'none';

        elements.loading.classList.add('active');
        elements.moviesGrid.innerHTML = '';

        let url = '';
        
        if (state.searchQuery) {
            url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(state.searchQuery)}&page=${state.currentPage}`;
            const discoverTitle = document.getElementById('discoverTitle');
            if (discoverTitle) discoverTitle.textContent = `Search Results for "${state.searchQuery}"`;
        } else {
            const discoverTitle = document.getElementById('discoverTitle');
            if (discoverTitle) discoverTitle.textContent = 'Discover Movies';

            let params = [];
            params.push(`api_key=${TMDB_API_KEY}`);
            params.push(`page=${state.currentPage}`);
            
            if (state.selectedGenre) {
                params.push(`with_genres=${state.selectedGenre}`);
            }
            if (state.selectedRating) {
                params.push(`vote_average.gte=${state.selectedRating}`);
            }
            if (state.selectedYear) {
                params.push(`primary_release_year=${state.selectedYear}`);
            }
            
            // Map sorting parameter
            let tmdbSort = 'popularity.desc';
            if (state.sortBy === 'vote_average.desc') {
                tmdbSort = 'vote_average.desc';
                params.push(`vote_count.gte=100`);
            } else if (state.sortBy === 'release_date.desc') {
                tmdbSort = 'release_date.desc';
            } else if (state.sortBy === 'release_date.asc') {
                tmdbSort = 'release_date.asc';
            } else if (state.sortBy === 'title.asc') {
                tmdbSort = 'original_title.asc';
            }
            params.push(`sort_by=${tmdbSort}`);
            
            url = `${TMDB_BASE_URL}/discover/movie?${params.join('&')}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            elements.moviesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No movies found. Try adjusting your filters.</p>';
        } else {
            // Apply filtering in memory if searching by text as TMDB search endpoint doesn't support them.
            let filteredResults = data.results;
            if (state.searchQuery) {
                if (state.selectedGenre) {
                    const genreId = parseInt(state.selectedGenre);
                    filteredResults = filteredResults.filter(movie => movie.genre_ids && movie.genre_ids.includes(genreId));
                }
                if (state.selectedRating) {
                    const minRating = parseFloat(state.selectedRating);
                    filteredResults = filteredResults.filter(movie => movie.vote_average >= minRating);
                }
                if (state.selectedYear) {
                    const yearStr = state.selectedYear;
                    filteredResults = filteredResults.filter(movie => movie.release_date && movie.release_date.startsWith(yearStr));
                }
                
                // Sort in memory if search query is active
                if (state.sortBy === 'vote_average.desc') {
                    filteredResults.sort((a, b) => b.vote_average - a.vote_average);
                } else if (state.sortBy === 'release_date.desc') {
                    filteredResults.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
                } else if (state.sortBy === 'release_date.asc') {
                    filteredResults.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
                } else if (state.sortBy === 'title.asc') {
                    filteredResults.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
                }
            }

            if (filteredResults.length === 0) {
                elements.moviesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No movies matched your filter criteria.</p>';
            } else {
                filteredResults.forEach((movie) => {
                    if (movie.poster_path) {
                        const movieCard = createMovieCard(movie);
                        elements.moviesGrid.appendChild(movieCard);
                    }
                });
            }
        }

        state.totalPages = data.total_pages > 500 ? 500 : data.total_pages;
        updatePagination();

        elements.loading.classList.remove('active');
    } catch (error) {
        console.error('Error loading movies:', error);
        elements.loading.classList.remove('active');
        elements.moviesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff6b6b;">Failed to load movies. Please try again.</p>';
    }
}

async function loadGenres() {
    try {
        const response = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}`);
        const data = await response.json();
        state.genres = data.genres || [];

        // Populate genre filter
        (state.genres || []).forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.id;
            option.textContent = genre.name;
            elements.genreFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

async function loadYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1980; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        elements.yearFilter.appendChild(option);
    }
}

async function getMovieDetails(movieId) {
    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching movie details:', error);
    }
}

// ===== AUTHENTICATION =====
async function login(username, password) {
    try {
        const response = await fetch('index.php?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: 'Server error: ' + (text || response.statusText) };
        }
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('jwt_token', result.token);
            localStorage.setItem('user_id', result.username);
            localStorage.setItem('username', result.username);
            
            state.isAuthenticated = true;
            state.jwtToken = result.token;
            state.userId = result.username;
            state.username = result.username;
            
            await loadWatchlistFromServer();
            await loadWatchHistoryFromServer();
            return { success: true, message: 'Login successful' };
        } else {
            return { success: false, message: result.message };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Login failed: ' + error.message };
    }
}

async function register(username, email, password) {
    // 1. Email format validation on frontend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email address format (e.g. user@example.com).' };
    }

    // 2. Password format validation on frontend (Min 8 chars, 1 letter, 1 number)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        return { success: false, message: 'Password must be at least 8 characters long and contain both letters and numbers.' };
    }

    try {
        const response = await fetch('index.php?action=register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        if (!response.ok) {
            const text = await response.text();
            return { success: false, message: 'Server error: ' + (text || response.statusText) };
        }
        
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('jwt_token', result.token);
            localStorage.setItem('user_id', result.username);
            localStorage.setItem('username', result.username);
            
            state.isAuthenticated = true;
            state.jwtToken = result.token;
            state.userId = result.username;
            state.username = result.username;
            
            state.favorites = [];
            state.watchHistory = [];
            updateFavoriteCount();
            
            return { success: true, message: 'Registration successful' };
        } else {
            return { success: false, message: result.message };
        }
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, message: 'Registration failed: ' + error.message };
    }
}

function logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    
    state.isAuthenticated = false;
    state.jwtToken = null;
    state.userId = null;
    state.username = null;
    state.favorites = [];
    state.watchHistory = [];
    
    fetch('index.php?action=logout');
}

async function loadWatchlistFromServer() {
    if (!state.isAuthenticated) return;
    
    try {
        const response = await fetch('index.php?action=get_favorites');
        const result = await response.json();
        if (result.success) {
            state.favorites = result.favorites || [];
            updateFavoriteCount();
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
    }
}

async function loadWatchHistoryFromServer() {
    if (!state.isAuthenticated) return;
    
    try {
        const response = await fetch('index.php?action=get_watch_history');
        const result = await response.json();
        if (result.success) {
            state.watchHistory = result.watchHistory || [];
        }
    } catch (error) {
        console.error('Error loading watch history:', error);
    }
}

function updateAuthUI() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userGreeting = document.getElementById('userGreeting');
    const favoriteBtn = elements.favoriteBtn || document.getElementById('favoriteBtn');
    const playBtn = document.getElementById('playBtn');
    const modalPlayBtn = document.getElementById('modalPlayBtn');

    const watchBtnText = state.isAuthenticated ? 
        `<i class="fas fa-play"></i> Watch Movie` : 
        `<i class="fas fa-play"></i> Watch Trailer`;

    if (playBtn) playBtn.innerHTML = watchBtnText;
    if (modalPlayBtn) modalPlayBtn.innerHTML = watchBtnText;

    if (state.isAuthenticated) {
        if (authButtons) authButtons.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            if (userGreeting) userGreeting.textContent = `Welcome, ${state.username}!`;
        }
        if (favoriteBtn) favoriteBtn.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
        if (favoriteBtn) favoriteBtn.style.display = 'none';
    }
}

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== UI CREATION =====
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/220x330?text=No+Image';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

    const isFavorite = state.favorites.some(fav => fav.id === movie.id);
    const watchText = state.isAuthenticated ? 'Watch Movie' : 'Watch Trailer';

    card.innerHTML = `
        <div class="movie-poster">
            <img src="${posterUrl}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/220x330?text=No+Image'">
            <div class="movie-overlay">
                <div class="overlay-buttons">
                    <button class="overlay-btn play-btn" title="${watchText}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="overlay-btn favorite-card-btn" title="Add to Favorites">
                        <i class="fas fa-${isFavorite ? 'bookmark' : 'bookmark'}"></i>
                    </button>
                    <button class="overlay-btn info-btn" title="More Info">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-meta">
                <span class="movie-rating">
                    <i class="fas fa-star"></i> ${rating}
                </span>
                <span>${year}</span>
            </div>
            <button class="movie-badge watch-now-btn">${watchText}</button>
        </div>
    `;

    // Event listeners
    card.querySelector('.info-btn').addEventListener('click', () => showMovieDetails(movie.id));
    card.querySelector('.play-btn').addEventListener('click', () => watchMovie(movie));
    card.querySelector('.watch-now-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        watchMovie(movie);
    });
    card.querySelector('.favorite-card-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(movie);
        updateFavoriteButton(card, movie);
    });

    return card;
}

function updateFavoriteButton(card, movie) {
    const isFavorite = state.favorites.some(fav => Number(fav.id) === Number(movie.id));
    const btn = card.querySelector('.favorite-card-btn');
    btn.innerHTML = `<i class="fas fa-${isFavorite ? 'bookmark' : 'bookmark'}"></i>`;
}

async function showMovieDetails(movieId) {
    try {
        const movie = await getMovieDetails(movieId);

        // Fill modal
        document.getElementById('modalTitle').textContent = movie.title;
        document.getElementById('modalDescription').textContent = movie.overview;
        document.getElementById('modalYear').textContent = new Date(movie.release_date).getFullYear();
        document.getElementById('modalDuration').textContent = movie.runtime ? `${movie.runtime} min` : 'N/A';
        document.getElementById('modalRating').textContent = `${movie.vote_average.toFixed(1)}/10`;
        document.getElementById('modalRatingPercent').textContent = `${Math.round(movie.vote_average * 10)}%`;
        document.getElementById('modalPopularityPercent').textContent = `${Math.round(Math.min(movie.popularity, 100))}%`;

        // Rating bar
        const ratingWidth = (movie.vote_average / 10) * 100;
        document.getElementById('modalRatingBar').style.width = `${ratingWidth}%`;

        // Popularity bar
        const popularityWidth = Math.min(movie.popularity, 100);
        document.getElementById('modalPopularityBar').style.width = `${popularityWidth}%`;

        // Poster
        const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image';
        document.getElementById('modalPoster').src = posterUrl;

        // Genres
        const genresHtml = movie.genres.map(genre => `<span class="genre-tag">${genre.name}</span>`).join('');
        document.getElementById('modalGenres').innerHTML = genresHtml;

        // Cast
        const castHtml = movie.credits.cast.slice(0, 8).map(actor => `
            <div class="cast-member">
                <img src="${actor.profile_path ? `${IMG_URL}${actor.profile_path}` : 'https://via.placeholder.com/70x100?text=No+Image'}" 
                     alt="${actor.name}" class="cast-avatar" onerror="this.src='https://via.placeholder.com/70x100?text=No+Image'">
                <p class="cast-name">${actor.name}</p>
            </div>
        `).join('');

        const castSection = document.getElementById('modalCast');
        if (castHtml) {
            castSection.innerHTML = `<div class="cast-title">Cast</div><div class="cast-list">${castHtml}</div>`;
        } else {
            castSection.innerHTML = '';
        }

        // Buttons
        document.getElementById('modalPlayBtn').onclick = () => watchMovie(movie);
        
        const isFavorite = state.favorites.some(fav => Number(fav.id) === Number(movie.id));
        document.getElementById('modalFavoriteBtn').textContent = isFavorite ? '✓ In Favorites' : '+ Add to Favorites';
        document.getElementById('modalFavoriteBtn').onclick = () => {
            toggleFavorite(movie);
            document.getElementById('modalFavoriteBtn').textContent = state.favorites.some(fav => Number(fav.id) === Number(movie.id)) ? '✓ In Favorites' : '+ Add to Favorites';
            updateFavoriteCount();
        };

        elements.movieModal.classList.add('active');
    } catch (error) {
        console.error('Error showing movie details:', error);
    }
}

function setHeroMovie(movie) {
    const backdropUrl = movie.backdrop_path ? `${BACKDROP_URL}${movie.backdrop_path}` : '';
    elements.hero.style.backgroundImage = `linear-gradient(135deg, rgba(34, 31, 31, 0.9) 0%, rgba(229, 9, 20, 0.2) 100%), url('${backdropUrl}')`;
    elements.heroTitle.textContent = movie.title;
    elements.heroDescription.textContent = movie.overview.substring(0, 150) + '...';
    elements.heroRating.textContent = `${movie.vote_average.toFixed(1)}/10`;
    elements.heroYear.textContent = new Date(movie.release_date).getFullYear();

    // Get genres
    if (state.genres.length > 0 && movie.genre_ids) {
        const genreNames = movie.genre_ids
            .map(id => state.genres.find(g => g.id === id)?.name)
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
        elements.heroGenre.textContent = genreNames || 'N/A';
    }

    document.getElementById('playBtn').onclick = () => watchMovie(movie);
    document.getElementById('infoBtn').onclick = () => showMovieDetails(movie.id);
}

async function watchMovie(movie) {
    const movieId = (movie && movie.id) ? movie.id : movie;
    try {
        elements.loading.classList.add('active');
        const details = await getMovieDetails(movieId);
        elements.loading.classList.remove('active');
        
        if (state.isAuthenticated) {
            // User is logged in -> redirect to streaming link
            if (details && details.imdb_id) {
                // Save to watch history in DB
                try {
                    await fetch('index.php?action=add_watch_history', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            movie_id: details.id,
                            title: details.title,
                            poster_path: details.poster_path,
                            vote_average: details.vote_average,
                            release_date: details.release_date
                        })
                    });
                    await loadWatchHistoryFromServer();
                } catch (historyErr) {
                    console.error('Failed to save watch history:', historyErr);
                }

                const redirectUrl = `https://www.playimdb.com/title/${details.imdb_id}/`;
                window.location.href = redirectUrl;
            } else {
                alert('Sorry, no IMDb streaming link is available for this movie!');
            }
        } else {
            // User is not logged in -> play trailer as a fallback
            let videoKey = null;
            if (details && details.videos && details.videos.results) {
                const trailer = details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
                if (trailer) {
                    videoKey = trailer.key;
                } else if (details.videos.results.length > 0) {
                    const anyYoutube = details.videos.results.find(v => v.site === 'YouTube');
                    if (anyYoutube) videoKey = anyYoutube.key;
                }
            }
            
            if (videoKey) {
                if (elements.videoPlayer && elements.videoModal) {
                    elements.videoPlayer.src = `https://www.youtube.com/embed/${videoKey}?autoplay=1`;
                    elements.videoModal.classList.add('active');
                }
            } else {
                alert('Please register or login to watch this movie! (No trailer video is available either)');
            }
        }
    } catch (error) {
        console.error('Error handling movie watch/trailer action:', error);
        elements.loading.classList.remove('active');
        alert('Failed to load movie details.');
    }
}

function closeVideoPlayer() {
    if (elements.videoModal) {
        elements.videoModal.classList.remove('active');
    }
    if (elements.videoPlayer) {
        elements.videoPlayer.src = '';
    }
}

function playTrailer(movie) {
    watchMovie(movie);
}

function updatePagination() {
    elements.pageNumber.textContent = state.currentPage;
    elements.totalPages.textContent = state.totalPages;
    elements.prevBtn.disabled = state.currentPage === 1;
    elements.nextBtn.disabled = state.currentPage === state.totalPages;
}

function toggleFavorite(movie) {
    if (!state.isAuthenticated) {
        alert('Please login to add movies to your favorites!');
        document.getElementById('loginModal').classList.add('active');
        return;
    }

    const index = state.favorites.findIndex(fav => Number(fav.id) === Number(movie.id));
    if (index > -1) {
        removeFromWatchlist(movie.id);
    } else {
        addToWatchlist(movie);
    }
}

async function addToWatchlist(movie) {
    if (!state.isAuthenticated) return;
    try {
        const movieItem = {
            movie_id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            vote_average: movie.vote_average,
            release_date: movie.release_date
        };
        const response = await fetch('index.php?action=add_favorite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(movieItem)
        });
        const result = await response.json();
        if (result.success) {
            movieItem.id = movie.id; // align property name with UI matching
            state.favorites.push(movieItem);
            updateFavoriteCount();
        } else {
            console.error('Failed to add favorite to database:', result.message);
        }
    } catch (error) {
        console.error('Error adding to watchlist:', error);
    }
}

async function removeFromWatchlist(movieId) {
    if (!state.isAuthenticated) return;
    try {
        const response = await fetch('index.php?action=remove_favorite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ movie_id: movieId })
        });
        const result = await response.json();
        if (result.success) {
            state.favorites = state.favorites.filter(fav => Number(fav.id) !== Number(movieId));
            updateFavoriteCount();
        } else {
            console.error('Failed to remove favorite from database:', result.message);
        }
    } catch (error) {
        console.error('Error removing from watchlist:', error);
    }
}

function updateFavoriteCount() {
    document.getElementById('favoriteCount').textContent = state.favorites.length;
}

function displayFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesList.innerHTML = '<p class="empty-message">No favorites yet. Add your favorite movies!</p>';
        return;
    }

    const favoritesHtml = state.favorites.map(movie => {
        const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/220x330?text=No+Image';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

        return `
            <div class="movie-card">
                <div class="movie-poster">
                    <img src="${posterUrl}" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/220x330?text=No+Image'">
                    <div class="movie-overlay">
                        <div class="overlay-buttons">
                            <button class="overlay-btn" onclick="removeFavorite(${movie.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="overlay-btn" onclick="showMovieDetails(${movie.id})">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="movie-rating">
                            <i class="fas fa-star"></i> ${rating}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    elements.favoritesList.innerHTML = favoritesHtml;
}

async function removeFavorite(movieId) {
    if (state.isAuthenticated) {
        await removeFromWatchlist(movieId);
        displayFavorites();
    }
}

// ===== UTILITIES =====
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// ===== ERROR HANDLING =====
window.addEventListener('error', (error) => {
    console.error('Global error:', error);
});

// Allow these functions to be called from HTML
window.showMovieDetails = showMovieDetails;
window.playTrailer = playTrailer;
window.removeFavorite = removeFavorite;
