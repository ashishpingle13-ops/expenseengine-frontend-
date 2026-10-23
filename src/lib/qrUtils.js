import jsQR from "jsqr";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

// 1. Reads a QR code image file and extracts the exact UPI string or VPA
export const decodeUpiFromQrImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Scale down huge phone screenshots to max 800px so jsQR reads them fast & accurately
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data && code.data.toLowerCase().includes("upi://pay")) {
          // Extract the 'pa' (VPA) parameter or save the clean VPA
          try {
            const url = new URL(code.data);
            const pa = url.searchParams.get("pa");
            resolve(pa || code.data);
          } catch {
            resolve(code.data);
          }
        } else {
          reject(new Error("No valid UPI QR code found in this image."));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
};

// 2. Generates a high-contrast QR Image DataURL with the exact amount baked in
export const generateDynamicUpiQrDataUrl = async ({ upiId, workerName, amount, note }) => {
  // Clean VPA if full upi:// string was stored
  let cleanPa = upiId;
  if (upiId.startsWith("upi://")) {
    try {
      const parsed = new URL(upiId);
      cleanPa = parsed.searchParams.get("pa") || upiId;
    } catch {}
  }

  const formattedAmount = Number(amount).toFixed(2);
  const upiString = `upi://pay?pa=${encodeURIComponent(cleanPa)}&pn=${encodeURIComponent(
    workerName || "Worker"
  )}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(note || "Worker Advance")}`;

  // Generate a 600x600 crisp PNG QR code with wide white margins (vital for GPay scanner)
  const dataUrl = await QRCode.toDataURL(upiString, {
    width: 600,
    margin: 4,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return { dataUrl, upiString, cleanPa };
};

// 3. Immediately shares the generated QR image to Google Pay / PhonePe
export const shareQrImageToUpiApp = async (dataUrl, workerName, amount) => {

  if (Capacitor.isNativePlatform()) {
    // Native Android APK: Write temp PNG to cache and pop open Android Share Sheet immediately
    const base64Data = dataUrl.split(",")[1];
    const fileName = `upi_qr_${Date.now()}.png`;

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: `Pay ₹${amount} to ${workerName}`,
      text: `Pay ₹${amount} to ${workerName}`,
      url: savedFile.uri,
      dialogTitle: "Select Google Pay or PhonePe to Scan QR",
    });
  } else if (navigator.share) {
    // Mobile Chrome Web Fallback
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `pay_${workerName}_${amount}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Pay ₹${amount} to ${workerName}`,
        files: [file],
      });
    }
  }
};

// 4. Universal PDF Export (Works on both Web and Native Android APK!)
export const saveOrSharePdf = async (doc, fileName) => {
  if (Capacitor.isNativePlatform()) {
    const base64Pdf = doc.output("datauristring").split(",")[1];
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Pdf,
      directory: Directory.Cache,
    });
    await Share.share({
      title: fileName,
      url: savedFile.uri,
      dialogTitle: "Save or Share PDF Report",
    });
  } else {
    doc.save(fileName);
  }
};

// 5. Universal Excel/CSV Export (Works on both Web and Native Android APK!)
export const saveOrShareCsv = async (csvContent, fileName) => {
  if (Capacitor.isNativePlatform()) {
    const base64Csv = btoa(unescape(encodeURIComponent(csvContent)));
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Csv,
      directory: Directory.Cache,
    });
    await Share.share({
      title: fileName,
      url: savedFile.uri,
      dialogTitle: "Save or Share Excel Report",
    });
  } else {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};