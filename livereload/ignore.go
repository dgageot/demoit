package livereload

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// A nil path list enumerates ignored files and whole directories for scans.
func gitIgnoredPaths(ctx context.Context, root string, paths []string) map[string]bool {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	args := []string{"ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z"}
	var input strings.Builder
	if paths != nil {
		args = []string{"check-ignore", "-z", "--stdin"}
		for _, path := range paths {
			input.WriteString(path)
			input.WriteByte(0)
		}
	}
	cmd := exec.CommandContext(ctx, "git", append([]string{"-c", "core.fsmonitor=false"}, args...)...)
	cmd.WaitDelay = watchDelay
	cmd.Dir = root
	cmd.Stdin = strings.NewReader(input.String())
	output, err := cmd.Output()
	if err != nil {
		// Git is optional; a missing executable or repository must not stop reloads.
		// check-ignore also exits with status 1 when no paths are ignored.
		return nil
	}
	ignored := make(map[string]bool)
	for path := range strings.SplitSeq(string(output), "\x00") {
		if path != "" {
			ignored[path] = true
		}
	}
	return ignored
}

// Submodules and embedded repositories need their own ignore rules and index.
func ignoredEvents(ctx context.Context, root string, paths []string) map[string]bool {
	groups := make(map[string][]string)
	for _, path := range paths {
		dir := root
		parent := filepath.Dir(filepath.Join(root, filepath.FromSlash(path)))
		for parent != root && strings.HasPrefix(parent, root+string(filepath.Separator)) {
			if _, err := os.Lstat(filepath.Join(parent, ".git")); err == nil {
				dir = parent
				break
			}
			parent = filepath.Dir(parent)
		}
		groups[dir] = append(groups[dir], path)
	}
	ignored := make(map[string]bool)
	for dir, group := range groups {
		if dir != root {
			rel, err := filepath.Rel(root, dir)
			if err == nil {
				// A repository ignored as a whole stays excluded, just as in scans.
				query := filepath.ToSlash(rel) + "/"
				if gitIgnoredPaths(ctx, root, []string{query})[query] {
					for _, path := range group {
						ignored[path] = true
					}
					continue
				}
			}
		}
		queries := make([]string, 0, len(group))
		for _, path := range group {
			rel, err := filepath.Rel(dir, filepath.Join(root, filepath.FromSlash(path)))
			if err != nil {
				continue
			}
			rel = filepath.ToSlash(rel)
			if strings.HasSuffix(path, "/") {
				rel += "/"
			}
			queries = append(queries, rel)
		}
		for path := range gitIgnoredPaths(ctx, dir, queries) {
			rel, err := filepath.Rel(root, filepath.Join(dir, filepath.FromSlash(path)))
			if err == nil {
				rel = filepath.ToSlash(rel)
				if strings.HasSuffix(path, "/") {
					rel += "/"
				}
				ignored[rel] = true
			}
		}
	}
	return ignored
}
