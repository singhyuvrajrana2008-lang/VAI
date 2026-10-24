import { Search } from 'lucide-react';
import type { Catchment } from '../lib/schemas';

export function CatchmentSelect({
  catchments,
  value,
  onChange,
  label = 'Selected catchment',
  disabled,
}: {
  catchments: Catchment[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const id = 'catchment-select';
  return (
    <div className="catchment-select">
      <label htmlFor={id}>{label}</label>
      <div className="catchment-select__control">
        <Search size={15} aria-hidden="true" />
        <select
          id={id}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || catchments.length === 0}
        >
          {catchments.length === 0 ? <option value="">No catchments configured</option> : null}
          {catchments.map((catchment) => (
            <option key={catchment.id} value={catchment.id}>
              {catchment.name}
              {catchment.is_demo ? ' — DEMO' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
