"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import {
  deleteProductAction,
  toggleProductAction,
  upsertProductAction,
} from "@/lib/actions/dashboard";
import { formatFcfa } from "@/lib/format";
import type { ProductListItem } from "@/lib/db/queries/products";

type ProductForm = {
  id?: string;
  brand: string;
  cylinderSize: string;
  price: number;
  availability: boolean;
};

const EMPTY_FORM: ProductForm = {
  brand: "",
  cylinderSize: "",
  price: 0,
  availability: true,
};

const COLUMNS: DataColumn<ProductListItem>[] = [
  {
    key: "brand",
    header: "Brand",
    sortable: true,
    cell: (p) => <span className="font-medium">{p.brand}</span>,
  },
  {
    key: "cylinder_size",
    header: "Size",
    cell: (p) => <span className="text-sm">{p.cylinder_size}</span>,
  },
  {
    key: "price",
    header: "Price",
    sortable: true,
    className: "text-right",
    cell: (p) => <span className="font-semibold">{formatFcfa(p.price)}</span>,
  },
  {
    key: "availability",
    header: "Status",
    cell: (p) => (
      <Badge
        variant="outline"
        className={
          p.availability
            ? "border-transparent bg-success text-success-foreground"
            : "border-transparent bg-muted text-muted-foreground"
        }
      >
        {p.availability ? "In stock" : "Out of stock"}
      </Badge>
    ),
  },
];

export function ProductsManager({ products }: { products: ProductListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ProductListItem | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setCreating(true);
  }

  function openEdit(p: ProductListItem) {
    setForm({
      id: p.id,
      brand: p.brand,
      cylinderSize: p.cylinder_size,
      price: p.price,
      availability: p.availability,
    });
    setError(null);
    setEditing(p);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertProductAction(form);
        setCreating(false);
        setEditing(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save product.");
      }
    });
  }

  function toggle(p: ProductListItem) {
    startTransition(async () => {
      await toggleProductAction(p.id, !p.availability);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus aria-hidden="true" className="size-4" />
          Add product
        </Button>
      </div>

      <DataTable
        columns={[
          ...COLUMNS,
          {
            key: "actions",
            header: "",
            className: "text-right",
            cell: (p) => (
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => toggle(p)}
                >
                  {p.availability ? "Out of stock" : "In stock"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={products}
        getRowId={(p) => p.id}
        searchKeys={[(p) => p.brand, (p) => p.cylinder_size]}
        searchPlaceholder="Search products…"
        defaultSort={{ key: "brand", dir: "asc" }}
        empty={{
          title: "No products yet",
          description: "Add your first cylinder listing so customers can see your stock and prices.",
          action: (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus aria-hidden="true" className="size-4" />
              Add product
            </Button>
          ),
        }}
      />

      <Dialog open={creating || editing !== null} onOpenChange={(o) => !o && (setCreating(false), setEditing(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Cylinders you list here become visible to customers at this price.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="p-brand">Brand</Label>
              <Input
                id="p-brand"
                required
                placeholder="e.g. GPL Cameroon"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-size">Cylinder size</Label>
              <Input
                id="p-size"
                required
                placeholder="e.g. 12.5 kg"
                value={form.cylinderSize}
                onChange={(e) => setForm({ ...form, cylinderSize: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-price">Price (FCFA)</Label>
              <Input
                id="p-price"
                type="number"
                min={1}
                required
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.checked })}
                className="size-4 rounded border-input accent-primary"
              />
              Available to order
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Add product"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this product?"
        description={
          deleting
            ? `${deleting.brand} · ${deleting.cylinder_size} will be removed permanently. Past orders keep their records.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            await deleteProductAction(deleting.id);
            setDeleting(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}
