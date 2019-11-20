package main

import (
	"context"
	"encoding/json"
	"os/exec"
	"strings"

	"github.com/golang/glog"

	//	"k8s.io/minikube/cmd/menubar/icons/warning"

	"k8s.io/minikube/pkg/minikube/config"
	"k8s.io/minikube/pkg/minikube/kubeconfig"
)

// MinikubeStatus represents the status
type MinikubeStatus struct {
	Host       string
	Kubelet    string
	APIServer  string
	Kubeconfig string
}

type cluster struct {
	Name           string
	Config         *config.Config
	CurrentContext bool
	Running        bool
	Controllable   bool
	Type           string
	Error          string
	Warning        string
}

/*
func healthIssues() {
	nodes, err := o.CoreClient.Nodes().List(metav1.ListOptions{})
}
*/

func activeClusters(ctx context.Context) (map[string]*cluster, error) {
	cs := map[string]*cluster{}

	mc, err := minikubeClusters(ctx)
	if err != nil {
		return cs, err
	}

	for _, c := range mc {
		//		glog.Infof("found minikube cluster: %+v", c)
		cs[c.Name] = c
	}

	cfg, err := kubeconfig.ReadOrNew()
	if err != nil {
		return cs, err
	}

	for k, v := range cfg.Clusters {
		if cs[k] != nil {
			continue
		}
		// Stale minikube entry
		if strings.Contains(v.CertificateAuthority, "minikube") {
			continue
		}
		c := &cluster{Name: k}
		glog.Infof("found kubeconfig cluster: %+v", v)
		cs[k] = c
	}

	if cfg.CurrentContext != "" && cs[cfg.CurrentContext] != nil {
		cs[cfg.CurrentContext].CurrentContext = true
	}
	return cs, nil
}

func minikubeClusters(ctx context.Context) ([]*cluster, error) {
	cmd := exec.CommandContext(ctx, "minikube", "profile", "list", "--output", "json")
	out, err := cmd.Output()
	if err != nil {
		glog.Warningf("err: %v output: %s\n", out, err)
		return nil, err
	}
	var ps map[string][]config.Profile
	err = json.Unmarshal(out, &ps)
	if err != nil {
		return nil, err
	}

	cs := []*cluster{}
	for _, p := range ps["valid"] {
		//	glog.Infof("valid minikube cluster: %+v", p)
		c := &cluster{
			Name:         p.Name,
			Config:       p.Config,
			Controllable: true,
			Type:         "minikube",
		}
		cmd := exec.CommandContext(ctx, "minikube", "status", "-p", c.Name, "--output", "json")
		out, err := cmd.Output()
		if err != nil {
			glog.V(2).Infof("%s status err: %s output: %s\n", c.Name, out, err)
		}

		var st MinikubeStatus
		err = json.Unmarshal(out, &st)
		//		glog.Infof("parsed status for %s: %+v", c.Name, st)
		if err != nil {
			glog.Errorf("%s failed: %v", cmd.Args, err)
		}
		if st.Host != "Running" {
			c.Running = false
		}
		if st.APIServer != "Running" && st.Host == "Running" {
			c.Error = "APIServer is not running"
		}
		cs = append(cs, c)
	}
	return cs, nil
}
