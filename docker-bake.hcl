group "default" {
  targets = ["binaries"]
}

target "binaries" {
  target = "binaries"
  output = ["./out"]
  platforms = [
    "darwin/amd64",
    "darwin/arm64",
    "linux/amd64",
    "linux/arm64",
  ]
}