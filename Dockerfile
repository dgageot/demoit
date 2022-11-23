# syntax=docker/dockerfile:1

# xx is a helper for cross-compilation
FROM --platform=$BUILDPLATFORM tonistiigi/xx:1.1.2 AS xx

# osxcross contains the MacOSX cross toolchain for xx
FROM crazymax/osxcross:12.3-r0-alpine AS osxcross

FROM --platform=$BUILDPLATFORM golang:1.19.3-alpine3.16 AS build
COPY --link --from=xx / /
RUN apk add --no-cache gcc clang llvm
ARG TARGETPLATFORM
RUN xx-apk add --no-cache gcc musl-dev
WORKDIR /src
ENV CGO_ENABLED=1
RUN --mount=type=bind,target=. \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/go/pkg/mod \
    --mount=type=bind,from=osxcross,src=/osxsdk,target=/xx-sdk <<EOT
  set -ex
  xx-go --wrap
  go build -o /out/demoit
  xx-verify /out/demoit
EOT

FROM scratch as binaries
COPY --link --from=build /out /