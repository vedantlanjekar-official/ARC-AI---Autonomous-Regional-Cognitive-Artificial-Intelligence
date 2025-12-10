# ARC-AI Frontend

A responsive, accessible single-page frontend for the ARC-AI offline AI mesh platform.

## Features

- **Hero Page**: Showcases the product with problems, USPs, and how it works
- **Authentication**: Sign in/Sign up with validation
- **Dashboard**: Overview, Packet Transactions, Chatbot, and Capsule Manager
- **Responsive Design**: Mobile-first, works from 320px to 1440px
- **Accessibility**: Keyboard navigable, ARIA labels, semantic HTML
- **Internationalization**: String resources separated for i18n
- **Offline State**: Badges showing offline/degraded status
- **Mock API**: MSW handlers for development

## Tech Stack

- React 19 with functional components and hooks
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- MSW (Mock Service Worker) for API mocking
- Axios for HTTP requests

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Mock API

The app uses MSW (Mock Service Worker) to mock API endpoints in development. All API calls are intercepted and return mock data.

### Sample Credentials

For testing authentication:
- Email: `anita@org.example` (Admin)
- Email: `ravi@org.example` (Operator)
- Email: `local@device` (User)
- Password: `password` (for all users)

## Project Structure

```
src/
├── components/
│   ├── Auth/          # Authentication components
│   ├── Dashboard/     # Dashboard components
│   ├── Hero/          # Hero page sections
│   └── Footer.jsx
├── contexts/          # React contexts (Auth, Cluster)
├── i18n/              # Internationalization strings
├── mocks/             # MSW handlers
├── pages/              # Page components
├── utils/              # API and WebSocket utilities
├── App.jsx             # Main app with routing
└── main.jsx            # Entry point
```

## API Endpoints

All endpoints are mocked via MSW:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/status/cluster` - Cluster status
- `GET /api/packets` - List packets
- `GET /api/packets/:pktId` - Packet details
- `POST /api/packets/retry` - Retry packet
- `POST /api/query` - Chat query
- `GET /api/capsules` - List capsules
- `GET /api/capsules/:capsuleId` - Capsule details

## WebSocket

WebSocket connection is simulated in development mode. Real WebSocket endpoint: `ws://localhost:3001/ws/updates`

## Features by Page

### Hero Page
- Hero section with CTAs
- Problems we solve (3 cards)
- Key features (USP bullets)
- How we work (3-step flow)
- Contact form
- Footer with links

### Dashboard
- **Overview**: Key metrics, cache hit rate, queued packets, sync activity
- **Packet Transactions**: Table with filters, retry actions, CSV export
- **Chatbot**: Real-time chat with provenance and confidence scores
- **Capsule Manager**: Search, view, revoke, and promote capsules (admin)

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Semantic HTML structure
- Color contrast ≥ 4.5:1
- Focus indicators on all interactive elements

## Responsive Breakpoints

- Mobile: 320px - 640px
- Tablet: 641px - 1024px
- Desktop: 1025px - 1440px+

## Internationalization

Strings are stored in `src/i18n/strings.js`. Currently supports English (en), but structure is ready for additional languages.

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Integration with Backend

To connect to real backend services:

1. Update `VITE_API_BASE` in `.env` file
2. Update `VITE_WS_URL` for WebSocket connection
3. Ensure backend implements the same API contract as defined in `src/mocks/handlers.js`

## Development Notes

- MSW automatically intercepts API calls in development
- WebSocket is simulated in dev mode (EventTarget)
- Chat history is stored in localStorage
- Authentication tokens are stored in localStorage

## License

ISC
