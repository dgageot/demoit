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
