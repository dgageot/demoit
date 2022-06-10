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

package handlers

import (
	"fmt"
	"image/png"
	"net/http"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/qr"
)

// QRCode generated QR Code images.
func QRCode(w http.ResponseWriter, r *http.Request) {
	url := r.FormValue("url")

	fmt.Println("QR Code", url)

	qrCode, err := qr.Encode(url, qr.Q, qr.Auto)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to create the qrcode: %v", err), http.StatusInternalServerError)
		return
	}

	qrCode, err = barcode.Scale(qrCode, 500, 500)
	if err != nil {
		http.Error(w, fmt.Sprintf("Unable to scale the qrcode: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	if err := png.Encode(w, qrCode); err != nil {
		http.Error(w, fmt.Sprintf("Unable to encode the qrcode: %v", err), http.StatusInternalServerError)
		return
	}
}
