type FormFieldProps = {
  id: string;
  label: string;
  type?: 'text' | 'password' | 'email';
  placeholder: string;
  value: string;
  error?: string;
  maxLength?: number;
  autoComplete?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  error,
  maxLength,
  autoComplete = 'off',
  onChange,
}: FormFieldProps) {
  return (
    <div className="home-field">
      <label className="home-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="home-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        autoComplete={autoComplete}
      />
      {error && <p className="home-error">{error}</p>}
    </div>
  );
}
