"use client";

import { useCallback, useEffect, useState } from "react";
import AsyncCreatableSelect from "react-select/async-creatable";
import type { GroupBase } from "react-select";
import {
  findSupplierOptionByCode,
  searchSupplierOptions,
  type SupplierOption,
} from "@/lib/api/erp/business-partners.api";

type Props = {
  value?: string | null;
  onChange: (supplierCode: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  noOptionsText?: string;
};

// react-select's option-list type allows groups, but our loadOptions
// only ever returns a flat SupplierOption[]. Flatten defensively so
// TypeScript (and any future grouped usage) stays safe.
function flattenSupplierOptions(
  options: readonly (SupplierOption | GroupBase<SupplierOption>)[],
): SupplierOption[] {
  return options.flatMap((option) =>
    "options" in option ? option.options : [option],
  );
}

export default function SupplierSelect({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "Search or enter supplier...",
  noOptionsText = "Supplier not found. Type a code and press Enter.",
}: Props) {
  const [selected, setSelected] = useState<SupplierOption | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSelectedValue() {
      if (!value) {
        setSelected(null);
        return;
      }

      // Do not fetch again when the current option already represents this value.
      if (selected?.value === value) return;

      try {
        const existing = await findSupplierOptionByCode(value);
        if (cancelled) return;

        if (existing) {
          setSelected(existing);
          return;
        }
      } catch {
        // A manual supplier code is still allowed when lookup fails.
      }

      if (!cancelled) {
        setSelected({
          value,
          code: value,
          name: value,
          label: `${value} (Manual)`,
        });
      }
    }

    void resolveSelectedValue();
    return () => {
      cancelled = true;
    };
  }, [value, selected?.value]);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<SupplierOption[]> => {
      try {
        return await searchSupplierOptions(inputValue);
      } catch (error) {
        console.error(
          "[SupplierSelect] Failed to load supplier suggestions",
          error,
        );
        return [];
      }
    },
    [],
  );

  const createManualSupplier = useCallback(
    (inputValue: string) => {
      const code = inputValue.trim();
      if (!code) return;

      const manual: SupplierOption = {
        value: code,
        code,
        name: code,
        label: `${code} (Manual)`,
      };

      setSelected(manual);
      onChange(code);
    },
    [onChange],
  );

  const handleChange = useCallback(
    (option: SupplierOption | null) => {
      setSelected(option);
      onChange(option?.value ?? null);
    },
    [onChange],
  );

  return (
    <div className="relative z-20">
      <AsyncCreatableSelect<SupplierOption, false>
        instanceId="purchase-order-supplier"
        inputId="purchase-order-supplier-input"
        cacheOptions
        defaultOptions
        isClearable
        isDisabled={disabled}
        loadOptions={loadOptions}
        value={selected}
        placeholder={placeholder}
        formatCreateLabel={(inputValue) =>
          `Use manual supplier \"${inputValue.trim()}\"`
        }
        isValidNewOption={(inputValue, _selected, options) => {
          const code = inputValue.trim();
          if (!code) return false;
          return !flattenSupplierOptions(options).some(
            (option) => option.value.toLowerCase() === code.toLowerCase(),
          );
        }}
        noOptionsMessage={() => noOptionsText}
        loadingMessage={() => "Loading suppliers..."}
        onChange={handleChange}
        onCreateOption={createManualSupplier}
        menuPosition="absolute"
        menuPlacement="auto"
        classNamePrefix="erp-react-select"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: "42px",
            borderRadius: "0.5rem",
            borderColor: "#cbd5e1",
            boxShadow: "none",
          }),
          menu: (base) => ({
            ...base,
            zIndex: 100,
          }),
        }}
      />

      {required && !value ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
          className="pointer-events-none absolute h-px w-px opacity-0"
          value=""
          onChange={() => undefined}
          required
        />
      ) : null}
    </div>
  );
}
