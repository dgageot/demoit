package files

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
)

var Root = "."

// Read reads a file in .demoit folder.
func Read(path ...string) ([]byte, error) {
	return os.ReadFile(fullpath(path...))
}

// Exists tests if a file exists.
func Exists(path ...string) bool {
	_, err := os.Stat(fullpath(path...))
	return err == nil
}

// Sha256 returns the sha256 digest of a file.
func Sha256(path ...string) (string, error) {
	file, err := os.Open(fullpath(path...))
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

func fullpath(path ...string) string {
	return filepath.Join(append([]string{Root}, path...)...)
}
