import { ReactNode } from "react";
import { useContentProtection } from "@/hooks/useContentProtection";

interface ProtectedContentProps {
  children: ReactNode;
  showWatermark?: boolean;
}

export const ProtectedContent = ({ children, showWatermark = true }: ProtectedContentProps) => {
  const { userId } = useContentProtection();

  return (
    <div className="relative" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
      {children}
      
      {/* Invisible watermark */}
      {showWatermark && userId && (
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.01] select-none"
          style={{
            zIndex: 9999,
            fontSize: "8px",
            lineHeight: "20px",
            overflow: "hidden",
            wordBreak: "break-all",
          }}
          aria-hidden="true"
        >
          {Array(100)
            .fill(null)
            .map((_, i) => (
              <span key={i}>
                USER-{userId.slice(0, 8)}{" "}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};
