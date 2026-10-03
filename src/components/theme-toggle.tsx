"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-soft/60 p-0.5" role="group" aria-label="Color theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" aria-label={`${label} theme`} aria-pressed={mounted && theme === value}
          title={`${label} theme`} onClick={() => setTheme(value)} className={`rounded-md p-1.5 transition-colors ${mounted && theme === value ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
