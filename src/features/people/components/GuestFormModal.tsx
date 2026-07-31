import { useState } from 'react';
import { X, UserPlus, Info } from 'lucide-react';
import { Button } from '@/components/ui';
import { createGuestPerson } from '@/features/people/services/peopleService';
import type { Person } from '@/types';

interface GuestFormModalProps {
  onClose: () => void;
  onSaved: (person: Person) => void;
}

export function GuestFormModal({ onClose, onSaved }: GuestFormModalProps) {
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Guest full name is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const guest = await createGuestPerson({
        full_name: fullName.trim(),
        designation: designation.trim() || null,
        organization: organization.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      onSaved(guest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add guest');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-surface-900">Add Guest Entry</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs leading-relaxed">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <span>
              Guests are external dignitaries and resource persons. Guest entries do <strong>NOT</strong> receive system login credentials.
            </span>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Guest Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Hon'ble Justice R. K. Varma"
              className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Advocate / Chief Guest"
                className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Organisation
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. High Court Legal Services"
                className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@org.gov.in"
                className="w-full px-3.5 py-2 rounded-xl border border-surface-300 text-sm bg-white text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Guest Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
