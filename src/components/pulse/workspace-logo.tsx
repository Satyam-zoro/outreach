import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "pulse_workspace_logo";

export function getStoredWorkspaceLogo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredWorkspaceLogo(url: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (url) {
      localStorage.setItem(STORAGE_KEY, url);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("pulse-logo-updated", { detail: url }));
  } catch (err) {
    console.error("Failed to save workspace logo:", err);
  }
}

export function WorkspaceLogo({
  className,
  size = "md",
  editable = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(getStoredWorkspaceLogo);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      setLogoUrl(detail ?? getStoredWorkspaceLogo());
    };
    window.addEventListener("pulse-logo-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("pulse-logo-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setStoredWorkspaceLogo(result);
        setLogoUrl(result);
        toast.success("Workspace logo updated successfully!");
      }
    };
    reader.readAsDataURL(file);

    // Reset input value so the same file can be re-uploaded if desired
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStoredWorkspaceLogo(null);
    setLogoUrl(null);
    toast.success("Workspace logo removed.");
  };

  const sizeClasses = {
    sm: "size-8 text-[9px]",
    md: "size-12 text-[10px]",
    lg: "size-16 text-xs",
  }[size];

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload workspace logo"
      />

      <button
        type="button"
        disabled={!editable}
        onClick={() => editable && fileInputRef.current?.click()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative flex items-center justify-center overflow-hidden rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          logoUrl
            ? "border-border bg-card shadow-sm hover:border-primary/50"
            : "border-dashed border-border-strong bg-elevated/60 hover:border-primary hover:bg-elevated text-muted-foreground hover:text-foreground",
          sizeClasses,
          editable ? "cursor-pointer" : "cursor-default",
          className,
        )}
        title={editable ? (logoUrl ? "Click to change workspace logo" : "Click to upload workspace logo") : "Workspace logo"}
      >
        {logoUrl ? (
          <>
            <img
              src={logoUrl}
              alt="Workspace logo"
              className="h-full w-full object-cover"
            />
            {editable ? (
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/60 text-white transition-opacity duration-150",
                  isHovered ? "opacity-100" : "opacity-0",
                )}
              >
                <Camera className="size-4" />
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 p-1 text-center font-medium">
            <Upload className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-wider">Logo</span>
          </div>
        )}
      </button>

      {editable && logoUrl && isHovered ? (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute -top-1.5 -right-1.5 z-10 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-110"
          title="Remove logo"
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
