import React from 'react';
import Select from 'react-select';

const COUNTRIES = [
  { value: 'Other', label: 'Other' },
  { value: 'Palestine', label: 'Palestine' },
  { value: 'Jordan', label: 'Jordan' },
  { value: 'USA', label: 'USA' },
  { value: 'UK', label: 'UK' }
];

const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'rgba(10, 15, 28, 0.6)',
    color: '#e2e8f0',
    borderColor: state.isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.15)',
    borderRadius: '10px',
    padding: '4px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: 'rgba(99, 102, 241, 0.3)',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#e2e8f0',
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(10, 15, 28, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
    color: state.isFocused ? '#c4b5fd' : '#a5b4fc',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:active': {
      backgroundColor: 'rgba(99, 102, 241, 0.25)',
    },
  }),
  input: (provided) => ({
    ...provided,
    color: '#e2e8f0',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#a5b4fc',
    '&:hover': {
      color: '#c4b5fd',
    },
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  }),
};

const CountrySelect = ({ value, onChange }) => {
  return (
    <Select
      id="country"
      classNamePrefix="account-settings-select"
      value={COUNTRIES.find(opt => opt.value === value)}
      onChange={opt => onChange(opt.value)}
      options={COUNTRIES}
      isSearchable={false}
      styles={selectStyles}
    />
  );
};

export default CountrySelect;
