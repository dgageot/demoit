package main

import (
	"context"
	"flag"
	"fmt"
	"os/exec"
	"time"

	"github.com/gen2brain/beeep"
	"github.com/getlantern/systray"
	"github.com/golang/glog"
	"github.com/google/go-cmp/cmp"
	"github.com/pkg/profile"

	"k8s.io/minikube/cmd/menubar/icons/disabled"
	"k8s.io/minikube/cmd/menubar/icons/erricon"
	"k8s.io/minikube/cmd/menubar/icons/minikube"

	//	"k8s.io/minikube/cmd/menubar/icons/warning"
	"k8s.io/minikube/cmd/menubar/icons/desat1"
	"k8s.io/minikube/cmd/menubar/icons/desat2"
	"k8s.io/minikube/cmd/menubar/icons/desat3"
	"k8s.io/minikube/cmd/menubar/icons/kubernetes"
)

var (
	createButton    *systray.MenuItem
	globalIconState = "default"

	currentContextMenu *ClusterMenu
	globalClusterMenu  = map[string]*ClusterMenu{}
	globalClusters     = map[string]*cluster{}
	globalTitle        = ""
)

type ClusterMenu struct {
	Name      string
	Top       *systray.MenuItem
	Delete    *systray.MenuItem
	Dashboard *systray.MenuItem
	Start     *systray.MenuItem
	Pause     *systray.MenuItem

	Tunnel *systray.MenuItem
}

func main() {
	flag.Parse()
	onExit := func() {
		glog.Infof("exiting")
	}
	// Should be called at the very beginning of main().
	systray.Run(onReady, onExit)
}

func updateClusterContext(cm *ClusterMenu, c *cluster) {
	if !c.CurrentContext {
		if currentContextMenu != nil {
			currentContextMenu.Top.Uncheck()
		}
		cm.Top.Uncheck()
		systray.SetTitle("")
		return
	}

	if currentContextMenu != nil && currentContextMenu.Name == c.Name {
		glog.Infof("update context: nothing to do")
		return
	}

	glog.Infof("current context: %s", c.Name)
	if c.Type == "minikube" {
		cm.Top.SetIcon(minikube.Data)
	} else {
		cm.Top.SetIcon(kubernetes.Data)
	}
	if currentContextMenu != nil {
		currentContextMenu.Top.Uncheck()
	}
	cm.Top.Check()
	systray.SetTitle(c.Name)
	currentContextMenu = cm
}

func updateClusterMenu(cm *ClusterMenu, c *cluster) {
	glog.Infof("updateClusterMenu for %s: %+v", c.Name, c)
	if c.CurrentContext {
		updateClusterContext(cm, c)
	} else {
		if cm.Top.Checked() {
			cm.Top.Uncheck()
		}
	}

	if !c.Controllable {
		glog.Infof("%s not controllable, skipping updates", c.Name)
	}

	if !c.Running {
		glog.Infof("%s is not running, hiding most buttons etc.", c.Name)
		cm.Start.Enable()
		cm.Start.SetTitle("Start")
		return
	}
	glog.Infof("%s is running, showing most buttons etc.", c.Name)
	cm.Start.SetTitle("Stop")
}

