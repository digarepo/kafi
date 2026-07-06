'use client';

import * as React from 'react';
import { createContext, useContext } from 'react';

export type UIStyle = 'vega' | 'nova' | 'mira' | 'maia' | 'lyra';

interface StyleDNA {
  readonly radius: string;
  readonly alertContent: string;
  readonly alertFooter: string;
  readonly alertMedia: string;
  readonly alertTitle: string;
  readonly alertDesc: string;
  readonly badge: string;
  readonly badgeOutline: string;
  readonly input: string;
  readonly fileInput: string;
  readonly card: string;
  readonly cardSection: string;
  readonly title: string;
  readonly base: string;
  readonly button: string;
  readonly outline: string;
  readonly combobox: string;
  readonly popover: string;
  readonly menuItem: string;
  readonly menuContent: string;
  readonly fieldGroup: string;
  readonly fieldItem: string;
  readonly fieldLabel: string;
  readonly inputGroup: string;
  readonly inputGroupBg: string;
  readonly inputGroupAddon: string;
  readonly inputGroupKbd: string;
  readonly label: string;
  readonly selectTrigger: string;
  readonly selectContent: string;
  readonly selectItem: string;
  readonly iconSize: string;
  readonly textarea: string;
}

export const STYLE_REGISTRY: Record<UIStyle, StyleDNA> = {
  vega: {
    radius: 'rounded-md',
    alertContent: 'gap-6 p-6 data-[size=default]:sm:max-w-lg',
    alertFooter: 'sm:justify-end',
    alertMedia: 'size-16 *:[svg]:size-8 sm:row-span-2',
    alertTitle: 'text-lg',
    alertDesc: 'text-sm',
    badge: 'rounded-4xl text-xs [&>svg]:size-3!',
    badgeOutline: 'bg-transparent',
    label: 'text-sm font-medium',
    input:
      'h-9 px-2.5 text-base md:text-sm shadow-xs focus-visible:ring-3 aria-invalid:ring-3 bg-transparent',
    fileInput: 'file:h-7 file:text-sm',
    card: 'gap-6 py-6 shadow-xs ring-1 ring-foreground/10',
    cardSection: 'px-6 group-data-[size=sm]/card:px-4',
    title: 'text-base font-medium tracking-tight',
    base: 'text-sm font-normal',
    button: 'focus-visible:ring-3 focus-visible:ring-ring/50',
    outline: 'shadow-xs bg-background',
    combobox: 'gap-2 rounded-sm py-1.5 pr-8 pl-2',
    popover: 'rounded-md shadow-md ring-1 ring-foreground/10',
    menuItem:
      'gap-2 rounded-md px-2 py-1 text-xs/relaxed [&_svg]:size-3.5 data-inset:pl-7.5',
    menuContent: 'rounded-lg shadow-md ring-1 ring-foreground/10 p-1',
    fieldGroup: 'gap-7',
    fieldItem: 'gap-3',
    fieldLabel: 'has-[>[data-slot=field]]:rounded-md *:data-[slot=field]:p-3',
    inputGroup:
      'h-9 has-[[data-slot=input-group-control]:focus-visible]:ring-3',
    inputGroupBg: 'bg-transparent',
    inputGroupAddon: 'pl-2 pr-2 has-[>button]:-ml-1 has-[>button]:-mr-1',
    inputGroupKbd: 'rounded-[calc(var(--radius)-5px)]',
    selectTrigger:
      'data-[size=default]:h-9 data-[size=sm]:h-8 text-sm focus-visible:ring-3 aria-invalid:ring-3 bg-transparent',
    selectContent: 'rounded-md shadow-md ring-foreground/10',
    selectItem: 'rounded-sm py-1.5 px-2 text-sm',
    iconSize: 'size-4',
    textarea:
      'px-2.5 py-2 text-base md:text-sm shadow-xs focus-visible:ring-3 aria-invalid:ring-3 bg-transparent',
  },
  nova: {
    radius: 'rounded-lg',
    alertContent: 'gap-4 p-4 data-[size=default]:sm:max-w-sm',
    alertFooter:
      '-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4 sm:justify-end',
    alertMedia: 'size-10 *:[svg]:size-6 sm:row-span-2',
    alertTitle: 'text-base',
    alertDesc: 'text-sm',
    badge: 'rounded-4xl text-xs [&>svg]:size-3!',
    badgeOutline: 'bg-transparent',
    label: 'text-sm font-medium',
    input:
      'h-8 px-2.5 text-base md:text-sm focus-visible:ring-3 aria-invalid:ring-3 bg-transparent disabled:bg-input/50 dark:disabled:bg-input/80',
    fileInput: 'file:h-6 file:text-sm',
    card: 'gap-4 py-4 ring-1 ring-foreground/10',
    cardSection: 'px-4 group-data-[size=sm]/card:px-3',
    title: 'text-base leading-snug font-semibold',
    base: 'text-sm font-normal',
    button: 'focus-visible:ring-3 focus-visible:ring-ring/50',
    outline: 'bg-background',
    combobox: 'gap-2 rounded-md py-1 pr-8 pl-1.5',
    popover: 'rounded-lg shadow-md ring-1 ring-foreground/10',
    menuItem:
      'gap-1.5 rounded-md px-1.5 py-1 text-sm [&_svg]:size-4 data-inset:pl-7',
    menuContent: 'rounded-lg shadow-md ring-1 ring-foreground/10 p-1',
    fieldGroup: 'gap-5',
    fieldItem: 'gap-2',
    fieldLabel: 'has-[>[data-slot=field]]:rounded-lg *:data-[slot=field]:p-2.5',
    inputGroup:
      'h-8 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-disabled:bg-input/50',
    inputGroupBg: 'bg-transparent',
    inputGroupAddon:
      'pl-2 pr-2 has-[>button]:ml-[-0.3rem] has-[>button]:mr-[-0.3rem]',
    inputGroupKbd: 'rounded-[calc(var(--radius)-5px)]',
    selectTrigger:
      'data-[size=default]:h-8 data-[size=sm]:h-7 text-sm focus-visible:ring-3 aria-invalid:ring-3 bg-transparent',
    selectContent: 'rounded-lg shadow-md ring-foreground/10',
    selectItem: 'rounded-md py-1 px-1.5 text-sm',
    iconSize: 'size-4',
    textarea:
      'px-2.5 py-2 text-base md:text-sm focus-visible:ring-3 aria-invalid:ring-3 bg-transparent disabled:bg-input/50 dark:disabled:bg-input/80',
  },
  mira: {
    radius: 'rounded-md',
    alertContent: 'gap-3 p-4 data-[size=default]:sm:max-w-sm',
    alertFooter: 'sm:justify-end',
    alertMedia: 'size-8 *:[svg]:size-4 sm:row-span-2',
    alertTitle: 'text-sm',
    alertDesc: 'text-xs/relaxed',
    badge: 'rounded-full text-[0.625rem] [&>svg]:size-2.5!',
    badgeOutline: 'bg-input/20 dark:bg-input/30',
    label: 'text-xs/relaxed font-medium',
    input:
      'h-7 px-2 text-sm md:text-xs/relaxed focus-visible:ring-2 aria-invalid:ring-2 bg-input/20',
    fileInput: 'file:h-6 file:text-xs/relaxed',
    card: 'gap-4 py-4 ring-1 ring-foreground/10',
    cardSection: 'px-4 group-data-[size=sm]/card:px-3',
    title: 'text-sm font-medium',
    base: 'text-xs/relaxed font-normal',
    button: 'focus-visible:ring-2 focus-visible:ring-ring/30',
    outline: 'bg-transparent',
    combobox: 'min-h-7 gap-2 rounded-md px-2 py-1 [&_svg]:size-3.5',
    popover: 'rounded-lg shadow-md ring-1 ring-foreground/10',
    menuItem:
      'gap-2 rounded-md px-2 py-1 text-[10px] [&_svg]:size-3.5 data-inset:pl-7.5',
    menuContent: 'rounded-lg shadow-md ring-1 ring-foreground/10 p-1',
    fieldGroup: 'gap-4',
    fieldItem: 'gap-2',
    fieldLabel: 'has-[>[data-slot=field]]:rounded-md *:data-[slot=field]:p-2',
    inputGroup:
      'h-7 has-[[data-slot=input-group-control]:focus-visible]:ring-2',
    inputGroupBg: 'bg-input/20',
    inputGroupAddon:
      'pl-2 pr-2 has-[>button]:ml-[-0.275rem] has-[>button]:mr-[-0.275rem]',
    inputGroupKbd:
      'rounded-[calc(var(--radius-sm)-2px)] bg-muted-foreground/10 px-1 text-[0.625rem]',
    selectTrigger:
      'data-[size=default]:h-7 data-[size=sm]:h-6 text-xs/relaxed focus-visible:ring-2 aria-invalid:ring-2 bg-input/20',
    selectContent: 'rounded-lg shadow-md ring-foreground/10',
    selectItem: 'rounded-md py-1 px-2 text-xs/relaxed min-h-7',
    iconSize: 'size-3.5',
    textarea:
      'px-2 py-2 text-sm md:text-xs/relaxed focus-visible:ring-2 aria-invalid:ring-2 bg-input/20 resize-none',
  },
  maia: {
    radius: 'rounded-4xl',
    alertContent: 'gap-6 p-6 data-[size=default]:sm:max-w-md',
    alertFooter: 'sm:justify-end',
    alertMedia: 'size-16 rounded-full *:[svg]:size-8 sm:row-span-2',
    alertTitle: 'text-lg',
    alertDesc: 'text-sm',
    badge: 'rounded-4xl text-xs [&>svg]:size-3!',
    badgeOutline: 'bg-input/30',
    label: 'text-sm font-medium',
    input:
      'h-9 px-3 text-base md:text-sm focus-visible:ring-[3px] aria-invalid:ring-[3px] bg-input/30',
    fileInput: 'file:h-7 file:text-sm',
    card: 'gap-6 py-6 ring-1 ring-foreground/10',
    cardSection: 'px-6 group-data-[size=sm]/card:px-4',
    title: 'text-base font-medium',
    base: 'text-sm font-normal',
    button: 'focus-visible:ring-[3px] focus-visible:ring-ring/50',
    outline: 'bg-input/30 hover:bg-input/50',
    combobox: 'gap-2.5 rounded-xl py-2 pr-8 pl-3',
    popover: 'rounded-2xl shadow-2xl ring-1 ring-foreground/5',
    menuItem:
      'gap-2.5 rounded-xl px-3 py-2 text-sm [&_svg]:size-4 data-inset:pl-9.5',
    menuContent: 'rounded-2xl shadow-2xl ring-1 ring-foreground/5 p-1',
    fieldGroup: 'gap-7',
    fieldItem: 'gap-3',
    fieldLabel: 'has-[>[data-slot=field]]:rounded-xl *:data-[slot=field]:p-4',
    inputGroup:
      'h-9 rounded-4xl has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',
    inputGroupBg: 'bg-input/30',
    inputGroupAddon: 'pl-3 pr-3 has-[>button]:-ml-1 has-[>button]:-mr-1',
    inputGroupKbd: 'rounded-4xl bg-muted-foreground/10 px-1.5',
    selectTrigger:
      'data-[size=default]:h-9 data-[size=sm]:h-8 text-sm focus-visible:ring-[3px] aria-invalid:ring-[3px] bg-input/30',
    selectContent: 'rounded-2xl shadow-2xl ring-foreground/5',
    selectItem: 'rounded-xl py-2 px-3 text-sm',
    iconSize: 'size-4',
    textarea:
      'px-3 py-3 text-base md:text-sm focus-visible:ring-[3px] aria-invalid:ring-[3px] bg-input/30 resize-none',
  },
  lyra: {
    radius: 'rounded-none',
    alertContent: 'gap-4 p-4 data-[size=default]:sm:max-w-sm',
    alertFooter: 'sm:justify-end',
    alertMedia: 'size-10 rounded-none *:[svg]:size-6 sm:row-span-2',
    alertTitle: 'text-sm',
    alertDesc: 'text-xs/relaxed',
    badge: 'rounded-none text-xs [&>svg]:size-3!',
    badgeOutline: 'bg-transparent',
    label: 'text-xs font-normal',
    input:
      'h-8 px-2.5 text-xs md:text-xs focus-visible:ring-1 aria-invalid:ring-1 bg-transparent disabled:bg-input/50 dark:disabled:bg-input/80',
    fileInput: 'file:h-6 file:text-xs',
    card: 'gap-4 py-4 ring-1 ring-foreground/10 shadow-none',
    cardSection: 'px-4 group-data-[size=sm]/card:px-3',
    title: 'text-sm font-medium',
    base: 'text-xs font-normal',
    button: 'focus-visible:ring-1 focus-visible:ring-ring/50',
    outline: 'bg-background',
    combobox: 'gap-2 rounded-none py-2 pr-8 pl-2',
    popover: 'rounded-none shadow-md ring-1 ring-foreground/10',
    menuItem:
      'gap-2 rounded-none px-2 py-2 text-xs [&_svg]:size-4 data-inset:pl-7',
    menuContent: 'rounded-none shadow-md ring-1 ring-foreground/10 p-0',
    fieldGroup: 'gap-5',
    fieldItem: 'gap-2',
    fieldLabel: 'has-[>[data-slot=field]]:rounded-none *:data-[slot=field]:p-2',
    inputGroup:
      'h-8 rounded-none has-[[data-slot=input-group-control]:focus-visible]:ring-1 has-disabled:bg-input/50',
    inputGroupBg: 'bg-transparent',
    inputGroupAddon:
      'pl-2 pr-2 has-[>button]:ml-[-0.3rem] has-[>button]:mr-[-0.3rem]',
    inputGroupKbd: 'rounded-none',
    selectTrigger:
      'data-[size=default]:h-8 data-[size=sm]:h-7 text-xs focus-visible:ring-1 aria-invalid:ring-1 bg-transparent',
    selectContent: 'rounded-none shadow-md ring-foreground/10',
    selectItem: 'rounded-none py-2 px-2 text-xs',
    iconSize: 'size-4',
    textarea:
      'px-2.5 py-2 text-xs md:text-xs focus-visible:ring-1 aria-invalid:ring-1 bg-transparent disabled:bg-input/50 dark:disabled:bg-input/80',
  },
};

const UIConfigContext = createContext<{ style: UIStyle; dna: StyleDNA }>({
  style: 'nova',
  dna: STYLE_REGISTRY.nova,
});

export function UIConfigProvider({
  style = 'nova',
  children,
}: {
  style: UIStyle;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({
      style,
      dna: STYLE_REGISTRY[style],
    }),
    [style],
  );

  return (
    <UIConfigContext.Provider value={value}>
      {children}
    </UIConfigContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useUIStyle = () => useContext(UIConfigContext);
