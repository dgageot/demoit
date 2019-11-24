FROM golang:1.13.4-alpine3.10

WORKDIR /app
COPY . ./

RUN go build -mod=vendor