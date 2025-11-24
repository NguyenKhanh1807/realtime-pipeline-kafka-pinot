# 🔍 Realtime Fraud Detection Dashboard

A modern, enterprise-grade fraud detection system built with Next.js, Apache Pinot, and real-time analytics. This dashboard provides comprehensive transaction monitoring, risk assessment, and fraud prevention capabilities using advanced data analytics.

## ✨ Key Features

### 🔍 **Fraud Detection Engine**
- **Real-time Transaction Analysis**: Instant fraud scoring using Apache Pinot
- **Multi-factor Risk Assessment**: Advanced algorithms with confidence levels
- **Interactive Dashboard**: Live monitoring of fraud metrics and trends
- **Advanced Visualizations**: Charts and graphs powered by Recharts

### 🎨 **Modern Architecture**
- **MVVM Pattern**: Clean separation of concerns with Model-View-ViewModel
- **Atomic Design**: Scalable component hierarchy (Atoms → Molecules → Organisms)
- **Domain-Driven Design**: Business logic encapsulated in domain entities
- **Type-Safe**: Full TypeScript coverage with strict typing

### 🔄 **Real-time Capabilities**
- **WebSocket Integration**: Live transaction feeds and fraud alerts
- **Apache Pinot**: OLAP database for real-time analytics
- **Live Data Synchronization**: Continuous metric updates
- **Connection Management**: Auto-reconnection and offline handling

### 🛡️ **Enterprise Security**
- **Role-Based Access Control**: Granular permissions system
- **Audit Logging**: Comprehensive activity tracking
- **Secure Authentication**: JWT-based user management
- **Data Validation**: Multi-layer input validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm, yarn, pnpm, or bun
- Apache Pinot instance (optional for full functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd realtime-pinot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

### Demo Credentials
- **Username**: `yuiiuy`
- **Password**: Any password (API accepts any for demo)

## 📁 Project Structure

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

## 🏗️ Architecture

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

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[Architecture Overview](docs/architecture-overview.md)** - High-level system design
- **[Getting Started](docs/getting-started.md)** - Development setup guide
- **[MVVM Pattern](docs/mvvm-pattern.md)** - Model-View-ViewModel implementation
- **[Atomic Design](docs/atomic-design.md)** - Component design system
- **[Technology Stack](docs/technology-stack.md)** - Detailed tech breakdown
- **[Development Workflow](docs/development-workflow.md)** - Development processes
- **[Implementation Guidelines](docs/implementation-guidelines.md)** - Coding standards
- **[Deployment Guide](docs/deployment-guide.md)** - Production deployment

## 🔧 Development

### Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Quality
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting (via ESLint)
- **Husky**: Git hooks for quality checks

## 🚢 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://93.115.172.151:9000
NEXT_PUBLIC_PINOT_URL=http://93.115.172.151:8099
NEXT_PUBLIC_APP_URL=http://93.115.172.151:9000
NEXT_PUBLIC_ENABLE_REAL_TIME_FEATURES=true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Apache Pinot](https://pinot.apache.org/) - Real-time analytics database
- [ShadcnUI](https://ui.shadcn.com/) - Beautiful component library
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

Built with ❤️ using modern web technologies for enterprise fraud detection.