func createClusterMenu(c *cluster) *ClusterMenu {
	cm := &ClusterMenu{Name: c.Name, Top: systray.AddMenuItem(c.Name, "tooltip")}
	glog.Infof("createClusterMenu for %s", c.Name)
	go func() {
		<-cm.Top.ClickedCh
		glog.Infof("%s: name clicked", c.Name)
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "kubectl", "config", "use-context", c.Name)

		if c.CurrentContext {
			glog.Infof("unset context for %s", c.Name)
			cmd = exec.CommandContext(context.Background(), "kubectl", "config", "unset", "current-context")
			out, err := cmd.Output()
			globalIconState = "default"
			if err != nil {
				alert("unable to unset context to %s", err.Error())
			}
			c.CurrentContext = false
			updateClusterContext(cm, c)
			glog.Infof("context should now be unset for %s: %s", c.Name, out)
		} else {
			glog.Infof("setting context to %s", c.Name)
			out, err := cmd.Output()
			globalIconState = "default"
			if err != nil {
				alert("unable to set context to %s", err.Error())
			}
			updateClusterContext(cm, c)
			glog.Infof("context should now be %s: %s", c.Name, out)

		}
	}()

	cm.Start = cm.Top.AddSubMenuItem("Start", "Start the cluster")
	go func() {
		<-cm.Start.ClickedCh
		if c.Running {
			glog.Infof("%s: stop clicked", c.Name)
			globalIconState = "loading"
			cmd := exec.CommandContext(context.Background(), "minikube", "stop", "-p", c.Name, "--wait=false")
			err := cmd.Run()
			globalIconState = "default"
			if err != nil {
				alert("stop failed: %v", err.Error())
			}
			return
		}

		glog.Infof("%s: start clicked", c.Name)
		cm.Start.SetTitle("Starting ...")
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "minikube", "start", "-p", c.Name, "--wait=false")
		out, err := cmd.Output()
		globalIconState = "default"
		if err != nil {
			globalIconState = "error"
			alert("start failed: %v", err.Error())
			cm.Start.SetTitle(fmt.Sprintf("Start (last start: %v)", err))
			return
		}
		notify(fmt.Sprintf("%s local cluster started!", c.Name), string(out))
	}()

	cm.Pause = cm.Top.AddSubMenuItem("Pause", "Pause the cluster")
	go func() {
		<-cm.Pause.ClickedCh
		glog.Infof("%s: pause clicked", c.Name)
		cm.Pause.Disable()
		cm.Pause.SetTitle("Starting ...")
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "minikube", "pause", "-p", c.Name)
		err := cmd.Run()
		globalIconState = "default"
		if err != nil {
			globalIconState = "error"
			glog.Errorf("start failed: %v", err)
			cm.Start.SetTitle(fmt.Sprintf("Start (last start: %v)", err))
			return
		}
		notify(fmt.Sprintf("%s local cluster paused!", c.Name), "")
		cm.Pause.SetTitle("Unpause")
	}()

	cm.Delete = cm.Top.AddSubMenuItem("Delete", "Delete the cluster")
	go func() {
		<-cm.Delete.ClickedCh
		glog.Infof("%s: delete clicked", c.Name)
		cm.Delete.Disable()
		cm.Delete.SetTitle("Deleting ...")
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "minikube", "delete", "-p", c.Name)
		out, err := cmd.CombinedOutput()
		globalIconState = "default"
		cm.Delete.SetTitle("Delete")
		cm.Delete.Hide()
		if err != nil {
			alert(fmt.Sprintf("delete failed: %v", err), string(out))
		}
		notify(fmt.Sprintf("%s local cluster deleted!", c.Name), "")
	}()

	cm.Dashboard = cm.Top.AddSubMenuItem("Dashboard", "Display Dashboard")
	go func() {
		<-cm.Dashboard.ClickedCh
		glog.Infof("%s: dashboard clicked", c.Name)
		cm.Dashboard.Disable()
		cm.Dashboard.SetTitle("Dashboard starting ...")
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "minikube", "dashboard", "-p", c.Name)
		out, err := cmd.CombinedOutput()
		globalIconState = "default"
		if err != nil {
			alert(fmt.Sprintf("dashboard failed: %v", err), string(out))
		}
		cm.Dashboard.SetTitle("Dashboard")
		cm.Dashboard.Enable()
	}()
	cm.Tunnel = cm.Top.AddSubMenuItem("Tunnel", "Start Tunnel")
	go func() {
		<-cm.Tunnel.ClickedCh
		glog.Infof("%s: tunnel clicked", c.Name)
		cm.Tunnel.Disable()
		cm.Tunnel.SetTitle("Tunnel starting ...")
		globalIconState = "loading"
		cmd := exec.CommandContext(context.Background(), "minikube", "tunnel", "-p", c.Name)
		err := cmd.Start()
		globalIconState = "default"
		if err != nil {
			alert("tunnel failed", err.Error())
		}
		cm.Tunnel.SetTitle("Stop Tunnel")
		cm.Tunnel.Enable()
	}()
	return cm
}

