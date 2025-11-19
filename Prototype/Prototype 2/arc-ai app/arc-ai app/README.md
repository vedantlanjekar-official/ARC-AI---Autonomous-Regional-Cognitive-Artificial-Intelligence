# ARC AI Chat - Next.js Web Application

A modern, mobile-first web application built with Next.js 14+ and TypeScript that connects to the Mini Hub API to send questions and receive AI-generated responses. The app works seamlessly on mobile devices and desktop browsers.

## Architecture

```
Mobile/Desktop Browser → Next.js Web App → Mini Hub Web Server (HTTP API) → Mini Hub MQTT → Main Hub → Ollama LLM
```

## Features

- ✅ **Mobile-first responsive design** - Optimized for mobile screens (320px+)
- ✅ **Real-time chat interface** - User messages on right, AI responses on left
- ✅ **Connection status monitoring** - Visual indicator with auto-retry
- ✅ **Message history persistence** - Chat history saved in localStorage
- ✅ **Dark/Light mode** - Toggle between themes
- ✅ **Error handling** - User-friendly error messages
- ✅ **Loading states** - Animated indicators during API calls
- ✅ **TypeScript** - Full type safety throughout
- ✅ **Accessible** - Proper ARIA labels and keyboard navigation
- ✅ **Touch-friendly** - Large tap targets (min 44x44px)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect, useCallback)
- **Storage**: localStorage for message persistence

## Prerequisites

- Node.js 18+ installed
- Mini Hub web server running and accessible
- npm or yarn package manager

## Installation

1. **Clone or navigate to the project directory:**

```bash
cd "arc-ai app"
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_MINI_HUB_URL=http://192.168.1.10:8080
```

Replace `192.168.1.10:8080` with your Mini Hub's IP address and port.

**Note**: You can also configure the Mini Hub URL through the app's settings interface after starting the app.

4. **Start the development server:**

```bash
npm run dev
```

5. **Open your browser:**

Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

- `NEXT_PUBLIC_MINI_HUB_URL` - The URL of your Mini Hub web server (e.g., `http://192.168.1.10:8080`)

### In-App Settings

You can configure the Mini Hub URL directly in the app:
1. Click the settings icon in the header
2. Enter your Mini Hub URL
3. Click "Save"

The URL will be saved to localStorage and persist across sessions.

## API Integration

### Mini Hub Endpoint

The app connects to the Mini Hub web server at `http://<MINI_HUB_IP>:8080/ask`:

**POST `/ask`**
- **Request Body:**
  ```json
  {
    "question": "Your question here"
  }
  ```

- **Success Response (200):**
  ```json
  {
    "status": "ok",
    "answer": "AI generated response text",
    "tokens": 123
  }
  ```

- **Error Response (400/500):**
  ```json
  {
    "status": "error",
    "error": "Error message here"
  }
  ```

- **Timeout Response (408):**
  ```json
  {
    "status": "error",
    "error": "Request timed out"
  }
  ```

### Request Timeout

The app sets a 90-second timeout for API requests. If a request takes longer, it will be cancelled and an error message will be displayed.

## Project Structure

```
web-app/
├── app/
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main chat interface
│   └── globals.css         # Global styles
├── components/
│   ├── ChatMessage.tsx     # Individual chat message component
│   ├── ChatInput.tsx       # Message input component
│   ├── LoadingIndicator.tsx # Loading animation
│   ├── ConnectionStatus.tsx # Connection status indicator
│   └── ThemeProvider.tsx   # Dark/light mode provider
├── lib/
│   ├── api.ts              # API client
│   ├── types.ts            # TypeScript types
│   └── storage.ts          # localStorage utilities
├── hooks/
│   └── useChat.ts          # Chat state management hook
└── styles/
    └── globals.css         # Global styles and Tailwind directives
```

## Usage

1. **Configure Mini Hub URL**: If not set in environment variables, configure it in settings
2. **Check Connection Status**: The connection status indicator shows if the Mini Hub is accessible
3. **Send Messages**: Type your question and press Enter or click Send
4. **View History**: Previous messages are automatically saved and restored
5. **Clear Chat**: Click the "Clear" button to remove all messages
6. **Toggle Theme**: Click the theme toggle button (bottom right) to switch between dark and light mode

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Docker
- Self-hosted Node.js server

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

## CORS Configuration

If you encounter CORS errors, ensure your Mini Hub web server allows requests from your Next.js app's origin. For development, you may need to configure CORS headers on the Mini Hub server.

## Testing

### Manual Testing Checklist

- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Test on desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test error scenarios (network failure, timeout)
- [ ] Test with slow network connections
- [ ] Verify responsive design at various screen sizes
- [ ] Test dark/light mode toggle
- [ ] Test message persistence (refresh page)
- [ ] Test connection status indicator
- [ ] Test settings modal
- [ ] Test clear chat functionality

## Troubleshooting

### Connection Issues

- **"Mini Hub URL not configured"**: Set the URL in settings or environment variables
- **"Connection Error"**: Check if Mini Hub is running and accessible
- **CORS errors**: Configure CORS headers on Mini Hub server
- **Timeout errors**: Check network connection and Mini Hub response time

### Build Issues

- **TypeScript errors**: Run `npm run lint` to identify issues
- **Missing dependencies**: Run `npm install` again
- **Build failures**: Check Node.js version (requires 18+)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 12+)
- Chrome Mobile (Android 8+)

## Performance

- Fast initial load with Next.js optimizations
- Code splitting for optimal bundle size
- Lazy loading for improved performance
- Optimized images and assets
- Efficient state management

## Security

- Input validation on client side
- Request timeout protection
- Error message sanitization
- Secure localStorage usage
- HTTPS recommended for production

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.

## Changelog

### Version 0.1.0
- Initial release
- Mobile-first responsive design
- Chat interface with message history
- Connection status monitoring
- Dark/light mode support
- Error handling and loading states
- localStorage persistence

