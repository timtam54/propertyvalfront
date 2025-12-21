"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Building } from "lucide-react";

interface PropertyImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export default function PropertyImageCarousel({ images, alt, className = "" }: PropertyImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const hasMultipleImages = images && images.length > 1;
  const maxDots = 5; // Maximum number of dots to show

  const goToPrevious = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToIndex = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  }, []);

  if (!images || images.length === 0) {
    return (
      <div className={`w-full h-40 sm:h-56 flex items-center justify-center bg-gray-100 ${className}`}>
        <Building className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Current Image */}
      <img
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="w-full h-40 sm:h-56 object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Navigation Arrows - Only show on hover with multiple images */}
      {hasMultipleImages && isHovering && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dot Indicators - Show on hover */}
      {hasMultipleImages && (
        <div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 transition-opacity duration-200 ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {images.length <= maxDots ? (
            // Show all dots if <= maxDots
            images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => goToIndex(index, e)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-3'
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))
          ) : (
            // Show condensed dots for many images
            <>
              {/* First dot */}
              <button
                onClick={(e) => goToIndex(0, e)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentIndex === 0 ? 'bg-white w-3' : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label="Go to first image"
              />

              {/* Middle indicator */}
              <div className="flex items-center gap-1">
                {currentIndex > 1 && currentIndex < images.length - 2 ? (
                  <>
                    <span className="text-white/60 text-xs">•••</span>
                    <button
                      onClick={(e) => goToIndex(currentIndex, e)}
                      className="w-3 h-2 rounded-full bg-white"
                      aria-label={`Current image ${currentIndex + 1}`}
                    />
                    <span className="text-white/60 text-xs">•••</span>
                  </>
                ) : (
                  <span className="text-white/60 text-xs px-1">
                    {currentIndex + 1}/{images.length}
                  </span>
                )}
              </div>

              {/* Last dot */}
              <button
                onClick={(e) => goToIndex(images.length - 1, e)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentIndex === images.length - 1 ? 'bg-white w-3' : 'bg-white/60 hover:bg-white/80'
                }`}
                aria-label="Go to last image"
              />
            </>
          )}
        </div>
      )}

      {/* Image Counter Badge - Always visible if multiple images */}
      {hasMultipleImages && !isHovering && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
          1/{images.length}
        </div>
      )}
    </div>
  );
}
