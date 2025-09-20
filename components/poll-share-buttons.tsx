"use client";

import { Button } from "@/components/ui/button";
import { FaFacebook, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { Copy, QrCode } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogDescription, AlertDialogFooter, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { QRCodeCanvas } from "qrcode.react";

interface PollShareButtonsProps {
  pollId: string;
  pollQuestion: string;
}

export function PollShareButtons({ pollId, pollQuestion }: PollShareButtonsProps) {
  const pollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/polls/${pollId}`
      : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      toast.success("Poll link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy link.");
    }
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      pollUrl
    )}`;
    window.open(facebookUrl, "_blank", "noopener,noreferrer");
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `Vote on this poll: "${pollQuestion}" ${pollUrl}`
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const shareOnX = () => {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `Vote on this poll: "${pollQuestion}"`
    )}&url=${encodeURIComponent(pollUrl)}`;
    window.open(xUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mt-4">
      <p className="text-sm font-medium mb-2">Share this poll:</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyToClipboard} variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" /> Copy Link
        </Button>
        <Button
          onClick={shareOnFacebook}
          className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
          size="sm"
        >
          <FaFacebook className="mr-2 h-4 w-4" /> Facebook
        </Button>
        <Button
          onClick={shareOnWhatsApp}
          className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
          size="sm"
        >
          <FaWhatsapp className="mr-2 h-4 w-4" /> WhatsApp
        </Button>
        <Button
          onClick={shareOnX}
          className="bg-black hover:bg-black/80 text-white"
          size="sm"
        >
          <FaXTwitter className="mr-2 h-4 w-4" /> X.com
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <QrCode className="mr-2 h-4 w-4" /> QR Code
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Scan QR Code to Vote</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="flex justify-center">
              <QRCodeCanvas value={pollUrl} size={256} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
