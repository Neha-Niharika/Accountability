// A labelled form control with an optional error message underneath.
// `as` picks the element: 'input' (default), 'textarea' or 'select'.
// Any other props (value, onChange, min, autoComplete…) go straight to the control.
function FormField({ label, name, as = 'input', type = 'text', error, children, ...controlProps }) {
  const errorId = `${name}-error`
  const Control = as

  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <Control
        id={name}
        name={name}
        type={as === 'input' ? type : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...controlProps}
      >
        {children}
      </Control>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}

export default FormField
