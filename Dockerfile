FROM golang:1.11.5-alpine3.9

WORKDIR /go/src/github.com/dgageot/demoit
COPY . ./

RUN go build