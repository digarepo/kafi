import { useEffect, useState } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from "@kafi/ui";

interface AsyncLookupOption {
  value: string;
  label: string;
}

interface AsyncLookupSelectProps {
  value: string;
  selectedLabel?: string;
  options: AsyncLookupOption[];
  placeholder: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  loading?: boolean;
}

export function AsyncLookupSelect({
  value,
  selectedLabel,
  options,
  placeholder,
  onChange,
  onSearch,
  loading = false,
}: AsyncLookupSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOption, setSelectedOption] = useState<AsyncLookupOption | null>(null);

  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    const match = options.find((o) => o.value === value);
    if (match) {
      setSelectedOption(match);
    }
  }, [value, options]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch("");
          onSearch("");
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between text-left font-normal"
          >
            <span className="truncate">
              {selectedOption?.label ??
                selectedLabel ??
                (value ? "Selected traveller" : placeholder)}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          autoFocus
          value={search}
          placeholder="Search traveller"
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearch(nextValue);
            onSearch(nextValue);
          }}
        />
        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="p-2 text-sm text-muted-foreground">Searching…</p>
          ) : options.length > 0 ? (
            options.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal text-left"
                onClick={() => {
                  setSelectedOption(option);
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </Button>
            ))
          ) : (
            <p className="p-2 text-sm text-muted-foreground">No travellers found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
