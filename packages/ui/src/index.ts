// Named re-exports enable proper tree-shaking in Vite/Rolldown.
// `export *` prevents tree-shaking because the bundler cannot determine
// which symbols are actually used by consumers, so it includes everything.

// Button
export { Button, buttonVariants } from './components/ui/button';

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card';

// Input
export { Input } from './components/ui/input';

// Badge
export { Badge, badgeVariants } from './components/ui/badge';

// Checkbox
export { Checkbox } from './components/ui/checkbox';

// RadioGroup
export { RadioGroup, RadioGroupItem } from './components/ui/radio-group';

// Collapsible
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './components/ui/collapsible';

// Separator
export { Separator } from './components/ui/separator';

// Label
export { Label } from './components/ui/label';

// Tooltip
export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './components/ui/tooltip';

// Sonner (Toaster)
export { Toaster } from './components/ui/sonner';

// Sidebar
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar';

// Select
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

// Skeleton
export { Skeleton } from './components/ui/skeleton';

// Sheet
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet';

// Textarea
export { Textarea } from './components/ui/textarea';

// Accordion
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './components/ui/accordion';

// Direction
export { DirectionProvider, useDirection } from './components/ui/direction';

// Popover
export {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover';

// Calendar
export { Calendar } from './components/ui/calendar';

// Field
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from './components/ui/field';

// Tabs
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

// Dialog
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';

// Avatar
export { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';

// Breadcrumb
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './components/ui/breadcrumb';

// DropdownMenu
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/ui/dropdown-menu';

// Table
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';

// DecorativeBackground
export { DecorativeBackground } from './components/DecorativeBackground';

// ThemeToggle
export { ThemeToggle } from './components/theme-toggle';

// TypingAnimation
export { TypingAnimation } from './components/TypingAnimation';

// Providers
export { ThemeProvider, useTheme } from './providers/theme-provider';
export {
  UIConfigProvider,
  useUIStyle,
  type UIStyle,
  STYLE_REGISTRY,
} from './providers/ui-config-provider';

// Hooks
export { useIsMobile } from './hooks/use-mobile';

// Utils
export { cn } from './lib/utils';