func notify(title string, body string) {
	glog.Infof("notify: %s - %s", title, body)
	err := beeep.Notify(title, body, "assets/information.png")
	if err != nil {
		glog.Errorf("notify: %s", err)
	}
}

func alert(title string, body string) {
	glog.Infof("alert: %s - %s", title, body)
	err := beeep.Alert(title, body, "assets/warning.png")
	if err != nil {
		glog.Errorf("alert: %s", err)
	}
}

func updateMenus(cs map[string]*cluster) {
	for k, c := range cs {
		if globalClusterMenu[k] == nil {
			globalClusterMenu[k] = createClusterMenu(c)
		}
		updateClusterMenu(globalClusterMenu[k], c)
	}
	for k, v := range globalClusterMenu {
		if cs[k] == nil {
			glog.Infof("%s was in our menus, but not clusters", k)
			if currentContextMenu != nil && k == currentContextMenu.Name {
				updateClusterContext(v, &cluster{})
			}
			v.Top.Hide()
		}
	}
}

func onReady() {
	pr := profile.Start()
	glog.Infof("onReady")
	systray.SetTooltip("Local Kubernetes")
	createButton = systray.AddMenuItem("Create local cluster", "Create a local cluster")
	options := systray.AddMenuItem("Options", "Options")
	mShow := options.AddSubMenuItem("Show cluster name", "Show cluster name in menu bar")
	mShow.Check()
	mQuit := options.AddSubMenuItem("Quit", "Quit the whole app")

	systray.AddSeparator()

	go func(p interface{ Stop() }) {
		<-mQuit.ClickedCh
		p.Stop()
		systray.Quit()
	}(pr)

	clusterItems := map[string]*systray.MenuItem{}

	go func(items map[string]*systray.MenuItem) {
		<-createButton.ClickedCh
		createButton.Disable()
		createButton.SetTitle("Starting ...")
		globalIconState = "loading"
		name := "minikube"
		try := name
		for i := 0; i < 1000; i++ {
			if i > 0 {
				try = fmt.Sprintf("%s%d", name, i)
			}

			_, ok := items[try]
			if !ok {
				break
			}
		}

		cmd := exec.CommandContext(context.Background(), "minikube", "start", "-p", try, "--wait=false")
		out, err := cmd.CombinedOutput()
		globalIconState = "default"
		if err != nil {
			alert(fmt.Sprintf("start failed: %v", err), string(out))
		}
		createButton.SetTitle("Start local cluster")
	}(clusterItems)

	go func() {
		for {
			cs, err := activeClusters(context.Background())
			if err != nil {
				glog.Errorf("activeClusters: %v", err)
			}

			if !cmp.Equal(cs, globalClusters) {
				glog.Infof("THE CLUSTERS HAVE CHANGED!!!!!!!!!")
				globalClusters = cs
				updateMenus(globalClusters)
			}
			time.Sleep(2 * time.Second)
		}
	}()

	go func() {
		for {
			switch globalIconState {
			case "default":
				systray.SetIcon(disabled.Data)
			case "enabled":
				systray.SetIcon(minikube.Data)
			case "other":
				systray.SetIcon(kubernetes.Data)
			case "loading":
				systray.SetIcon(desat1.Data)
				globalIconState = "loading2"
			case "loading2":
				systray.SetIcon(desat2.Data)
				globalIconState = "loading3"
			case "loading3":
				systray.SetIcon(desat3.Data)
				globalIconState = "loading4"
			case "loading4":
				systray.SetIcon(minikube.Data)
				globalIconState = "loading5"
			case "loading5":
				systray.SetIcon(desat3.Data)
				globalIconState = "loading6"
			case "loading6":
				systray.SetIcon(desat2.Data)
				globalIconState = "loading"
			case "error":
				systray.SetIcon(erricon.Data)
			}
			time.Sleep(500 * time.Millisecond)
		}
	}()
}
