import { useState } from "react";

export default function ProjectFormDrawer({ open, onClose, onSubmit, initial }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initial?: any;
}) {
  const [form, setForm] = useState(initial || {
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active"
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform transition-all duration-500 ease-in-out shadow-2xl">
          <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create / Edit Project</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form className="relative flex-1 p-6 overflow-y-auto bg-slate-50/30" onSubmit={handleSubmit}>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Project Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="e.g. Ocean View Phase 2" required />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Description</label>
                  <input name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="Short description" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">Start Date</label>
                    <input name="start_date" type="date" value={form.start_date} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1">End Date</label>
                    <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded px-3 py-2">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-6">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Save Project</button>
                  <button type="button" className="bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold" onClick={onClose}>Cancel</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
