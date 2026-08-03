# Sentra: Automated AI Code Review & Security Analysis Platform

Welcome to **Sentra**, your automated AI pair programmer and security analyst. Sentra integrates seamlessly into your GitHub workflow to evaluate pull requests in real-time, catching bugs, enforcing code quality, and securing your application before a single line is merged.

### What Sentra Does

- **Real-Time Code Reviews:** As soon as you open or update a pull request, Sentra reads the code diff, understands the context, and leaves precise line-by-line comments.
- **Security Audits:** Automatically scans for vulnerabilities, exposed credentials, and architectural flaws using advanced LLM reasoning.
- **Quality Scoring:** Assigns a "Quality Score" to every pull request, allowing engineering managers to track team performance and enforce high standards.
- **Merge Blocking:** Can be configured to block PRs from merging if critical vulnerabilities are detected or if the quality score drops below your organization's threshold.

### Why You'll Love It

- **Instant Feedback Loop:** No more waiting hours for a human review to catch a simple logic error. Sentra responds in seconds.
- **Frictionless Integration:** It operates entirely within GitHub. Developers interact with Sentra exactly like they interact with human teammates—via PR comments.
- **Data-Driven Telemetry:** The Sentra Dashboard tracks your team's code health, DORA metrics, and token budget, providing actionable insights into your engineering velocity.
- **State-of-the-Art AI:** Powered by the latest foundational models (e.g., Claude 3 Haiku) to ensure deep semantic understanding of complex codebases.

### How to Get Started

1. Click **Install** to add the Sentra GitHub App to your organization or specific repositories.
2. Sign in to the [Sentra Dashboard](https://sentra-ai.me) using your GitHub account.
3. Open a Pull Request! Sentra will automatically begin its analysis and post findings directly to the PR timeline.

Move fast. Stay secure. Let Sentra handle the review.
