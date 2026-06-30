import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { KpiCard } from "@/components/KpiCard";

describe("KpiCard", () => {
  it("renders the label and value", () => {
    render(<KpiCard label="Active Opportunities" value={42} />);
    expect(screen.getByText("Active Opportunities")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders an optional hint when provided", () => {
    render(<KpiCard label="Revenue Pipeline" value="₹32L" hint="+18% vs last week" />);
    expect(screen.getByText("+18% vs last week")).toBeInTheDocument();
  });

  it("omits the hint paragraph when none is provided", () => {
    render(<KpiCard label="Pending Follow-ups" value={4} />);
    expect(screen.queryByText(/vs last week/)).not.toBeInTheDocument();
  });
});
