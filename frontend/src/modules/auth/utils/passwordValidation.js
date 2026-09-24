export const passwordRequirements = [
  { id: 'length', label: 'Minimum 8 characters', test: (value) => value.length >= 8 },
  { id: 'number', label: 'At least 1 number', test: (value) => /\d/.test(value) },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lowercase', label: 'At least 1 lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'special', label: 'At least 1 special character', test: (value) => /[^A-Za-z0-9]/.test(value) }
];

export const getPasswordIssues = (password) => passwordRequirements.filter((item) => !item.test(password));

export const passwordsDoNotMatch = (password, confirmPassword) => (
  Boolean(confirmPassword) && password !== confirmPassword
);
