// app/lab/components/HazardPopup.tsx
// Modal popup shown when a hotspot is clicked.

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HazardInfo } from "@/lib/hazards";

interface HazardPopupProps {
    info: HazardInfo;
    onClose: () => void;
}

export default function HazardPopup({
    info,
    onClose,
}: HazardPopupProps) {
    useEffect(() => {
        const handleKey = (
            e: KeyboardEvent
        ) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleKey
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleKey
            );
    }, [onClose]);

  		 const moduleLink = 
		 	info.moduleId
   		 		? `/modules/hazard-modules/${info.moduleId}`
    			: null;

    return (
        <div
            className="popup-overlay"
            onClick={(e) => {
                if (
                    e.target ===
                    e.currentTarget
                ) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="popup-title"
        >
            <div className="popup-content">
                <button
                    className="close-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>

                <h2 id="popup-title">
                    {info.title}
                </h2>

                <p id="popup-text">
                    {info.text}
                </p>

                {moduleLink && (
                    <Link
                        href={moduleLink}
                        className="popup-module-link"
                        onClick={onClose}
                    >
                        Learn More →
                    </Link>
                )}
            </div>
        </div>
    );
}