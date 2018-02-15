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

package files

import (
	"fmt"
	"log"
	"path/filepath"
	"time"

	"github.com/jaschaephraim/lrserver"
	"github.com/radovskyb/watcher"
)

func Watch(root string) error {
	lr := lrserver.New(lrserver.DefaultName, lrserver.DefaultPort)
	go func() {
		log.Fatal(lr.ListenAndServe())
	}()

	w := watcher.New()
	w.FilterOps(watcher.Create, watcher.Write, watcher.Remove, watcher.Rename, watcher.Move)
	if err := w.AddRecursive(root); err != nil {
		return err
	}
	if err := w.AddRecursive(filepath.Join(root, ".demoit")); err != nil {
		return err
	}
	if err := w.RemoveRecursive(filepath.Join(root, ".git")); err != nil {
		return err
	}

	go func() {
		for {
			select {
			case event := <-w.Event:
				fmt.Println(event)
				lr.Reload(event.Name())
			case err := <-w.Error:
				log.Fatalln(err)
			case <-w.Closed:
				return
			}
		}
	}()

	if err := w.Start(time.Millisecond * 100); err != nil {
		return err
	}

	return nil
}
