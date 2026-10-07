"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProductType } from "@/types";
import {
  divisionsForProductType,
  filterDivisionsByQuery,
  getDivisionLabel,
} from "@/lib/measurements/divisions";
import {
  CONTROL_SIDE_VALUES,
  FIXATION_OPTION_VALUES,
  formatControlsDisplay,
  formatFixationDisplay,
  joinCsvCodes,
  parseCsvCodes,
} from "@/lib/measurements/extendedFields";
import { useMediaMinWidth } from "@/hooks/useMediaMinWidth";
import { cn } from "@/lib/cn";

const DIVISION_LIST_MAX_PX = 208;

const fieldClass =
  "min-h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary";

type DivisionPickerProps = {
  productType: ProductType;
  divisionCode: string;
  divisionCustom: string;
  disabled?: boolean;
  onChange: (code: string, custom: string) => void;
};

export function MeasurementDivisionPicker({
  productType,
  divisionCode,
  divisionCustom,
  disabled,
  onChange,
}: DivisionPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [listOpensAbove, setListOpensAbove] = useState(false);

  const options = useMemo(() => divisionsForProductType(productType), [productType]);
  const filtered = useMemo(
    () => filterDivisionsByQuery(options, open ? query : ""),
    [options, query, open]
  );

  const selectedLabel = getDivisionLabel(divisionCode, divisionCustom);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const vv = window.visualViewport;
      const visibleTop = vv?.offsetTop ?? 0;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const spaceBelow = visibleBottom - rect.bottom;
      const spaceAbove = rect.top - visibleTop;
      setListOpensAbove(spaceBelow < DIVISION_LIST_MAX_PX && spaceAbove > spaceBelow);
    };

    updatePlacement();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", updatePlacement);
    vv?.addEventListener("scroll", updatePlacement);
    window.addEventListener("resize", updatePlacement);
    return () => {
      vv?.removeEventListener("resize", updatePlacement);
      vv?.removeEventListener("scroll", updatePlacement);
      window.removeEventListener("resize", updatePlacement);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [open, listOpensAbove]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery(selectedLabel && divisionCode !== "OUTROS" ? selectedLabel : "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = (code: string) => {
    onChange(code, code === "OUTROS" ? divisionCustom : "");
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          disabled={disabled}
          className={cn(fieldClass, "pr-10 text-xs font-bold")}
          placeholder="Pesquisar ou escolher divisão…"
          value={open ? query : selectedLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center text-muted-foreground"
          aria-label="Abrir lista de divisões"
          onClick={(e) => {
            e.preventDefault();
            if (open) setOpen(false);
            else openList();
          }}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>

        {open ? (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className={cn(
              "absolute z-[220] max-h-52 w-full overflow-y-auto overscroll-contain rounded-xl border-2 border-border-strong bg-card py-1 shadow-lg",
              listOpensAbove ? "bottom-full mb-1" : "mt-1"
            )}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                Nenhuma divisão encontrada.
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value} role="option" aria-selected={divisionCode === opt.value}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full px-3 py-2 text-left text-xs font-bold transition-colors hover:bg-muted",
                      divisionCode === opt.value && "bg-primary/10 text-foreground"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(opt.value)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {divisionCode === "OUTROS" ? (
        <input
          type="text"
          className={cn(fieldClass, "text-xs")}
          placeholder="Divisão personalizada"
          value={divisionCustom}
          disabled={disabled}
          onChange={(e) => onChange(divisionCode, e.target.value)}
        />
      ) : null}
    </div>
  );
}

type MultiOptionPickerProps = {
  label: string;
  options: readonly string[];
  optionLabels: Record<string, string>;
  codes: string;
  custom: string;
  disabled?: boolean;
  onChange: (codes: string, custom: string) => void;
};

function MultiOptionPicker({
  options,
  optionLabels,
  codes,
  custom,
  disabled,
  onChange,
}: MultiOptionPickerProps) {
  const isDesktop = useMediaMinWidth(768);
  const selected = parseCsvCodes(codes);

  const toggle = (code: string) => {
    const set = new Set(selected);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange(joinCsvCodes(Array.from(set)), custom);
  };

  return (
    <div className={cn(isDesktop ? "flex flex-wrap gap-1.5" : "flex flex-col gap-2")}>
      {options.map((code) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            disabled={disabled}
            onClick={() => toggle(code)}
            className={cn(
              "rounded-xl border-2 px-3 font-black uppercase tracking-wide transition-colors",
              isDesktop
                ? "min-h-10 text-xs px-2.5 rounded-lg"
                : "min-h-12 w-full text-xs",
              active
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {optionLabels[code] || code}
          </button>
        );
      })}
      {selected.includes("OUTROS") ? (
        <input
          type="text"
          className={cn(fieldClass, isDesktop ? "min-h-10 flex-1 text-xs" : "min-h-12 text-sm")}
          placeholder="Outros…"
          value={custom}
          disabled={disabled}
          onChange={(e) => onChange(codes, e.target.value)}
        />
      ) : null}
    </div>
  );
}

const FIXATION_LABELS: Record<string, string> = {
  PAREDE: "Parede",
  TETO: "Teto",
  OUTROS: "Outros",
};

const CONTROL_LABELS: Record<string, string> = {
  ESQUERDA: "Esquerda",
  DIREITA: "Direita",
  OUTROS: "Outros",
};

export function MeasurementFixationPicker(props: Omit<MultiOptionPickerProps, "options" | "optionLabels" | "label">) {
  return (
    <MultiOptionPicker
      label="Fixação"
      options={FIXATION_OPTION_VALUES}
      optionLabels={FIXATION_LABELS}
      {...props}
    />
  );
}

const EXTERIOR_PARTIAL_PART_LABELS: Record<string, string> = {
  ESTEIRAS: "Esteiras",
  PARTES_EXTERIORES: "Esteiras",
  CALHAS: "Calhas",
  OUTROS: "Outros",
};

export function MeasurementExteriorPartialPartsPicker(
  props: Omit<MultiOptionPickerProps, "options" | "optionLabels" | "label">
) {
  return (
    <MultiOptionPicker
      label="Material parcial"
      options={["ESTEIRAS", "CALHAS", "OUTROS"]}
      optionLabels={EXTERIOR_PARTIAL_PART_LABELS}
      {...props}
    />
  );
}

export function MeasurementControlsPicker(props: Omit<MultiOptionPickerProps, "options" | "optionLabels" | "label">) {
  return (
    <MultiOptionPicker
      label="Comandos"
      options={CONTROL_SIDE_VALUES}
      optionLabels={CONTROL_LABELS}
      {...props}
    />
  );
}

export function readOnlyFixation(codes?: string, custom?: string): string {
  return formatFixationDisplay(codes, custom) || "—";
}

export function readOnlyControls(codes?: string, custom?: string): string {
  return formatControlsDisplay(codes, custom) || "—";
}
