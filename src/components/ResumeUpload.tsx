import { useState, useRef, useEffect } from "react";
import { Upload, FileText, X, CheckCircle, File, Trash2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ResumeUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const ResumeUpload = ({ onFileSelect, selectedFile }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Simulate upload progress effect when a file is selected
  useEffect(() => {
    if (selectedFile) {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setUploadProgress(0);
    }
  }, [selectedFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleRemove = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
        id="resume-upload"
      />

      {selectedFile ? (
        <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
          {/* Progress bar background for "uploading" effect */}
          <div
            className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-300"
            style={{ width: `${uploadProgress}%`, opacity: uploadProgress === 100 ? 0 : 1 }}
          />

          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
              {uploadProgress === 100 && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-background">
                  <CheckCircle className="h-4 w-4 text-green-500 fill-green-500/10" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">
                {selectedFile.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                <span>•</span>
                <span className="font-medium text-primary">Ready to process</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={triggerFileInput}
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                title="Replace file"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Remove file"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={cn(
            "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          )}
        >
          <div className="pointer-events-none relative z-10 flex flex-col items-center justify-center gap-2">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
              <Upload className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <p className="font-medium text-foreground">
              Drop your resume here or <span className="text-primary underline-offset-4 group-hover:underline">browse</span>
            </p>
            <p className="text-sm text-muted-foreground/80">
              PDF files only, up to 10MB
            </p>
          </div>

          {/* Decorator pattern/gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/0 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100 group-hover:to-primary/5" />
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
