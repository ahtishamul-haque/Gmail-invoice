import React, { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import InvoiceList from "./components/InvoiceList";
import { getInvoices, syncFromGmail } from "./services/api";

export default function App() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const res = await getInvoices();
      setInvoices(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, []);

  // Group by vendor
  const groupedByVendor = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      if (!acc[inv.vendor]) acc[inv.vendor] = [];
      acc[inv.vendor].push(inv);
      return acc;
    }, {});
  }, [invoices]);

  // Grand total
  const grandTotal = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [invoices]);

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncFromGmail();
      await load();
      alert("Sync completed!");
    } catch (err) {
      console.error(err);
      alert("Sync failed: Connect Gmail -> allow access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <button className="btn primary mb-4" onClick={handleSync} disabled={loading}>
          {loading ? "Syncing..." : "Sync Gmail Invoices"}
        </button>

        <div className="summary-card bg-gray-100 p-4 rounded-lg mb-6 shadow">
          <h2 className="text-lg font-semibold">Total Spend: ₹{grandTotal.toFixed(2)}</h2>
        </div>

        {Object.keys(groupedByVendor).length === 0 ? (
          <p>No invoices yet. Click Connect Gmail then Sync.</p>
        ) : (
          <div className="grid gap-6">
            {Object.entries(groupedByVendor).map(([vendor, invs]) => (
              <div key={vendor}>
                <h2 className="text-xl font-bold mb-2">{vendor}</h2>
                <div className="space-y-4">
                  {invs.map(inv => (
                    <InvoiceList
                      key={inv._id}
                      vendor={vendor}
                      items={inv.items}
                      date={inv.date}
                      amount={inv.amount}
                      invoiceCode={inv.invoiceCode}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
