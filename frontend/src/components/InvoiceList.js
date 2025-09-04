import React from "react";

export default function InvoiceList({
  vendor,
  items = [],
  date,
  amount,
  invoiceCode,
}) {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{vendor}</h3>
      <p className="text-sm text-gray-500 mb-2">
        Invoice Code:{" "}
        <span className="font-mono">{invoiceCode}</span>
      </p>

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item, idx) => {
            // Use parent invoice date
            const parsedDate = date ? new Date(date) : null;

            return (
              <li
                key={idx}
                className="flex flex-col border-b pb-2 last:border-none last:pb-0"
              >
                <p className="text-sm font-medium text-gray-700">
                  Item: {item.itemName}
                </p>
                {item.quantity && (
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                )}
                <p className="text-sm text-gray-600">
                  Price: ₹{item.price} | Total: ₹{item.total}
                </p>
                <p className="text-xs text-gray-500">
                  Date:{" "}
                  {parsedDate && !isNaN(parsedDate)
                    ? parsedDate.toLocaleString()
                    : "Unknown"}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 italic">No item details found</p>
      )}
    </div>
  );
}
