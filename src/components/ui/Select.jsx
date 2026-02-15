import React from 'react';
import PropTypes from 'prop-types';

const Select = React.forwardRef(({ 
  label, 
  name, 
  error, 
  children, 
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
      <select
        ref={ref}
        id={name}
        name={name}
        className={`modern-select ${error ? 'input-error' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        required={required}
        {...props}
      >
        {children}
      </select>
      {error && (
        <span id={`${name}-error`} className="error-text">
          {error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  error: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  required: PropTypes.bool,
};

export default Select;
