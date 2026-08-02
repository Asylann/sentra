# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install dependencies (only need CA certificates for Kafka/TLS if any)
RUN apk update && apk add --no-cache ca-certificates tzdata

# Copy the workspace files and dependencies
COPY go.work go.work.sum* ./
COPY apps/api-gateway/go.mod apps/api-gateway/go.sum* ./apps/api-gateway/
RUN cd apps/api-gateway && go mod download

# Copy the source code
COPY . .

# Install sqlc and generate db code
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@v1.26.0
RUN cd apps/api-gateway && sqlc generate

# Tidy dependencies to fix any missing modules (e.g. google/uuid)
RUN cd apps/api-gateway && go mod tidy

# Build the binary with optimizations (CGO disabled for static binary)
RUN cd apps/api-gateway && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /go/bin/api-gateway ./cmd/gateway/main.go

# Final stage
FROM alpine:latest

# Import CA certificates and tzdata
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /go/bin/api-gateway /app/api-gateway

# Use an unprivileged user
RUN adduser -D -g '' sentrauser
USER sentrauser

# Expose port
EXPOSE 8000

# Run the executable
CMD ["/app/api-gateway"]
