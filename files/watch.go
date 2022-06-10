/*
Copyright 2018 Google LLC
Copyright 2022 David Gageot

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

	"github.com/dgageot/demoit/livereload"
	"github.com/rjeczalik/notify"
)

func Watch(root string) error {
	lr := livereload.New()
	go func() {
		log.Fatal(lr.ListenAndServe())
	}()

	events := make(chan notify.EventInfo, 1)
	if err := notify.Watch(root+"/...", events, notify.All); err != nil {
		return err
	}

	for event := range events {
		// TODO: Ignore files under .git
		// TODO: Debounce
		fmt.Println(event)
		lr.Reload(event.Path())
	}

	return nil
}
