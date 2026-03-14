import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Camera, XCircle, AlertCircle, ArrowLeft, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { attendanceService, MarkAttendanceResult } from '@/api/attendanceService';
import { format } from 'date-fns';
import jsQR from 'jsqr';

const ScanAttendance: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<MarkAttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const processQRData = async (qrData: string) => {
    setProcessing(true);
    setScanning(false);
    stopCamera();
    try {
      const parsed = JSON.parse(qrData);
      const { propertyId, type } = parsed;
      if (!propertyId || !type) throw new Error('Invalid QR code');
      const res = await attendanceService.markAttendance(propertyId, type);
      if (res.success) {
        setResult(res);
        setError(null);
      } else {
        setError(res.error || 'Failed to mark attendance');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid QR code. Please scan a valid property QR.');
    } finally {
      setProcessing(false);
    }
  };

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      processQRData(code.data);
      return;
    }
    animationRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const startCamera = async () => {
    setError(null);
    setResult(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Scan Property QR</h1>
          <p className="text-xs text-muted-foreground">Mark your daily attendance</p>
        </div>
      </div>

      {/* Success Result */}
      {result && (
        <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {result.already_marked ? 'Already Checked In' : 'Entry Recorded'}
              </h2>
              {result.already_marked && (
                <p className="text-xs text-muted-foreground mt-1">You've already marked attendance today</p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {result.property_name && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium">{result.property_name}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{result.student_name}</span>
              </div>
              {result.phone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{result.phone}</span>
                </div>
              )}
              {result.seat_label && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Seat / Bed</span>
                  <Badge variant="outline">{result.seat_label}</Badge>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Check-in Time</span>
                <span className="font-medium">
                  {result.check_in_time ? format(new Date(result.check_in_time), 'hh:mm a') : '-'}
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => { setResult(null); }}>
              Scan Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !scanning && !result && (
        <Card className="border-red-300 dark:border-red-700">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Attendance Failed</h2>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={startCamera}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scanner */}
      {scanning && (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            </div>
            {processing && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Point your camera at the property QR code
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setScanning(false); stopCamera(); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Initial state */}
      {!scanning && !result && !error && (
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <QrCode className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Mark Your Attendance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Scan the QR code at the property entrance to record your daily check-in
              </p>
            </div>
            <Button className="w-full gap-2" onClick={startCamera}>
              <Camera className="h-4 w-4" /> Open Scanner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScanAttendance;
