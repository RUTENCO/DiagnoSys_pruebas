"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/translations";

const LANGUAGE_OPTIONS: { locale: Locale; label: string; flagClass: string }[] = [
  { locale: "es", label: "Español", flagClass: "fi fi-es" },
  { locale: "en", label: "English", flagClass: "fi fi-us" },
];

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = useState(false);

  const current = LANGUAGE_OPTIONS.find((option) => option.locale === locale) ?? LANGUAGE_OPTIONS[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target) ?? false;
      const isInsideMenu = menuRef.current?.contains(target) ?? false;
      if (!isInsideContainer && !isInsideMenu) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 144; // w-36
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      setMenuPosition({ top: rect.bottom + 8, left: Math.max(8, left) });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("lang.switch")}
        title={t("lang.switch")}
        className="cursor-pointer flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm hover:bg-white transition"
      >
        <span className={`${current.flagClass} rounded-sm`} style={{ width: "1.2em", height: "1.2em" }} />
        <span className="uppercase">{current.locale}</span>
      </button>

      {open &&
        mounted &&
        menuPosition &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="fixed z-100 w-36 overflow-hidden rounded-md border border-primary/10 bg-white shadow-lg"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <li key={option.locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.locale === locale}
                  onClick={() => {
                    setLocale(option.locale);
                    setOpen(false);
                  }}
                  className={`cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 ${
                    option.locale === locale ? "font-semibold text-primary" : "text-gray-700"
                  }`}
                >
                  <span className={`${option.flagClass} rounded-sm`} style={{ width: "1.2em", height: "1.2em" }} />
                  {option.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
