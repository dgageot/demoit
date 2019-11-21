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
minikube-multi start -n 2 --network-plugin=cni --extra-config=kubeadm.pod-network-cidr=10.244.0.0/16 --kubernetes-version=1.16.2 -p multi
kubectl get no -owide
kubectl apply -f src/mutli/kube-flannel.yaml
kubectl get no -owide --watch
kubectl apply -f src/multi/hello-deployment.yaml 
kubectl apply -f src/mutli/hello0-svc.yaml
minikube-multi service list
curl http://$(minikube-multi ip):31000 
