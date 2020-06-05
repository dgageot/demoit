/*
Copyright 2018 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package vscode

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/user"
	"path/filepath"
	"sync"

	"github.com/dgageot/demoit/files"
	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

var startLock sync.Once

func Start() {
	startLock.Do(func() {
		if err := startVsCodeServer(context.Background()); err != nil {
			log.Fatalln(err)
		}
	})
}

func startVsCodeServer(ctx context.Context) error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("can't get current directory: %w", err)
	}

	user, err := user.Current()
	if err != nil {
		return fmt.Errorf("can't get current user: %w", err)
	}

	client, err := newDockerlient(ctx)
	if err != nil {
		return fmt.Errorf("docker is not available: %w", err)
	}

	// Ignore error
	_ = client.ContainerRemove(ctx, "demoit-vscode", types.ContainerRemoveOptions{Force: true})

	body, err := client.ContainerCreate(ctx, &containertypes.Config{
		Image: "codercom/code-server:3.4.1",
		User:  fmt.Sprintf("%s:%s", user.Uid, user.Gid),
		Cmd:   []string{"--auth=none", "--disable-telemetry"},
		ExposedPorts: nat.PortSet{
			nat.Port("8080/tcp"): struct{}{},
		},
	}, &containertypes.HostConfig{
		Binds: []string{filepath.Join(cwd, files.Root) + ":/app"},
		PortBindings: nat.PortMap{
			nat.Port("8080/tcp"): []nat.PortBinding{{HostPort: "18080"}},
		},
	}, nil, "demoit-vscode")
	if err != nil {
		return fmt.Errorf("unable to create a docker container for vscode: %w", err)
	}

	if err := client.ContainerStart(ctx, body.ID, types.ContainerStartOptions{}); err != nil {
		return fmt.Errorf("unable to start a docker container for vscode: %w", err)
	}

	return nil
}

func newDockerlient(ctx context.Context) (client.CommonAPIClient, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("error getting docker client: %w", err)
	}
	cli.NegotiateAPIVersion(ctx)

	return cli, nil
}
