import * as React from "react";

export function Table({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table className={"min-w-full divide-y divide-gray-200 " + className} {...props}>{children}</table>
  );
}

export function TableHead({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={"bg-muted " + className} {...props}>{children}</thead>
  );
}

export function TableBody({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={"divide-y divide-gray-100 " + className} {...props}>{children}</tbody>
  );
}

export function TableRow({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={"hover:bg-accent transition " + className} {...props}>{children}</tr>
  );
}

export function TableCell({ children, className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={"px-4 py-3 text-sm " + className} {...props}>{children}</td>
  );
}

export function TableHeaderCell({ children, className = "", ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th scope="col" className={"px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider " + className} {...props}>{children}</th>
  );
}
