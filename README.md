# X-Stock 📈

A modern full-stack stock tracking application built with a Python backend and Next.js frontend, designed for real-time stock market data monitoring and analysis.

## 🏗️ Architecture

This project follows a clean separation of concerns with:
- **Backend (`be/`)**: Python-based API server for data processing and stock market integrations
- **Frontend (`fe/`)**: Next.js React application with TypeScript for the user interface

## 🛠️ Tech Stack

### Backend
- **Language**: Python 3.12+
- **Package Management**: UV (modern Python package manager)
- **Dependencies**: FastAPI, requests, data processing libraries
- **Environment**: Configured with `.python-version` for version consistency

### Frontend
- **Framework**: Next.js 15+ with React
- **Language**: TypeScript
- **Runtime**: Bun (fast JavaScript runtime and package manager)
- **Styling**: Tailwind CSS
- **Linting**: ESLint with modern configuration
- **Build Tool**: PostCSS for CSS processing

### Language Composition
- **TypeScript**: 67.3% (12,565 bytes)
- **Python**: 28.2% (5,266 bytes)
- **JavaScript**: 3.2% (605 bytes)
- **CSS**: 1.3% (488 bytes)

## 🚀 Getting Started

### Prerequisites
- Python 3.12 or higher
- Bun runtime
- UV package manager for Python

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd be/
   ```

2. Install UV if you haven't already:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

3. Install dependencies:
   ```bash
   uv sync
   ```

4. Activate the virtual environment:
   ```bash
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

5. Run the backend server:
   ```bash
   uv run python src/main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd fe/
   ```

2. Install Bun if you haven't already:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. Install dependencies:
   ```bash
   bun install
   ```

4. Start the development server:
   ```bash
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
x-stock/
├── be/                     # Backend (Python)
│   ├── src/               # Source code
│   ├── .python-version    # Python version specification
│   ├── pyproject.toml     # Project configuration
│   ├── requirements.txt   # Python dependencies
│   ├── uv.lock           # Dependency lock file
│   └── stock_updates.log  # Application logs
├── fe/                     # Frontend (Next.js)
│   ├── src/               # React components and pages
│   ├── public/            # Static assets
│   ├── package.json       # Node.js dependencies
│   ├── next.config.ts     # Next.js configuration
│   ├── tsconfig.json      # TypeScript configuration
│   ├── tailwind.config.js # Tailwind CSS configuration
│   ├── eslint.config.mjs  # ESLint configuration
│   └── bun.lock          # Bun dependency lock file
└── README.md              # This file
```

## 🔧 Development

### Backend Development
- Uses UV for fast dependency management and virtual environment handling
- Configured with `pyproject.toml` for modern Python project structure
- Logging configured to `stock_updates.log` for debugging

### Frontend Development
- Built with Next.js 15+ for optimal React development experience
- TypeScript for type safety and better developer experience
- Tailwind CSS for utility-first styling
- ESLint for code quality and consistency
- Bun for ultra-fast package management and runtime

## 📊 Features

- Real-time stock data fetching and processing
- Modern, responsive web interface
- Type-safe development with TypeScript
- Fast build and runtime performance
- Comprehensive logging and error handling
- Clean API architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Scripts

### Backend
```bash
# Install dependencies
uv sync

# Run development server
uv run python src/main.py

# Run with specific Python version
uv run --python 3.12 python src/main.py
```

### Frontend
```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Start production server
bun start

# Run linting
bun run lint
```

## 🔍 Monitoring

The application includes comprehensive logging capabilities:
- Backend logs are written to `be/stock_updates.log`
- Real-time stock data processing and API interactions are tracked
- Error handling and debugging information available through logs

## 📄 License

This project is open source. Please add your preferred license.

## 👨‍💻 Author

**Mohit Joer** - [@mohitjoer](https://github.com/mohitjoer)

---

*Last updated: 2025-10-11 08:43:30 UTC*

*Built with ❤️ using modern Python and TypeScript technologies*