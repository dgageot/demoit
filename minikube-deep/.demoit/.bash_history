minikube config set memory 16384
minikube start --kubernetes-version v1.17.0-beta.2 --addons helm-tiller -p kubecon --wait=false
minikube profile list
minikube delete --all
minikube-kic start --vm-driver=docker -p k1
kubectl get pods
kubectl create deployment hello-minikube --image=k8s.gcr.io/echoserver:1.4
kubectl expose deployment hello-minikube --type=NodePort --port=8080
kubectl get pods -A
docker ps
