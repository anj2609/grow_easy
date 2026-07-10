import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable, DataTableColumn } from "../components/DataTable";

interface Row {
  name: string;
  email: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
];

describe("DataTable", () => {
  it("renders column headers and row values", () => {
    const rows: Row[] = [
      { name: "John Doe", email: "john@example.com" },
      { name: "Jane Doe", email: "jane@example.com" },
    ];

    render(<DataTable columns={columns} rows={rows} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("shows the empty message when there are no rows", () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
