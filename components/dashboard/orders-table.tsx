"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { OrderDialog } from "@/components/dashboard/order-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatFcfa } from "@/lib/format";
import type { OrderListItem } from "@/lib/db/queries/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/db";

const STATUS_TABS: OrderStatus[] = [
  "placed",
  "confirmed",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
];

function customerNameCell(o: OrderListItem) {
  return (
    <div>
      <p className="text-sm font-medium">{o.customer_name ?? "—"}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(o.created_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function retailerNameCell(o: OrderListItem) {
  return (
    <div>
      <p className="text-sm font-medium">{o.business_name ?? "—"}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(o.created_at).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function orderColumns(role: "customer" | "retailer" | "admin"): DataColumn<OrderListItem>[] {
  return [
    {
      key: "id",
      header: "Order",
      sortable: true,
      sortValue: (o) => o.id,
      cell: (o) => <span className="font-mono text-xs font-medium">#{o.id.slice(0, 8)}</span>,
    },
    {
      key: "party",
      header: role === "customer" ? "Retailer" : "Customer",
      cell: role === "customer" ? retailerNameCell : customerNameCell,
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      cell: (o) => <span className="text-sm">{o.items}</span>,
    },
    {
      key: "payment_method",
      header: "Payment",
      cell: (o) => <span className="text-sm capitalize">{o.payment_method}</span>,
    },
    {
      key: "total_amount",
      header: "Total",
      sortable: true,
      className: "text-right",
      cell: (o) => <span className="font-semibold">{formatFcfa(o.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (o) => <StatusBadge status={o.status} />,
    },
  ];
}

export function OrdersDataTable({
  role,
  data,
  showStatusFilter = true,
}: {
  role: "customer" | "retailer" | "admin";
  data: OrderListItem[];
  showStatusFilter?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<OrderListItem | null>(null);

  const filtered =
    filter === "all" ? data : data.filter((o) => o.status === filter);
  const counts = data.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  function handleRowClick(o: OrderListItem) {
    if (role === "customer") {
      router.push(`/customer/order/${o.id}`);
    } else {
      setSelected(o);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {showStatusFilter && (
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter by status">
          <FilterTab active={filter === "all"} label="All" count={data.length} onClick={() => setFilter("all")} />
          {STATUS_TABS.map((s) => (
            <FilterTab
              key={s}
              active={filter === s}
              label={s.replace(/_/g, " ")}
              count={counts[s] ?? 0}
              onClick={() => setFilter(s)}
            />
          ))}
        </div>
      )}
      <DataTable
        columns={orderColumns(role)}
        data={filtered}
        getRowId={(o) => o.id}
        searchKeys={[
          (o) => o.id,
          (o) => o.customer_name ?? "",
          (o) => o.business_name ?? "",
          (o) => o.payment_method,
          (o) => o.status,
        ]}
        searchPlaceholder="Search orders…"
        defaultSort={{ key: "created_at", dir: "desc" }}
        pageSize={12}
        empty={{
          title: "No orders here",
          description: filter === "all" ? "Orders will appear here as they come in." : `No orders with status “${filter.replace(/_/g, " ")}”.`,
        }}
        rowClick={handleRowClick}
      />
      <OrderDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        orderId={selected?.id ?? ""}
        role={role}
      />
    </div>
  );
}

export function RecentOrdersTable({ data }: { data: OrderListItem[] }) {
  const router = useRouter();

  const columns: DataColumn<OrderListItem>[] = [
    {
      key: "business_name",
      header: "Retailer",
      sortable: true,
      cell: (o) => (
        <div>
          <p className="font-medium">{o.business_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(o.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}{" "}
            · {o.items} item{o.items === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      key: "payment_method",
      header: "Payment",
      cell: (o) => <span className="text-sm capitalize">{o.payment_method}</span>,
    },
    {
      key: "total_amount",
      header: "Total",
      sortable: true,
      className: "text-right",
      cell: (o) => <span className="font-semibold">{formatFcfa(o.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge status={o.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(o) => o.id}
      searchKeys={[
        (o) => o.business_name ?? "",
        (o) => o.status,
        (o) => o.payment_method,
      ]}
      searchPlaceholder="Search your orders…"
      defaultSort={{ key: "created_at", dir: "desc" }}
      empty={{
        title: "No orders yet",
        description: "When you place your first order it will show up here with live tracking.",
      }}
      rowClick={(o) => router.push(`/customer/order/${o.id}`)}
    />
  );
}

export function PendingOrderList({
  role,
  orders,
}: {
  role: "retailer" | "admin";
  orders: OrderListItem[];
}) {
  const [selected, setSelected] = useState<OrderListItem | null>(null);

  if (orders.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
        All caught up — nothing needs your attention.
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-xl border bg-card">
      {orders.slice(0, 6).map((order) => (
        <li key={order.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {order.customer_name ?? "Customer"} · {formatFcfa(order.total_amount)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order.business_name ?? ""} · {order.items} item{order.items === 1 ? "" : "s"}
            </p>
          </div>
          <StatusBadge status={order.status} />
          <Button size="sm" variant="outline" onClick={() => setSelected(order)}>
            Review
          </Button>
        </li>
      ))}
      <OrderDialog
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        orderId={selected?.id ?? ""}
        role={role}
      />
    </ul>
  );
}

function FilterTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] font-semibold",
          active ? "bg-primary-foreground/20" : "bg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
