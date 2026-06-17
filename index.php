<?php
session_start();

// Silent Database Auto-initialization
$host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'cinemahub';
$db_error = null;

try {
    // Connect to MySQL server first without database to check/create it
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
    
    // Connect to the database
    $pdo->exec("USE `$db_name`");
    
    // Create users table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `email` VARCHAR(100) NOT NULL UNIQUE,
        `password` VARCHAR(255) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Create favorites table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `favorites` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `movie_id` INT NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `poster_path` VARCHAR(255),
        `vote_average` DECIMAL(3,1),
        `release_date` VARCHAR(50),
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `user_movie` (`user_id`, `movie_id`),
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Create watch_history table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS `watch_history` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `user_id` INT NOT NULL,
        `movie_id` INT NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `poster_path` VARCHAR(255),
        `vote_average` DECIMAL(3,1),
        `release_date` VARCHAR(50),
        `watched_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY `user_watch` (`user_id`, `movie_id`),
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

} catch (PDOException $e) {
    $db_error = $e->getMessage();
}

// API Endpoint Actions
if (isset($_GET['action'])) {
    header('Content-Type: application/json');
    if ($db_error) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $db_error]);
        exit;
    }

    $inputData = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'];

    if ($action === 'register') {
        $username = trim($inputData['username'] ?? '');
        $email = trim($inputData['email'] ?? '');
        $password = $inputData['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            exit;
        }

        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email address format.']);
            exit;
        }

        // Validate password format (At least 8 characters, at least one letter, at least one number)
        if (!preg_match('/^(?=.*[A-Za-z])(?=.*\d).{8,}$/', $password)) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long and contain both letters and numbers.']);
            exit;
        }

        try {
            // Check duplicate username or email
            $stmt = $pdo->prepare("SELECT id, username, email FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)");
            $stmt->execute([$username, $email]);
            $existing = $stmt->fetch();

            if ($existing) {
                if (strtolower($existing['username']) === strtolower($username)) {
                    echo json_encode(['success' => false, 'message' => 'Username is already taken.']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Email is already registered.']);
                }
                exit;
            }

            // Secure password hash
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Insert user into DB
            $insertStmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $insertStmt->execute([$username, $email, $hashedPassword]);
            
            $userId = $pdo->lastInsertId();
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $username;

            // Create mock session token
            $token = bin2hex(random_bytes(16));

            echo json_encode([
                'success' => true,
                'message' => 'Registration successful.',
                'username' => $username,
                'token' => $token
            ]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error during registration: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'login') {
        $username = trim($inputData['username'] ?? '');
        $password = $inputData['password'] ?? '';

        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Username and password are required.']);
            exit;
        }

        try {
            // Fetch user by username
            $stmt = $pdo->prepare("SELECT id, username, password FROM users WHERE LOWER(username) = LOWER(?)");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                // Create mock session token
                $token = bin2hex(random_bytes(16));
                echo json_encode([
                    'success' => true,
                    'message' => 'Login successful.',
                    'username' => $user['username'],
                    'token' => $token
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Invalid username or password.']);
            }
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error during login: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'logout') {
        session_unset();
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Logged out successfully.']);
        exit;
    } elseif ($action === 'get_favorites') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT movie_id AS id, title, poster_path, vote_average, release_date FROM favorites WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$_SESSION['user_id']]);
            $favorites = $stmt->fetchAll();
            echo json_encode(['success' => true, 'favorites' => $favorites]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error fetching favorites: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'add_favorite') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
            exit;
        }
        $movie_id = intval($inputData['movie_id'] ?? 0);
        $title = trim($inputData['title'] ?? '');
        $poster_path = trim($inputData['poster_path'] ?? '');
        $vote_average = floatval($inputData['vote_average'] ?? 0);
        $release_date = trim($inputData['release_date'] ?? '');

        if ($movie_id <= 0 || empty($title)) {
            echo json_encode(['success' => false, 'message' => 'Invalid movie details.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO favorites (user_id, movie_id, title, poster_path, vote_average, release_date) 
                                   VALUES (?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE title = VALUES(title)");
            $stmt->execute([$_SESSION['user_id'], $movie_id, $title, $poster_path, $vote_average, $release_date]);
            echo json_encode(['success' => true, 'message' => 'Favorite added successfully.']);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error adding favorite: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'remove_favorite') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
            exit;
        }
        $movie_id = intval($inputData['movie_id'] ?? 0);

        if ($movie_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid movie ID.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND movie_id = ?");
            $stmt->execute([$_SESSION['user_id'], $movie_id]);
            echo json_encode(['success' => true, 'message' => 'Favorite removed successfully.']);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error removing favorite: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'add_watch_history') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
            exit;
        }
        $movie_id = intval($inputData['movie_id'] ?? 0);
        $title = trim($inputData['title'] ?? '');
        $poster_path = trim($inputData['poster_path'] ?? '');
        $vote_average = floatval($inputData['vote_average'] ?? 0);
        $release_date = trim($inputData['release_date'] ?? '');

        if ($movie_id <= 0 || empty($title)) {
            echo json_encode(['success' => false, 'message' => 'Invalid movie details.']);
            exit;
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO watch_history (user_id, movie_id, title, poster_path, vote_average, release_date) 
                                   VALUES (?, ?, ?, ?, ?, ?) 
                                   ON DUPLICATE KEY UPDATE watched_at = CURRENT_TIMESTAMP");
            $stmt->execute([$_SESSION['user_id'], $movie_id, $title, $poster_path, $vote_average, $release_date]);
            echo json_encode(['success' => true, 'message' => 'Watch history saved successfully.']);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error saving watch history: ' . $e->getMessage()]);
            exit;
        }
    } elseif ($action === 'get_watch_history') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
            exit;
        }
        try {
            $stmt = $pdo->prepare("SELECT movie_id AS id, title, poster_path, vote_average, release_date FROM watch_history WHERE user_id = ? ORDER BY watched_at DESC");
            $stmt->execute([$_SESSION['user_id']]);
            $history = $stmt->fetchAll();
            echo json_encode(['success' => true, 'watchHistory' => $history]);
            exit;
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error fetching watch history: ' . $e->getMessage()]);
            exit;
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid action.']);
        exit;
    }
}
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CinemaHub - Your Ultimate Movie Streaming Platform</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Navigation Bar -->
    <nav class="navbar">
        <div class="container">
            <div class="nav-wrapper">
                <div class="logo">
                    <i class="fas fa-film"></i>
                    <span>CinemaHub</span>
                </div>
                <div class="nav-right">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchInput" placeholder="Search movies...">
                    </div>
                    <button class="favorite-btn" id="favoriteBtn" style="display: none;">
                        <i class="fas fa-bookmark"></i>
                        <span id="favoriteCount">0</span>
                    </button>
                    <div class="auth-buttons" id="authButtons">
                        <button class="btn btn-small" id="loginBtn">
                            <i class="fas fa-sign-in-alt"></i> Login
                        </button>
                        <button class="btn btn-small btn-primary" id="registerBtn">
                            <i class="fas fa-user-plus"></i> Register
                        </button>
                    </div>
                    <div class="user-menu" id="userMenu" style="display: none;">
                        <span id="userGreeting">Welcome, User</span>
                        <button class="btn btn-small" id="logoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <div class="hero" id="hero">
        <div class="hero-content">
            <h1 id="heroTitle">Featured Movie</h1>
            <p id="heroDescription">Experience cinema like never before</p>
            <div class="hero-buttons">
                <button class="btn btn-primary" id="playBtn">
                    <i class="fas fa-play"></i> Watch Now
                </button>
                <button class="btn btn-secondary" id="infoBtn">
                    <i class="fas fa-info-circle"></i> More Info
                </button>
            </div>
            <div class="hero-stats">
                <div class="stat">
                    <span class="stat-label">Rating</span>
                    <span class="stat-value" id="heroRating">0/10</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Year</span>
                    <span class="stat-value" id="heroYear">-</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Genre</span>
                    <span class="stat-value" id="heroGenre">-</span>
                </div>
            </div>
        </div>
        <div class="hero-image" id="heroImage"></div>
    </div>

    <!-- Filters Section -->
    <div class="filters-container">
        <div class="container">
            <div class="filters">
                <div class="filter-group">
                    <label for="genreFilter">Genre:</label>
                    <select id="genreFilter">
                        <option value="">All Genres</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="ratingFilter">Rating:</label>
                    <select id="ratingFilter">
                        <option value="">All Ratings</option>
                        <option value="8">8+ Stars</option>
                        <option value="7">7+ Stars</option>
                        <option value="6">6+ Stars</option>
                        <option value="5">5+ Stars</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="yearFilter">Year:</label>
                    <select id="yearFilter">
                        <option value="">All Years</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="sortFilter">Sort By:</label>
                    <select id="sortFilter">
                        <option value="popularity.desc">Most Popular</option>
                        <option value="vote_average.desc">Highest Rated</option>
                        <option value="release_date.desc">Newest</option>
                        <option value="release_date.asc">Oldest</option>
                        <option value="title.asc">Title (A-Z)</option>
                    </select>
                </div>
                <button class="btn btn-reset" id="resetBtn">
                    <i class="fas fa-redo"></i> Reset
                </button>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <main class="container">
        <!-- Vertical Movie Sections (Rows) -->
        <div id="verticalSections" class="vertical-sections">
            <!-- Trending Row -->
            <section class="movie-row-section" id="trendingRow">
                <h2 class="row-title"><i class="fas fa-fire" style="color: var(--primary-color); margin-right: 8px;"></i>Trending</h2>
                <div class="row-container">
                    <button class="scroll-btn prev-scroll" data-target="trendingScroll" aria-label="Scroll Left"><i class="fas fa-chevron-left"></i></button>
                    <div class="movie-row-scroll" id="trendingScroll"></div>
                    <button class="scroll-btn next-scroll" data-target="trendingScroll" aria-label="Scroll Right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>
            
            <!-- Upcoming Row -->
            <section class="movie-row-section" id="upcomingRow">
                <h2 class="row-title"><i class="fas fa-calendar" style="color: var(--primary-color); margin-right: 8px;"></i>Upcoming</h2>
                <div class="row-container">
                    <button class="scroll-btn prev-scroll" data-target="upcomingScroll" aria-label="Scroll Left"><i class="fas fa-chevron-left"></i></button>
                    <div class="movie-row-scroll" id="upcomingScroll"></div>
                    <button class="scroll-btn next-scroll" data-target="upcomingScroll" aria-label="Scroll Right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>
            
            <!-- Top Rated Row -->
            <section class="movie-row-section" id="topRatedRow">
                <h2 class="row-title"><i class="fas fa-star" style="color: var(--primary-color); margin-right: 8px;"></i>Top Rated</h2>
                <div class="row-container">
                    <button class="scroll-btn prev-scroll" data-target="topRatedScroll" aria-label="Scroll Left"><i class="fas fa-chevron-left"></i></button>
                    <div class="movie-row-scroll" id="topRatedScroll"></div>
                    <button class="scroll-btn next-scroll" data-target="topRatedScroll" aria-label="Scroll Right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>
            
            <!-- Popular Row -->
            <section class="movie-row-section" id="popularRow">
                <h2 class="row-title"><i class="fas fa-heart" style="color: var(--primary-color); margin-right: 8px;"></i>Popular</h2>
                <div class="row-container">
                    <button class="scroll-btn prev-scroll" data-target="popularScroll" aria-label="Scroll Left"><i class="fas fa-chevron-left"></i></button>
                    <div class="movie-row-scroll" id="popularScroll"></div>
                    <button class="scroll-btn next-scroll" data-target="popularScroll" aria-label="Scroll Right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>
            
            <!-- Recommendations Row -->
            <section class="movie-row-section" id="recommendationsRow" style="display: none;">
                <h2 class="row-title"><i class="fas fa-magic" style="color: var(--primary-color); margin-right: 8px;"></i>Recommendations</h2>
                <div class="row-container">
                    <button class="scroll-btn prev-scroll" data-target="recommendationsScroll" aria-label="Scroll Left"><i class="fas fa-chevron-left"></i></button>
                    <div class="movie-row-scroll" id="recommendationsScroll"></div>
                    <button class="scroll-btn next-scroll" data-target="recommendationsScroll" aria-label="Scroll Right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </section>
        </div>

        <!-- Movies Grid (Used for Search & Filters) -->
        <section class="movies-section" id="discoverSection" style="display: none;">
            <h2 class="section-title" id="discoverTitle">Discover Movies</h2>
            <div class="movies-grid" id="moviesGrid">
                <!-- Movie cards will be loaded here -->
            </div>
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Loading movies...</p>
            </div>
            
            <!-- Pagination -->
            <div class="pagination" id="pagination">
                <button class="pagination-btn" id="prevBtn">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
                <div class="page-info">
                    <span id="pageNumber">1</span> / <span id="totalPages">1</span>
                </div>
                <button class="pagination-btn" id="nextBtn">
                    Next <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </section>
    </main>

    <!-- Movie Detail Modal -->
    <div class="modal" id="movieModal">
        <div class="modal-overlay" id="modalOverlay"></div>
        <div class="modal-content">
            <button class="modal-close" id="closeModal">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-body">
                <div class="modal-poster">
                    <img id="modalPoster" src="" alt="Movie Poster">
                </div>
                <div class="modal-info">
                    <h2 id="modalTitle">Movie Title</h2>
                    <div class="modal-meta">
                        <span class="badge badge-rating" id="modalRating">0/10</span>
                        <span class="badge badge-year" id="modalYear">-</span>
                        <span class="badge badge-duration" id="modalDuration">-</span>
                    </div>
                    <div class="modal-genres" id="modalGenres"></div>
                    <p class="modal-description" id="modalDescription">-</p>
                    <div class="modal-stats">
                        <div class="stat-item">
                            <span class="stat-name">Rating</span>
                            <div class="rating-bar">
                                <div class="rating-fill" id="modalRatingBar"></div>
                            </div>
                            <span id="modalRatingPercent">0%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-name">Popularity</span>
                            <div class="rating-bar">
                                <div class="popularity-fill" id="modalPopularityBar"></div>
                            </div>
                            <span id="modalPopularityPercent">0%</span>
                        </div>
                    </div>
                    <div class="modal-cast" id="modalCast"></div>
                    <div class="modal-buttons">
                        <button class="btn btn-primary" id="modalPlayBtn">
                            <i class="fas fa-play"></i> Watch Now
                        </button>
                        <button class="btn btn-secondary" id="modalFavoriteBtn">
                            <i class="fas fa-bookmark"></i> Add to Favorites
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Favorites Modal -->
    <div class="modal" id="favoritesModal">
        <div class="modal-overlay" id="favoritesOverlay"></div>
        <div class="modal-content favorites-modal">
            <button class="modal-close" id="closeFavoritesModal">
                <i class="fas fa-times"></i>
            </button>
            <h2>Your Favorites</h2>
            <div class="favorites-list" id="favoritesList">
                <p class="empty-message">No favorites yet. Add your favorite movies!</p>
            </div>
        </div>
    </div>

    <!-- Video Player Modal -->
    <div class="modal" id="videoModal">
        <div class="modal-overlay" id="videoOverlay"></div>
        <div class="modal-content video-modal-content">
            <button class="modal-close" id="closeVideoModal">
                <i class="fas fa-times"></i>
            </button>
            <div class="video-container">
                <iframe id="videoPlayer" src="" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            </div>
        </div>
    </div>

    <!-- Login Modal -->
    <div class="modal" id="loginModal">
        <div class="modal-overlay" id="loginOverlay"></div>
        <div class="modal-content auth-modal">
            <button class="modal-close" id="closeLoginModal">
                <i class="fas fa-times"></i>
            </button>
            <h2>Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginUsername">Username</label>
                    <input type="text" id="loginUsername" placeholder="Enter your username" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" placeholder="Enter your password" required>
                </div>
                <button type="submit" class="btn btn-primary btn-full">Login</button>
                <p class="auth-switch">Don't have an account? <a href="#" id="switchToRegister">Register here</a></p>
                <div id="loginError" class="error-message" style="display: none;"></div>
            </form>
        </div>
    </div>

    <!-- Register Modal -->
    <div class="modal" id="registerModal">
        <div class="modal-overlay" id="registerOverlay"></div>
        <div class="modal-content auth-modal">
            <button class="modal-close" id="closeRegisterModal">
                <i class="fas fa-times"></i>
            </button>
            <h2>Register</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label for="registerUsername">Username</label>
                    <input type="text" id="registerUsername" placeholder="Choose a username" required>
                </div>
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" placeholder="Enter your email" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Password</label>
                    <input type="password" id="registerPassword" placeholder="Choose a password" required>
                </div>
                <button type="submit" class="btn btn-primary btn-full">Register</button>
                <p class="auth-switch">Already have an account? <a href="#" id="switchToLogin">Login here</a></p>
                <div id="registerError" class="error-message" style="display: none;"></div>
            </form>
        </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>CinemaHub</h3>
                    <p>Your ultimate destination for discovering and streaming the best movies worldwide.</p>
                </div>
                <div class="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#trending">Trending</a></li>
                        <li><a href="#upcoming">Upcoming</a></li>
                        <li><a href="#top-rated">Top Rated</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Follow Us</h4>
                    <div class="social-links">
                        <a href="#"><i class="fab fa-facebook"></i></a>
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-instagram"></i></a>
                        <a href="#"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 CinemaHub. All rights reserved. Data provided by TMDB API.</p>
            </div>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>
