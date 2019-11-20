/*
Copyright 2019 The Kubernetes Authors All rights reserved.

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

package kic

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/docker/machine/libmachine/drivers"
	"github.com/docker/machine/libmachine/state"
	kiccommand "github.com/medyagh/kic/pkg/command"
	"github.com/medyagh/kic/pkg/config/cri"
	"github.com/medyagh/kic/pkg/node"
	"github.com/pkg/errors"
	pkgdrivers "k8s.io/minikube/pkg/drivers"
	"k8s.io/minikube/pkg/minikube/command"
)

// https://minikube.sigs.k8s.io/docs/reference/drivers/kic/
type Driver struct {
	*drivers.BaseDriver
	*pkgdrivers.CommonDriver
	URL           string
	exec          kiccommand.Runner
	OciBinary     string
	ImageSha      string
	CPU           int
	Memory        int
	APIServerPort int32
}

// Config is configuration for the kic driver
type Config struct {
	MachineName   string
	CPU           int
	Memory        int
	StorePath     string
	OciBinary     string // oci tool to use (docker, podman,...)
	ImageSha      string // image name with sha to use for the node
	APIServerPort int32  // port to connect to forward from container to user's machine
}

// NewDriver returns a fully configured Kic driver
func NewDriver(c Config) *Driver {
	d := &Driver{
		BaseDriver: &drivers.BaseDriver{
			MachineName: c.MachineName,
			StorePath:   c.StorePath,
		},
		exec:          command.NewKICRunner(c.MachineName, c.OciBinary),
		OciBinary:     c.OciBinary,
		ImageSha:      c.ImageSha,
		CPU:           c.CPU,
		Memory:        c.Memory,
		APIServerPort: c.APIServerPort,
	}
	return d
}

// Create a host using the driver's config
func (d *Driver) Create() error {
	ks := &node.Spec{ // kic spec
		Profile:           d.MachineName,
		Name:              d.MachineName,
		Image:             d.ImageSha,
		CPUs:              strconv.Itoa(d.CPU),
		Memory:            strconv.Itoa(d.Memory) + "mb",
		Role:              "control-plane",
		ExtraMounts:       []cri.Mount{},
		ExtraPortMappings: []cri.PortMapping{},
		APIServerAddress:  "127.0.0.1",
		APIServerPort:     d.APIServerPort,
		IPv6:              false,
	}

	_, err := ks.Create(command.NewKICRunner(d.MachineName, d.OciBinary))
	if err != nil {
		return errors.Wrap(err, "create kic from spec")
	}
	return nil
}

// DriverName returns the name of the driver
func (d *Driver) DriverName() string {
	if d.OciBinary == "podman" {
		return "podman"
	}
	return "docker"
}

// GetIP returns an IP or hostname that this host is available at
func (d *Driver) GetIP() (string, error) {
	id, err := d.nodeID(d.MachineName)
	if err != nil {
		return "", errors.Wrapf(err, "container %s not found", d.MachineName)
	}
	cmd := exec.Command(d.OciBinary, "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}},{{.GlobalIPv6Address}}{{end}}", id)
	out, err := cmd.CombinedOutput()
	ips := strings.Split(strings.Trim(string(out), "\n"), ",")
	return ips[0], err
}

// GetSSHHostname returns hostname for use with ssh
func (d *Driver) GetSSHHostname() (string, error) {
	return "", fmt.Errorf("driver does not have SSHHostName")
}

// GetSSHPort returns port for use with ssh
func (d *Driver) GetSSHPort() (int, error) {
	return 0, fmt.Errorf("driver does not support GetSSHPort")
}

// GetURL returns ip of the container running kic control-panel
func (d *Driver) GetURL() (string, error) {
	return d.GetIP()
}

// GetState returns the state that the host is in (running, stopped, etc)
func (d *Driver) GetState() (state.State, error) {
	cmd := exec.Command(d.OciBinary, "inspect", "-f", "{{.State.Status}}", d.MachineName)
	out, err := cmd.CombinedOutput()
	o := strings.Trim(string(out), "\n")
	if err != nil {
		return state.Error, errors.Wrapf(err, "error stop node %s", d.MachineName)
	}
	if o == "running" {
		return state.Running, nil
	}
	if o == "exited" {
		return state.Stopped, nil
	}
	if o == "paused" {
		return state.Paused, nil
	}
	if o == "restarting" {
		return state.Starting, nil
	}
	if o == "dead" {
		return state.Error, nil
	}
	return state.None, fmt.Errorf("unknown state")

}

// Kill stops a host forcefully, including any containers that we are managing.
func (d *Driver) Kill() error {
	cmd := exec.Command(d.OciBinary, "kill", d.MachineName)
	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "killing kic node %s", d.MachineName)
	}
	return nil
}

// Remove will delete the Kic Node Container
func (d *Driver) Remove() error {
	id, err := d.nodeID(d.MachineName)
	if err != nil {
		return errors.Wrapf(err, "container %s not found", d.MachineName)
	}
	cmd := exec.Command(d.OciBinary, "rm", "-f", "-v", id)
	if out, err := cmd.CombinedOutput(); err != nil {
		return errors.Wrapf(err, "removing container %s output: %q", d.MachineName, string(out))
	}
	return nil
}

// Restart a host
func (d *Driver) Restart() error {
	s, err := d.GetState()
	if err != nil {
		return errors.Wrap(err, "get kic state")
	}
	if s == state.Paused {
		return d.Unpause()
	}
	if s == state.Stopped {
		return d.Start()
	}
	if s == state.Running {
		if err = d.Stop(); err != nil {
			return fmt.Errorf("restarting a running kic node at stop phase %v", err)
		}
		if err = d.Start(); err != nil {
			return fmt.Errorf("restarting a running kic node at start phase %v", err)
		}
		return nil
	}

	// TODO:medyagh handle Stopping/Starting... states
	return fmt.Errorf("restarted not implemented for kic yet")
}

// Unpause a kic container
func (d *Driver) Unpause() error {
	cmd := exec.Command(d.OciBinary, "pause", d.MachineName)
	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "unpausing %s", d.MachineName)
	}
	return nil
}

// Start a _stopped_ kic container
// not meant to be used for Create().
func (d *Driver) Start() error {
	s, err := d.GetState()
	if err != nil {
		return errors.Wrap(err, "get kic state")
	}
	if s == state.Stopped {
		cmd := exec.Command(d.OciBinary, "start", d.MachineName)
		if err := cmd.Run(); err != nil {
			return errors.Wrapf(err, "starting a stopped kic node %s", d.MachineName)
		}
		return nil
	}
	return fmt.Errorf("cant start a not-stopped (%s) kic node", s)
}

// Stop a host gracefully, including any containers that we are managing.
func (d *Driver) Stop() error {
	cmd := exec.Command(d.OciBinary, "stop", d.MachineName)
	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "stopping %s", d.MachineName)
	}
	return nil
}

// RunSSHCommandFromDriver implements direct ssh control to the driver
func (d *Driver) RunSSHCommandFromDriver() error {
	return fmt.Errorf("driver does not support RunSSHCommandFromDriver commands")
}

// looks up for a container node by name, will return error if not found.
func (d *Driver) nodeID(nameOrID string) (string, error) {
	cmd := exec.Command(d.OciBinary, "inspect", "-f", "{{.Id}}", nameOrID)
	id, err := cmd.CombinedOutput()
	if err != nil {
		id = []byte{}
	}
	return strings.Trim(string(id), "\n"), err
}
