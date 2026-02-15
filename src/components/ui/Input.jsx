import React from 'react';
import PropTypes from 'prop-types';

const Input = React.forwardRef(({ 
  label, 
  name, 
  error, 
  className = '', 
  containerClassName = '',
  required = false,
  ...props 
}, ref) => {
  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={name}
        name={name}
        className={`form-input ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        required={required}
        {...props}
      />
      {error && (
        <span id={`${name}-error`} className="error-text">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  error: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  required: PropTypes.bool,
};

export default Input;
