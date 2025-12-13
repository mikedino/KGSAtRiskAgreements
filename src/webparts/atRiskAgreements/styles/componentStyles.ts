import { mergeStyles } from '@fluentui/react';

// Define reusable styles for the PeoplePicker and nested selectors
export const customPickerClass = mergeStyles({
  selectors: {
    '.ms-BasePicker-text': {
      borderRadius: 4,
      border: '1px solid #c4c4c4',
      padding: 8,
      minHeight: 40,
      transition: 'border-color 150ms ease',
      ':hover': {
        borderColor: '#000000de',
      },
      ':focus-within': {
        borderColor: '#1976d2',
        boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
      },
    },
    '.ms-Persona': {
      fontFamily: 'inherit',
    },
  },
});