import { Collapsible as CollapsibleBase } from '@base-ui/react/collapsible';

import { cn } from '@ui/lib/utils';

function Collapsible({ className, ...props }: CollapsibleBase.Root.Props) {
  return (
    <CollapsibleBase.Root
      data-slot="collapsible"
      className={cn(className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({
  className,
  ...props
}: CollapsibleBase.Trigger.Props) {
  return (
    <CollapsibleBase.Trigger
      data-slot="collapsible-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

function CollapsibleContent({
  className,
  ...props
}: CollapsibleBase.Panel.Props) {
  return (
    <CollapsibleBase.Panel
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden transition-all data-open:animate-accordion-down data-closed:animate-accordion-up',
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
