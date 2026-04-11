import { useRef } from "react";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";

interface ResumeUploadProps {
  selectedFileName: string | null;
  hasUploadedFile: boolean;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
}

const ResumeUpload = ({
  selectedFileName,
  hasUploadedFile,
  onFileSelect,
  onRemove,
}: ResumeUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleRemove = () => {
    onRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {selectedFileName ? (
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{selectedFileName}</p>
                <p className="text-sm text-muted-foreground">
                  {hasUploadedFile ? "Resume will be reused for extraction." : "Resume will upload before extraction."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={triggerFilePicker}>
                <RefreshCw className="h-4 w-4" />
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerFilePicker}
          className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border/70 bg-secondary/10 px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-foreground">Upload a resume PDF</p>
              <p className="text-sm text-muted-foreground">Optional if you already have a portfolio URL. Recommended for better matching.</p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default ResumeUpload;
