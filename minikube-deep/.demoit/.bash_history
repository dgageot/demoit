minikube config set memory 16384
minikube start --kubernetes-version v1.17.0-beta.2 --addons helm-tiller -p kubecon --wait=false
minikube profile list
minikube delete --all
