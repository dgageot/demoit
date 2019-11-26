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

package handlers

import (
	"bytes"
	"context"
	"fmt"
	"net/http"

	"github.com/chromedp/cdproto/emulation"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
	"github.com/dgageot/demoit/files"
	"github.com/jung-kurt/gofpdf"

	"github.com/dgageot/demoit/flags"
)

const (
	width  = 1920.0
	height = 1080.0
	zoom   = 2.0
)

type image struct {
	buf []byte
	err error
}

// ExportToPDF generates a pdf that contains one page per slide.
func ExportToPDF(w http.ResponseWriter, r *http.Request) {
	if err := exportPagesToPdf(r.Context(), w); err != nil {
		http.Error(w, fmt.Sprintf("Unable export to pdf: %v", err), http.StatusInternalServerError)
		return
	}
}

func exportPagesToPdf(ctx context.Context, w http.ResponseWriter) error {
	pageCount, err := readPageCount()
	if err != nil {
		return err
	}

	var images [](chan image)
	for p := 0; p < pageCount; p++ {
		images = append(images, make(chan image))
	}

	readPagesAsPNG(ctx, images)

	pdf, err := writePagesToPDF(images)
	if err != nil {
		return err
	}

	w.Header().Set("Content-Type", "application/pdf")
	return pdf.Output(w)
}

func readPagesAsPNG(ctx context.Context, images [](chan image)) {
	var actions [4][]chromedp.Action

	group := 0
	for i, result := range images {
		i := i
		result := result

		actions[group] = append(actions[group],
			chromedp.Navigate(fmt.Sprintf("http://%s/%d", flags.WebServerAddress(), i)),
			chromedp.ActionFunc(func(ctx context.Context) error {
				if err := emulation.SetDeviceMetricsOverride(width*int64(zoom), height*int64(zoom), 1, false).Do(ctx); err != nil {
					result <- image{err: err}
					return err
				}

				buf, err := page.CaptureScreenshot().WithClip(&page.Viewport{
					Width:  width * zoom,
					Height: height * zoom,
					Scale:  1,
				}).Do(ctx)
				if err != nil {
					result <- image{err: err}
					return err
				}

				fmt.Println("Exported page", i)
				result <- image{buf: buf}
				return nil
			}))

		group = (group + 1) % 4
	}

	for _, tasks := range actions {
		go func(tasks []chromedp.Action) {
			ctx, cancel := chromedp.NewContext(ctx)
			defer cancel()

			chromedp.Run(ctx, tasks...)
		}(tasks)
	}
}

func writePagesToPDF(images [](chan image)) (*gofpdf.Fpdf, error) {
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		UnitStr: "cm",
		Size:    gofpdf.SizeType{Wd: 29.7, Ht: 29.7 * height / width},
	})

	for i, result := range images {
		image := <-result
		if image.err != nil {
			return nil, image.err
		}

		imageName := fmt.Sprintf("image%d", i)
		pdf.AddPage()
		pdf.RegisterImageReader(imageName, "png", bytes.NewReader(image.buf))
		pdf.ImageOptions(imageName, 0, 0, 29.7, 0, false, gofpdf.ImageOptions{ImageType: "png", ReadDpi: true}, 0, "")

		if err := pdf.Error(); err != nil {
			return nil, err
		}
	}

	return pdf, nil
}

func readPageCount() (int, error) {
	steps, err := readSteps(files.Root)
	if err != nil {
		return 0, err
	}

	return len(steps), nil
}
