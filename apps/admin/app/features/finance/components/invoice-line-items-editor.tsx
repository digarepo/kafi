/**
 * Inline editor for the invoice line items array field.
 *
 * @remarks
 * - The invoice's `subtotal`/`total_amount` are never edited here; they are
 *   always computed server-side from these line items.
 */

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kafi/ui';

import type { InvoiceLineItemFormValues } from '../types/finance.types';
import type { LookupOption } from '../../../lib/api.js';

interface InvoiceLineItemsEditorProps {
  lineItems: InvoiceLineItemFormValues[];
  lineItemTypes: LookupOption[];
  onChange: (lineItems: InvoiceLineItemFormValues[]) => void;
}

const emptyDraft: InvoiceLineItemFormValues = {
  line_item_type_id: '',
  description: '',
  quantity: '1',
  unit_price: '',
  notes: '',
};

function lineTotal(item: InvoiceLineItemFormValues): number {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  return Math.round(qty * price * 100) / 100;
}

export function InvoiceLineItemsEditor({
  lineItems,
  lineItemTypes,
  onChange,
}: InvoiceLineItemsEditorProps) {
  const [draft, setDraft] = useState<InvoiceLineItemFormValues>(emptyDraft);

  const subtotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);

  function addLineItem() {
    if (!draft.description.trim() || !draft.unit_price) return;
    onChange([...lineItems, draft]);
    setDraft(emptyDraft);
  }

  function removeLineItem(index: number) {
    onChange(lineItems.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Line items</Label>

      <div className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-5">
        <Input
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          placeholder="Description"
          className="md:col-span-2"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          value={draft.quantity}
          onChange={(e) =>
            setDraft((d) => ({ ...d, quantity: e.target.value }))
          }
          placeholder="Qty"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          value={draft.unit_price}
          onChange={(e) =>
            setDraft((d) => ({ ...d, unit_price: e.target.value }))
          }
          placeholder="Unit price (ETB)"
        />
        <Select
          value={draft.line_item_type_id ?? ''}
          onValueChange={(v) =>
            setDraft((d) => ({ ...d, line_item_type_id: v ?? '' }))
          }
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue>
              {lineItemTypes
                .map((t) => ({ value: t.id, label: t.name }))
                .find((o) => o.value === draft.line_item_type_id)?.label ??
                'Type (optional)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {lineItemTypes
              .map((t) => ({ value: t.id, label: t.name }))
              .map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <div className="md:col-span-5 flex justify-end">
          <Button type="button" onClick={addLineItem}>
            Add line item
          </Button>
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="p-2">Description</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Unit price</th>
                <th className="p-2">Total</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="p-2">{item.description}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">{item.unit_price}</td>
                  <td className="p-2">{lineTotal(item).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLineItem(idx)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Subtotal (computed):{' '}
        <span className="font-medium">{subtotal.toFixed(2)} ETB</span>
      </p>
    </div>
  );
}
