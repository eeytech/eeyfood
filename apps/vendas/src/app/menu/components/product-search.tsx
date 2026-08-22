"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";

interface ProductSearchProps {
  onSearchQueryChange: (query: string) => void;
}

const ProductSearch = ({ onSearchQueryChange }: ProductSearchProps) => {
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleUpdate = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchQueryChange(value), 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    scheduleUpdate(value);
  };

  const handleClear = () => {
    setInputValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearchQueryChange("");
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <SearchIcon
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        size={16}
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Buscar no cardápio..."
        value={inputValue}
        onChange={handleChange}
        className="rounded-full pl-10 pr-10"
        aria-label="Buscar produtos no cardápio"
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Limpar busca"
        >
          <XIcon size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default ProductSearch;
