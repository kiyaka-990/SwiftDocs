# SwiftDocs engine — container service for Vercel
# Builds the Rust binary and serves it as an HTTP service (POST /render).

FROM rust:1-slim AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/swiftdocs_engine /usr/local/bin/swiftdocs_engine
EXPOSE 8080
CMD ["swiftdocs_engine", "serve"]
