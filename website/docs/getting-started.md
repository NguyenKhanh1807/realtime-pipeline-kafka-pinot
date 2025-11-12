# Getting Started

## Prerequisites
- Node.js 18+
- npm or yarn
- Apache Pinot instance (optional for full functionality)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd realtime-pinot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Setup

### Environment Variables Setup
The application uses environment variables for configuration. A `.env.example` file is provided as a template.

**Setup Instructions:**
1. Copy `.env.example` to `.env.local`
2. Fill in your actual values in `.env.local`
3. `.env.local` is ignored by Git for security

**Key Environment Variables:**
- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXT_PUBLIC_API_URL` - External API base URL
- `JWT_SECRET` - Authentication token secret
- `NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES` - Feature flag for real-time functionality

**Security Note:** Never commit `.env.local` or any file containing actual secrets to version control.

### Git Configuration
The `.gitignore` file is configured to:
- Track `.env.example` (template file)
- Ignore `.env*` files (actual environment files)
- Include exception `!.env.example` to allow the template

This ensures developers can access the configuration template while keeping secrets secure.

## Demo Credentials

Use these credentials to test the login functionality:

- **Username**: `yuiiuy`
- **Password**: Any password (API accepts any for demo)

## Development Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture Overview

This project implements a sophisticated **MVVM (Model-View-ViewModel)** architecture with **Atomic Design** principles and **Domain-Driven Design** patterns.

### Core Layers
- **Model Layer**: Business logic, domain entities, repositories
- **ViewModel Layer**: State management, data transformation, commands
- **View Layer**: UI components following atomic design hierarchy

### Key Technologies
- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: TailwindCSS, ShadcnUI, RadixUI
- **State**: Zustand for state management
- **Backend**: Apache Pinot for real-time analytics
- **Real-time**: WebSocket integration

## Project Structure

```
website/
├── app/                    # Next.js App Router pages
├── docs/                   # Comprehensive documentation
├── src/
│   ├── components/         # Atomic Design components
│   │   ├── atoms/         # Basic UI elements
│   │   ├── molecules/     # Component groups
│   │   └── organisms/     # Complex UI sections
│   ├── models/            # Domain layer (DDD)
│   │   ├── entities/      # Domain entities
│   │   ├── services/      # Domain services
│   │   ├── repositories/  # Data access interfaces
│   │   └── types/         # Domain types
│   ├── viewmodels/        # ViewModel layer (MVVM)
│   │   ├── stores/        # Zustand state management
│   │   ├── commands/      # Command pattern
│   │   └── validators/    # ViewModel validation
│   ├── services/          # Infrastructure services
│   ├── contexts/          # React Context providers
│   └── hooks/             # Custom React hooks
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Next Steps

1. **Explore the Dashboard**: Login and explore the fraud detection features
2. **Review Architecture**: Check `docs/architecture-overview.md` for detailed system design
3. **Understand Patterns**: Read about MVVM and Atomic Design in the docs
4. **Start Development**: Follow the development workflow in `docs/development-workflow.md`

## Troubleshooting

### Common Issues

**Port 3000 already in use:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9
# Or use a different port
npm run dev -- -p 3001
```

**Apache Pinot connection issues:**
- Ensure Pinot is running on `http://93.115.172.151:8099`
- Check network connectivity
- The app falls back to demo data if Pinot is unavailable

**Build failures:**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Getting Help

- Check the documentation in the `docs/` folder
- Review the architecture overview for system understanding
- Check GitHub issues for common problems
- Review the implementation guidelines for coding standards
