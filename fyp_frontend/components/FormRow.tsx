interface FormRowProps {
  label: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  required?: boolean;
  placeholder?: string;       // <-- Added for your password field
  children?: React.ReactNode; // <-- Added so it can wrap <select> tags!
}

export default function FormRow({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  required = true,
  placeholder = "",
  children 
}: FormRowProps) {
  return (
    <div className="row">
      <h4 className="w-1/3">{label}</h4>
      
      {children ? (
        children
      ) : (
        <input 
          type={type} 
          className="formInput" 
          required={required} 
          value={value} 
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>} 
          placeholder={placeholder}
        />
      )}
    </div>
  );
}