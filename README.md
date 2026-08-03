# Sentra

Sentra is an automated AI-powered code review and security analysis platform designed to integrate seamlessly into your development workflow. It evaluates pull requests in real-time to enforce code quality, identify security vulnerabilities, and ensure maintainability before code is merged.

## Architecture Overview

The Sentra platform operates via a microservices architecture to ensure high scalability and performance:

1. **API Gateway (Go / Gin)**
   - Acts as the primary ingress for GitHub webhooks and frontend requests.
   - Handles JWT-based authentication and GitHub App OAuth integration.
   - Manages API routing for dashboard analytics, repository metadata, and pull request histories.
   
2. **Event Streaming (Apache Kafka)**
   - Decouples the API Gateway from the heavy lifting of code analysis.
   - Guarantees exactly-once processing and resilient event buffering for high volumes of pull requests.

3. **AI Inference Worker (Python / FastAPI / Celery)**
   - Consumes code review events from Kafka.
   - Interacts with AWS Bedrock (utilizing models like Claude 3 Haiku) to perform deep semantic analysis of code diffs.
   - Publishes findings and quality scores back to the database.

4. **Web Dashboard (React / Vite)**
   - Provides a real-time, telemetry-driven dashboard for engineering managers and developers.
   - Visualizes PR quality scores, token budget utilization, and critical "Action Required" items.

5. **Data Layer (PostgreSQL / Redis)**
   - PostgreSQL stores persistent metadata including users, repositories, pull request analytics, and review findings.
   - Redis acts as a high-performance caching layer and message broker backend for background task queuing.

## Features

- **Automated Pull Request Analysis:** Triggers instantly upon PR creation or synchronization.
- **Security & Quality Audits:** Identifies bugs, architectural flaws, and security vulnerabilities at the line level.
- **Actionable Findings:** Provides concrete remediation steps directly associated with specific file lines.
- **Organization-Level Telemetry:** Rolls up DORA metrics and overall code health to provide actionable insights for engineering leadership.
- **GitHub App Integration:** Frictionless onboarding via a standardized GitHub App installation flow.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v20+)
- Go (1.21+)
- Python (3.11+)
- AWS Account (for Bedrock inference access)

### Local Development

1. Clone the repository.
2. Ensure you have the necessary environment variables set (refer to the `.env.example` file if available).
3. Use Docker Compose to spin up the local infrastructure:
   ```bash
   docker-compose up -d
   ```
4. Start the individual microservices as per their respective READMEs.

## License

Copyright (c) 2026 Sentra. All rights reserved.
