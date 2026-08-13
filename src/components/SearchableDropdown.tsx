"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, Check, Plus } from "lucide-react";

interface SearchableDropdownProps {
  id?: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableDropdown({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Search options...",
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset state during render when open state changes to prevent cascading renders
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSearchQuery("");
      setFocusedIndex(-1);
    }
  }

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Compute filtered options
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Detect if custom search text is not in predefined options
  const isCustomOptionAvailable = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return false;
    
    const exactMatch = options.some(
      (opt) => opt.toLowerCase() === query.toLowerCase()
    );
    return !exactMatch;
  }, [options, searchQuery]);

  // Handle keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Escape") {
      setIsOpen(false);
      containerRef.current?.focus();
      return;
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalItems = filteredOptions.length + (isCustomOptionAvailable ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1 >= totalItems ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 < 0 ? totalItems - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < totalItems) {
        if (isCustomOptionAvailable && focusedIndex === filteredOptions.length) {
          // Custom option selected
          onChange(searchQuery.trim());
        } else {
          onChange(filteredOptions[focusedIndex]);
        }
        setIsOpen(false);
      } else if (filteredOptions.length > 0) {
        // Fallback: select first match if none focused
        onChange(filteredOptions[0]);
        setIsOpen(false);
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative flex flex-col gap-1.5 w-full text-left"
      onKeyDown={handleKeyDown}
    >
      <label htmlFor={id} className="text-[#857C91] text-[10px] uppercase font-mono tracking-wider">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] border transition text-left cursor-pointer text-xs ${
          isOpen 
            ? "border-[#F2C1A3] shadow-[0_0_12px_rgba(242,193,163,0.15)]" 
            : "border-white/10 hover:border-white/20"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "text-white"}`}
      >
        <span className="truncate">
          {value || "Select options..."}
        </span>
        <ChevronDown 
          size={14} 
          className={`text-[#857C91] transition-transform duration-300 ${isOpen ? "rotate-180 text-[#F2C1A3]" : ""}`} 
        />
      </button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-[calc(100%+4px)] left-0 w-full rounded-2xl bg-[#141525]/95 border border-white/10 backdrop-blur-lg shadow-2xl z-50 overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5 bg-white/[0.01]">
              <Search size={12} className="text-[#857C91] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-xs font-light text-white outline-none border-none placeholder-[#525871]"
              />
            </div>

            {/* Options List */}
            <div className="max-h-[220px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/5">
              {filteredOptions.length === 0 && !isCustomOptionAvailable && (
                <div className="px-4 py-3 text-center text-xs text-[#857C91] font-light">
                  No matching roles found.
                </div>
              )}

              {filteredOptions.map((opt, index) => {
                const isSelected = opt.toLowerCase() === value.toLowerCase();
                const isFocused = index === focusedIndex;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left transition ${
                      isSelected 
                        ? "bg-[#F2C1A3]/10 text-[#F2C1A3] font-medium" 
                        : isFocused 
                        ? "bg-white/10 text-white" 
                        : "text-[#857C91] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check size={12} className="text-[#F2C1A3]" />}
                  </button>
                );
              })}

              {/* Custom Value Option Add Inline */}
              {isCustomOptionAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(searchQuery.trim());
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 border-t border-white/5 text-xs text-left transition ${
                    focusedIndex === filteredOptions.length 
                      ? "bg-[#F2C1A3]/15 text-[#F2C1A3]" 
                      : "text-[#F2C1A3] bg-[#F2C1A3]/[0.02] hover:bg-[#F2C1A3]/10"
                  }`}
                >
                  <Plus size={12} className="text-[#F2C1A3] shrink-0" />
                  <span className="truncate">
                    Use custom: <span className="font-mono font-medium text-white">&quot;{searchQuery.trim()}&quot;</span>
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
