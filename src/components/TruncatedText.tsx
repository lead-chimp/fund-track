"use client";

import { useState } from "react";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export default function TruncatedText({ 
  text, 
  maxLength = 50, 
  className = "" 
}: TruncatedTextProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text || "-"}</span>;
  }

  const truncatedText = text.substring(0, maxLength) + "...";

  return (
    <div className="relative inline-block">
      <span
        className={`cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {truncatedText}
      </span>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs break-words">
          <div className="whitespace-pre-wrap">{text}</div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}