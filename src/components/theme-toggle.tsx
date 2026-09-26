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
    <div className="inline-flex rounded-xl border border-border bg-card p-1" aria-label="Color theme">
      {options.map(({ value, label, icon: Icon }) => (
        <button key={value} type="button" aria-label={`${label} theme`} aria-pressed={mounted && theme === value}
          onClick={() => setTheme(value)} className={`rounded-lg p-2 transition-colors ${mounted && theme === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
