import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, UserPlus, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui';
import { PERSON_CATEGORY, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { createPerson, updatePerson } from '@/features/people/services/peopleService';

const categoryValues = [
  PERSON_CATEGORY.FACULTY,
  PERSON_CATEGORY.STUDENT,
  PERSON_CATEGORY.EXTERNAL,
] as const;

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(categoryValues, { error: 'Category is required' }),
  designation: z.string().optional(),
  organization: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof schema>;

interface PersonFormProps {
  person?: Person | null;
  onClose: () => void;
  onSaved: (person: Person) => void;
}

const CATEGORY_LABELS: Record<PersonCategory, string> = {
  [PERSON_CATEGORY.FACULTY]: 'Faculty Coordinator',
  [PERSON_CATEGORY.STUDENT]: 'Student Volunteer',
  [PERSON_CATEGORY.EXTERNAL]: 'External Guest / Legal Expert',
};

export function PersonForm({ person, onClose, onSaved }: PersonFormProps) {
  const isEdit = !!person;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      category: PERSON_CATEGORY.STUDENT,
      designation: '',
      organization: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (person) {
      reset({
        full_name: person.full_name,
        category: person.category,
        designation: person.designation ?? '',
        organization: person.organization ?? '',
        phone: person.phone ?? '',
        email: person.email ?? '',
      });
    }
  }, [person, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      designation: values.designation || null,
      organization: values.organization || null,
      phone: values.phone || null,
      email: values.email || null,
    };
    const saved = isEdit
      ? await updatePerson(person.id, payload)
      : await createPerson(payload);
    onSaved(saved);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              {isEdit ? <UserCheck size={18} /> : <UserPlus size={18} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEdit ? 'Edit Person Details' : 'Add Person to Registry'}
              </h2>
              <p className="text-xs text-slate-500">Legal Aid Clinic Institutional Directory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          {/* Full Name */}
          <Input
            label="Full Name *"
            placeholder="e.g. Adv. Priya Sharma"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Institutional Category *
            </label>
            <select
              {...register('category')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer font-medium"
            >
              {categoryValues.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-[11px] font-semibold text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Designation & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Designation / Role"
              placeholder="e.g. Student Volunteer"
              error={errors.designation?.message}
              {...register('designation')}
            />
            <Input
              label="Department / Org"
              placeholder="e.g. School of Legal Studies"
              error={errors.organization?.message}
              {...register('organization')}
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. student@reva.edu.in"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Add to Registry'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
