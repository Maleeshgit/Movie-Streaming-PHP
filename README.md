# 🎬 CinemaHub - Movie Streaming Platform

A stunning, responsive movie catalog website built with HTML, CSS, and JavaScript, powered by the TMDB API.

## ✨ Features

### Core Features
- **Trending Movies**: Browse the latest trending movies
- **Movie Discovery**: Explore upcoming, top-rated, and popular films
- **Advanced Search**: Search movies by title
- **Smart Filtering**:
  - Filter by genre
  - Filter by rating (5+, 6+, 7+, 8+ stars)
  - Filter by release year (1980-present)
- **Dynamic Sorting**:
  - Most Popular
  - Highest Rated
  - Newest
  - Oldest
  - Alphabetical (A-Z)

### Movie Details
- **Comprehensive Movie Information**:
  - Title, genre, release year
  - Rating and popularity metrics
  - Plot synopsis
  - Cast information with profile images
  - Runtime and vote statistics

- **Interactive Features**:
  - Play trailer (feature ready)
  - Add to favorites
  - Visual rating bars

### User Experience
- **Responsive Design**: Fully responsive on desktop, tablet, and mobile devices
- **Favorites Management**: Save and manage your favorite movies
- **Pagination**: Navigate through pages of movies
- **Hero Section**: Featured movie showcase with dynamic background
- **Smooth Animations**: Beautiful transitions and hover effects
- **Dark Theme**: Modern, eye-friendly dark interface

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls

### Installation

1. **Open the website**
   - Simply open `index.html` in your web browser
   - No server setup required for local development

## 📋 File Structure

```
movie-streaming/
├── index.html       # Main HTML file with structure and markup
├── style.css        # Complete styling with animations and responsiveness
├── script.js        # JavaScript for API integration and functionality
└── README.md        # This file
```

## 🎨 Design Features

### Modern UI/UX
- **Color Scheme**: Dark theme with red accent colors (#e50914)
- **Typography**: Clean, modern sans-serif fonts
- **Gradients**: Beautiful gradient backgrounds and accents
- **Animations**: Smooth transitions and hover effects
- **Icons**: Font Awesome icons for visual appeal

### Responsive Breakpoints
- Desktop: Full grid layout (1400px max-width)
- Tablet: Adjusted grid and filtering (768px breakpoint)
- Mobile: Optimized single-column layout (480px breakpoint)

## 🔧 API Integration

### TMDB API
The application uses the **The Movie Database (TMDB) API** v3:
- **Base URL**: `https://api.themoviedb.org/3`
- **Image URL**: `https://image.tmdb.org/t/p/w500` (posters)

### API Endpoints Used
- `/movie/popular` - Popular movies
- `/movie/top_rated` - Top-rated movies
- `/movie/upcoming` - Upcoming movies
- `/search/movie` - Search functionality
- `/genre/movie/list` - Genre listing
- `/movie/{id}` - Movie details with credits

## 💾 Local Storage

The application uses browser's localStorage to:
- **Save Favorites**: Store your favorite movies across sessions
- **Persistent Data**: Favorites remain even after closing the browser

## 🎯 Functionality Guide

### Navigation
- **Navbar**: Quick access to different movie categories
- **Search Bar**: Real-time search with debouncing
- **Favorites Button**: Quick access to your saved favorites

### Filtering & Sorting
1. **Genre Filter**: Select from all TMDB movie genres
2. **Rating Filter**: Filter movies by minimum rating
3. **Year Filter**: Browse movies from specific years
4. **Sort Options**: Arrange results by various criteria
5. **Reset Button**: Clear all filters at once

### Movie Interactions
- **Movie Card Hover**: Reveals quick actions (play, favorite, info)
- **Click for Details**: Opens comprehensive movie modal
- **Add to Favorites**: Save movies for later (stored locally)
- **Pagination**: Navigate through pages of movies

### Movie Modal
- View complete movie information
- See cast member profiles
- Check detailed ratings and popularity
- Add to/remove from favorites
- Play trailer functionality

## 📱 Responsive Design

### Desktop (1200px+)
- Full-width layout
- Multi-column grid
- All features accessible
- Smooth animations

### Tablet (768px - 1199px)
- Adjusted grid layout
- Touch-friendly buttons
- Optimized spacing
- Full functionality

### Mobile (320px - 767px)
- Single-column layout
- Simplified navigation
- Touch-optimized controls
- Readable text sizes

## 🎬 Usage Examples

### Search for a Movie
1. Click on the search box in the navbar
2. Type the movie title
3. Results update automatically

### Filter by Genre and Rating
1. Select a genre from the Genre dropdown
2. Choose a minimum rating from the Rating dropdown
3. Movies will filter in real-time

### Browse by Category
1. Click on "Trending", "Upcoming", "Top Rated", or "Popular"
2. Browse movies in that category
3. Use pagination to see more results

### Save Favorites
1. Hover over a movie card or open its details
2. Click the bookmark/heart icon
3. View all favorites by clicking the counter badge

## 🎨 Customization

### Change Color Scheme
Edit CSS variables in `style.css`:
```css
:root {
    --primary-color: #e50914;      /* Main accent color */
    --secondary-color: #221f1f;    /* Dark background */
    --accent-color: #564d4d;       /* Secondary accent */
}
```

### Change API Key
Edit `script.js`:
```javascript
const API_KEY = 'your-api-key-here';
```

## ⚙️ Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## 🚧 Future Enhancements

Potential features for future versions:
- [ ] User authentication and accounts
- [ ] Movie ratings and reviews
- [ ] Watchlist and playlist creation
- [ ] Real video streaming integration
- [ ] Advanced recommendations
- [ ] Social sharing features
- [ ] TV series support

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the code comments in script.js
3. Check browser console for error messages

---

**Happy Movie Watching! 🍿🎬**

Built with ❤️ for cinema lovers