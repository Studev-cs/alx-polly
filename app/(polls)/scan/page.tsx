"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useRouter } from "next/navigation";

export default function ScanQRPage() {
  const scannerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    if (scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        scannerRef.current.id,
        { fps: 10, qrbox: 250 },
        false
      );

      const onScanSuccess = (decodedText: string) => {
        setScanResult(decodedText);
        scanner.clear();
      };

      const onScanError = (error: any) => {
        // console.error(error);
      };

      scanner.render(onScanSuccess, onScanError);

      return () => {
        scanner.clear();
      };
    }
  }, []);

  useEffect(() => {
    if (scanResult) {
      // Assuming the QR code contains a valid URL
      if (scanResult.startsWith("http")) {
        router.push(scanResult);
      } else {
        // Handle non-URL QR codes if needed
        alert(`Scanned content: ${scanResult}`);
      }
    }
  }, [scanResult, router]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Scan QR Code</h1>
      <div id="qr-reader" ref={scannerRef} />
    </div>
  );
}
