export type ReceiptData = {
  storeName: string;
  receiptNo: number;
  dateText: string;
  cashierName?: string | null;
  customerName?: string | null;
  items: {
    name: string;
    qty: string;
    unit: string;
    price: number;
    lineTotal: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: "CASH" | "QRIS" | "TRANSFER" | "OTHER" | "CREDIT";
  amountPaid: number;
  changeAmount: number;
  creditAmount: number;
  note?: string | null;
  isVoid?: boolean;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

const METHOD_LABEL: Record<ReceiptData["paymentMethod"], string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  OTHER: "Lainnya",
  CREDIT: "Bon",
};

function Row({
  left,
  right,
  bold,
}: {
  left: string;
  right: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-2 ${bold ? "font-semibold" : ""}`}
    >
      <span>{left}</span>
      <span className="tabular-nums">{right}</span>
    </div>
  );
}

export function Receipt({
  data,
  width = 80,
}: {
  data: ReceiptData;
  width?: 58 | 80;
}) {
  const d = data;
  return (
    <>
      <style>{`@media print { @page { size: ${width}mm auto; margin: 2mm; } }`}</style>

      <div
        className="mx-auto max-w-full bg-white p-3 font-mono text-xs leading-relaxed text-black print:p-0"
        style={{ width: `${width}mm` }}
      >
        <div className="text-center">
          <p className="text-sm font-bold">{d.storeName}</p>
          {d.isVoid && <p className="mt-1 font-bold">*** DIBATALKAN ***</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <Row left={`No. ${d.receiptNo}`} right={d.dateText} />
        {d.cashierName && <Row left="Kasir" right={d.cashierName} />}
        {d.customerName && <Row left="Pelanggan" right={d.customerName} />}

        <div className="my-2 border-t border-dashed border-black" />

        <div className="space-y-1.5">
          {d.items.map((it, i) => (
            <div key={i}>
              <p>{it.name}</p>
              <Row
                left={`${it.qty} ${it.unit} x ${rupiah(it.price)}`}
                right={rupiah(it.lineTotal)}
              />
            </div>
          ))}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <Row left="Subtotal" right={rupiah(d.subtotal)} />
        {d.discount > 0 && (
          <Row left="Diskon" right={`-${rupiah(d.discount)}`} />
        )}
        <Row left="TOTAL" right={rupiah(d.total)} bold />

        <div className="my-2 border-t border-dashed border-black" />

        <Row left="Pembayaran" right={METHOD_LABEL[d.paymentMethod]} />
        {d.paymentMethod === "CASH" && (
          <>
            <Row left="Dibayar" right={rupiah(d.amountPaid)} />
            <Row left="Kembali" right={rupiah(d.changeAmount)} />
          </>
        )}
        {d.creditAmount > 0 && (
          <Row left="Masuk bon" right={rupiah(d.creditAmount)} bold />
        )}

        {d.note && (
          <>
            <div className="my-2 border-t border-dashed border-black" />
            <p>Catatan: {d.note}</p>
          </>
        )}

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center">Terima kasih</p>
      </div>
    </>
  );
}
