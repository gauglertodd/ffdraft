// Modern control primitives.
//
// Select - Mantine Select. The default <select>-replacing wrapper: snappy
//          (non-searchable) dropdowns; only opts into search when there are
//          enough options to justify it (searchable comboboxes add per-
//          keystroke overhead and feel sluggish on 12+ mounted team cards).
// UnmountCollapse - height-animated collapse that fully unmounts children so
//          no stale panels linger during the exit animation.
// Switch - Mantine Switch passthrough.

import React from 'react';
import { Select as MantineSelect, Switch as MantineSwitch } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';

const SNAPPY_TRANSITION = { transition: 'fade', duration: 0 };

export function Select({ value, onValueChange, options, placeholder, style, disabled, searchable }) {
  const shouldSearch = searchable ?? options.length > 20;
  return (
    <MantineSelect
      value={value || null}
      onChange={(v) => onValueChange && onValueChange(v || '')}
      data={options}
      placeholder={placeholder}
      disabled={disabled}
      searchable={shouldSearch}
      nothingFoundMessage="No matches"
      checkIconPosition="right"
      // Plain selects open instantly on click; searchable ones need the
      // text-input focus cycle.
      openOnFocus={!shouldSearch}
      styles={{
        input: {
          ...style,
          minHeight: style?.height || undefined,
          cursor: disabled ? 'not-allowed' : 'pointer',
        },
      }}
      comboboxProps={{ shadow: 'lg', radius: 'md', position: 'bottom-start', transitionProps: SNAPPY_TRANSITION }}
    />
  );
}

export function Switch({ checked, onChange, label, ...rest }) {
  return (
    <MantineSwitch
      checked={checked}
      onChange={(e) => onChange && onChange(e.currentTarget.checked)}
      label={label}
      size="sm"
      color="teal"
      {...rest}
    />
  );
}

export function UnmountCollapse({ collapsed, children, duration = 0.28 }) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.div
          key="unmount-collapse"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
