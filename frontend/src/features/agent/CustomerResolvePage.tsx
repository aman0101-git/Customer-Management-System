import { useState } from "react";
import { AppShell } from "@/components/ui/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Types for state
export type PageState = "SEARCH" | "FOUND" | "NOT_FOUND" | "CREATE" | "EDIT";

export default function CustomerResolvePage() {
  const [pageState, setPageState] = useState<PageState>("SEARCH");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<any>(null);

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    // TODO: Call backend API here
    // Simulate API response for UI only
    setTimeout(() => {
      // setPageState("FOUND"); // or "NOT_FOUND"
      setSearching(false);
    }, 1000);
  };

  // UI
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8">
        {/* Section 1: Search Area */}
        <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-8">
          <div>
            <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              value={phone}
              onChange={e => {
                const val = e.target.value;
                if (/^\d{0,10}$/.test(val)) setPhone(val);
              }}
              required
              minLength={10}
              maxLength={10}
              inputMode="numeric"
              pattern="\d{10}"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={phone.length !== 10 || searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pageState !== "NOT_FOUND"}
              onClick={() => setPageState("CREATE")}
            >
              Create Customer
            </Button>
          </div>
        </form>

        {/* Section 2: Result Area */}
        {pageState === "FOUND" && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            {/* Customer summary here */}
            <div className="font-bold text-lg mb-2">Customer Details</div>
            {/* ...customer details... */}
            <Button onClick={() => setPageState("EDIT")}>Edit Customer</Button>
          </div>
        )}
        {pageState === "NOT_FOUND" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-yellow-800">
            No customer found for this phone number.
          </div>
        )}

        {/* Section 3: Create Customer Form */}
        {pageState === "CREATE" && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="font-bold text-lg mb-2">Create Customer</div>
            {/* Customer creation form here, phone pre-filled and locked */}
            <form className="flex flex-col gap-4">
              <div>
                <Label htmlFor="create-phone">Phone Number</Label>
                <Input id="create-phone" value={phone} disabled />
              </div>
              <div>
                <Label htmlFor="create-name">Customer Name</Label>
                <Input id="create-name" />
              </div>
              {/* ...other fields... */}
              <Button type="submit">Save</Button>
            </form>
          </div>
        )}

        {/* Section 4: Edit Customer Form */}
        {pageState === "EDIT" && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="font-bold text-lg mb-2">Edit Customer</div>
            {/* Customer edit form here, phone read-only */}
            <form className="flex flex-col gap-4">
              <div>
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input id="edit-phone" value={customer?.phone || phone} disabled />
              </div>
              <div>
                <Label htmlFor="edit-name">Customer Name</Label>
                <Input id="edit-name" defaultValue={customer?.name} />
              </div>
              {/* ...other fields... */}
              <Button type="submit">Save</Button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
