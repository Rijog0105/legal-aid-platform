import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { PERSON_CATEGORY, type PersonCategory } from '@/constants';
import type { Person } from '@/types';
import { createPerson, updatePerson } from '@/features/people/services/peopleService';

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['faculty', 'student', 'external'], {
    required_error: 'Category is required',
  }) as z.ZodType<PersonCategory>,
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
  [PERSON_CATEGORY.FACULTY]: 'Faculty',
  [PERSON_CATEGORY.STUDENT]: 'Student',
  [PERSON_CATEGORY.EXTERNAL]: 'External / Guest',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">
            {isEdit ? 'Edit Person' : 'Add Person'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <Input
              label="Full Name *"
              id="full_name"
              placeholder="Dr. Jane Smith"
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            {/* Category select */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category" className="text-sm font-medium text-surface-700">
                Category *
              </label>
              <select
                id="category"
                {...register('category')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-200 ${
                  errors.category ? 'border-red-500' : ''
                }`}
              >
                {(Object.keys(PERSON_CATEGORY) as Array<keyof typeof PERSON_CATEGORY>).map((key) => (
                  <option key={key} value={PERSON_CATEGORY[key]}>
                    {CATEGORY_LABELS[PERSON_CATEGORY[key]]}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-0.5">{errors.category.message}</p>
              )}
            </div>

            <Input
              label="Designation"
              id="designation"
              placeholder="Professor, Student, Advocate…"
              error={errors.designation?.message}
              {...register('designation')}
            />

            <Input
              label="Organization / Institution"
              id="organization"
              placeholder="University name, firm…"
              error={errors.organization?.message}
              {...register('organization')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input
                label="Email"
                id="email"
                type="email"
                placeholder="email@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Person'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
