# NextCharge ⚡ — India's Smartest EV Charging Network

NextCharge is a premium, high-performance web application designed for EV owners to easily find, filter, and book charging slots at stations across India in real-time. Built with a stunning modern glassmorphism design, smooth micro-animations, and dynamic theme switching, NextCharge offers a state-of-the-art interface that feels alive with electric energy.

---

## 🚀 Key Features

### 🔹 EV Owners (Frontend)
* **Real-time Map Search**: Interactive dark basemap powered by Leaflet, displaying charging stations with status pins (Available, Busy, Offline).
* **Smart Filtering**: Instant filters for "Available Only" and high-speed "Fast DC" (>= 30 kW) chargers.
* **Seamless Slot Booking**: Complete reservation flow with details on connector types (CCS2, Type 2 AC), maximum speed, price, and instant Booking ID generation.
* **Dual Theme Engine**: A fluid dark and light mode toggle with smooth HSL transitions and persistent browser theme settings (`localStorage`).
* **Electric Aesthetics**: Dense glowing particle systems, layered floating background bubbles, faint flashing electric SVGs, and flowing neon energy text gradients.

### 🔹 Portal Operations (Admin Panel)
* **Systems Overview**: Real-time network statistics (Registered EVs, Active Stations, Uptime, and Revenue tracking).
* **Live Session Monitoring**: Visual logs tracking current user sessions, charger speeds, and progress states.
* **Pending Station Verification**: Dedicated approval queue for operators to request new station listings on the map.
* **User Management**: Comprehensive panel to manage system access, roles (User, Operator, Admin), and toggle user status.

---

## 🛠️ Technology Stack

### **Frontend (`nextcharge-react`)**
* **Core**: React.js (Hooks & Context State Management)
* **Maps**: Leaflet.js (`react-leaflet` / raw Leaflet wrapper for performance)
* **Styling**: Vanilla CSS, dynamic CSS Custom Variables (`[data-theme]`), and HSL tailored palettes
* **Animations**: CSS Keyframe animations (`energyFlow`, `boltFlash`, `float1-3`) and Canvas `requestAnimationFrame` loops
* **Auth**: Integrated Google Sign-in SDK & Custom Form Validation

### **Backend (`nextcharge-backend`)**
* **Core**: Node.js & Express.js API
* **Database**: MongoDB (User, Station, and Booking models)
* **Authentication**: JWT (JSON Web Tokens) with route protection middleware

---

## 📁 Project Structure

```bash
nextcharge/
├── nextcharge-react/         # React Frontend Web App
│   ├── public/               # HTML template, global favicon, Leaflet links
│   │   └── index.html        # Core HTML & CSS theme system variables
│   ├── src/
│   │   ├── context.js        # Global state (auth, bookings, active stations, themes)
│   │   ├── Navbar.js         # Navigation header, Magnetic CTA buttons, Theme toggle
│   │   ├── Hero.js           # Animated canvas bubble particle engine & headers
│   │   ├── Sections.js       # StatsBar, MapSection, Station Cards, Footers
│   │   ├── Modals.js         # Auth Forms, Slot Booking, and Admin Dashboard
│   │   ├── hooks.js          # Custom hooks (Magnetic elements, CountUp, Tilt cards, ScrollReveal)
│   │   ├── data.js           # Mock fallback datasets
│   │   └── App.js            # Main application bootstrapper
│   └── package.json
│
├── nextcharge-backend/       # Express Backend Service
│   ├── src/
│   │   ├── controllers/      # Route controllers (Auth, Bookings, Stations)
│   │   ├── models/           # Mongoose Database schemas
│   │   ├── routes/           # Protected & public API endpoints
│   │   └── server.js         # Server bootstrap
│   └── package.json
└── README.md                 # Main Documentation
```

---

## 💻 Local Setup & Development

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16+ recommended) and `npm` installed on your machine.

### 2. Set Up the Backend
1. Open your terminal and navigate to the backend directory:
   ```bash
   cd nextcharge-backend
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Start the backend development server:
   ```bash
   npm start
   ```
   *The backend server will run on `http://localhost:5000` (or as specified in your `.env`).*

### 3. Set Up the Frontend
1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd nextcharge-react
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Launch the React development server:
   ```bash
   npm start
   ```
   *The React frontend will boot at `http://localhost:3000` and automatically connect to your local backend.*

---

## ⚡ Visual Performance Optimizations
* **Visibility Observer**: The hero background's Canvas animation frame loops auto-suspend when scrolled out of the viewport. This keeps CPU and GPU usage at `0%` while reading other sections.
* **Transition Gradients**: Direct browser-rendered `.electric-text` styling eliminates inline React prefix glitches, providing smooth and flicker-free render cycles.
* **Cached States**: Theme selections, user profiles, and active sessions persist across sessions in the browser storage.
