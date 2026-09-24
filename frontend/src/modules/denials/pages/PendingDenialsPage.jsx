import { ArrowDown, ArrowUp, ArrowUpDown, Bookmark, ChevronDown, ChevronRight, Filter, GitBranchPlus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../common/components/Button';
import ConfirmationModal from '../../../common/components/ConfirmationModal';
import { useAuth } from '../../../common/context/AuthContext';
import { denialService } from '../../../common/services/denialService';
import { userService } from '../../../common/services/userService';
import '../styles/denials.css';

const ROW_OPTIONS = [10, 25, 50, 100];
const EMPTY_FILTERS = {
  service_date_from: '',
  service_date_to: '',
  payer: [],
  provider: [],
  practice: [],
  procedure: [],
  modifier: [],
  reason: [],
  remark: [],
  action: [],
  denial_category: [],
  assigned_to: [],
  eob_date_from: '',
  eob_date_to: '',
  date_added_from: '',
  date_added_to: '',
  dashboard_deadline: '',
};
const EMPTY_RULE_CRITERIA = {
  payer: [],
  practice: [],
  procedure: [],
  modifier: [],
  reason: [],
  remark: [],
};

const FILTER_LABELS = {
  service_date_from: 'Service Date From',
  service_date_to: 'Service Date To',
  payer: 'Payer',
  provider: 'Rendering Provider',
  practice: 'Practice',
  procedure: 'Procedure Code',
  modifier: 'Modifier',
  reason: 'Reason Code',
  remark: 'Remark Code',
  action: 'Action',
  denial_category: 'Denial Categories',
  assigned_to: 'Assigned To',
  eob_date_from: 'EOB Date From',
  eob_date_to: 'EOB Date To',
  date_added_from: 'Date Added From',
  date_added_to: 'Date Added To',
  dashboard_deadline: 'Deadline',
};
const RULE_LABELS = {
  payer: "Payer",
  practice: "Practice",
  procedure: "Procedure Code",
  modifier: "Modifier",
  reason: "Reason Code",
  remark: "Remark Code",
};

const money = (value) => (
  value === null || value === undefined ? '-' : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
);
const date = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '-');
const dateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const todayValue = () => new Date().toISOString().slice(0, 10);
const addDays = (value, days) => {
  if (!value) return '';
  const dateValue = new Date(`${toDateValue(value)}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) return '';
  dateValue.setDate(dateValue.getDate() + days);
  return dateValue.toISOString().slice(0, 10);
};
const appealDraftKey = (denialId) => `appeal_draft_${denialId}`;
const serviceDateText = (denial) => denial.service_date_display || date(denial.service_date);
const toDateValue = (value) => {
  if (!value) return '';
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const [, month, day, year] = slashDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
};
const serviceDateStart = (denial) => {
  if (denial.service_date) return toDateValue(denial.service_date);
  const display = denial.service_date_display || '';
  const firstPart = display.split(' - ')[0];
  return toDateValue(firstPart);
};
const appealDeadlineValue = (denial) => addDays(denial.eob_date || denial.date_added, 60);
const splitCodes = (value) => (
  value
    ? String(value)
      .split(/[,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    : []
);

const CODE_ORDER = {
  CO: 1,
  PR: 2,
  PI: 3,
  OA: 4,
};

function codePrefix(code) {
  return String(code || '').trim().toUpperCase().match(/^[A-Z]+/)?.[0] || '';
}

function sortedCodes(value, type) {
  const codes = splitCodes(value);

  if (type === 'procedure') return codes;

  return [...codes].sort((first, second) => {
    const firstOrder = CODE_ORDER[codePrefix(first)] || 99;
    const secondOrder = CODE_ORDER[codePrefix(second)] || 99;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function codeTone(code, type) {
  const normalized = String(code || '').trim().toUpperCase();

  if (type === 'procedure') {
    if (/^9/.test(normalized)) return 'diagnostic';
    if (/^7/.test(normalized)) return 'radiology';
    if (/^[1-6]/.test(normalized)) return 'surgery';
    return 'standard';
  }

  if (/^CO/.test(normalized)) return 'contractual';
  if (/^PR/.test(normalized)) return 'patient';
  if (/^PI/.test(normalized)) return 'payer';
  if (/^OA/.test(normalized)) return 'other';
  return 'standard';
}

function descriptionForCode(code, description, type) {
  if (!description) return '';
  const entries = String(description)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!entries.length) return '';

  if (type === 'procedure') return description;

  const normalizedCode = type === 'denial'
    ? String(code || '').trim().toUpperCase()
    : String(code || '').trim().toUpperCase();
  const fallbackCode = type === 'denial'
    ? normalizedCode.match(/(?:CO|PR|PI|OA)?-?(\d+)$/)?.[1]
    : normalizedCode;

  const matched = entries.find((entry) => {
    const [entryCode] = entry.split(':');
    const entryText = String(entryCode || '').trim().toUpperCase();
    const normalizedEntryCode = type === 'denial'
      ? entryText
      : entryText;
    const entryFallbackCode = type === 'denial'
      ? entryText.match(/(?:CO|PR|PI|OA)?-?(\d+)$/)?.[1]
      : entryText;
    return normalizedEntryCode === normalizedCode || (entryFallbackCode && entryFallbackCode === fallbackCode);
  });

  return matched ? matched.replace(/^[^:]+:\s*/, '') : '';
}

function CodeCell({ value, description, type = 'denial' }) {
  const codes = sortedCodes(value, type);

  if (!codes.length) {
    return <span className="empty-text">-</span>;
  }

  return (
    <div className="code-cell">
      {codes.map((code) => {
        const codeDescription = descriptionForCode(code, description, type);
        return (
          <span key={code} className={`code-chip tone-${codeTone(code, type)}`} title={codeDescription || undefined}>{code}</span>
        );
      })}
    </div>
  );
}

function ServiceDateCell({ value }) {
  const text = value || '-';
  const rangeParts = text.includes(' - ') ? text.split(' - ').map((item) => item.trim()).filter(Boolean) : null;

  if (rangeParts?.length === 2) {
    return (
      <span className="service-date-range">
        <span>{rangeParts[0]}</span>
        <span>-</span>
        <span>{rangeParts[1]}</span>
      </span>
    );
  }

  return text;
}

function PaginationButton({ children, active, disabled, onClick, label }) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={`page-step${active ? ' active' : ''}`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SortHeader({ label, column, sort, onSort, children }) {
  const active = sort.column === column;
  const Icon = active ? (sort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  const directionLabel = active ? `Sorted ${sort.direction === 'asc' ? 'ascending' : 'descending'}` : 'Not sorted';

  return (
    <button
      className={`sort-header${active ? ' active' : ''}`}
      type="button"
      aria-label={`Sort by ${label}. ${directionLabel}`}
      onClick={() => onSort(column)}
    >
      <span>{children || label}</span>
      <Icon size={13} strokeWidth={2.5} />
    </button>
  );
}

const SORT_GETTERS = {
  patient: (denial) => denial.patient,
  claim_id: (denial) => denial.claim_id,
  service_date: (denial) => denial.service_date || denial.service_date_display,
  billed_amt: (denial) => Number(denial.billed_amt || 0),
  payer: (denial) => denial.payer,
  provider: (denial) => denial.provider,
  assigned_to: (denial) => denial.assigned_to?.username || 'Unassigned',
  eob_date: (denial) => denial.eob_date,
  date_added: (denial) => denial.date_added,
};

function compareValues(first, second) {
  if (typeof first === 'number' || typeof second === 'number') {
    return Number(first || 0) - Number(second || 0);
  }

  return String(first || '').localeCompare(String(second || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

const uniqueOptions = (items, getter) => (
  [...new Set(items.flatMap((item) => {
    const value = getter(item);
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }))]
    .map((item) => String(item).trim())
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
);
const countedOptions = (items, getter) => {
  const counts = new Map();
  items.forEach((item) => {
    const value = getter(item);
    const values = Array.isArray(value) ? [...new Set(value.filter(Boolean))] : (value ? [value] : []);
    values.forEach((entry) => {
      const normalized = String(entry).trim();
      if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((first, second) => first.value.localeCompare(second.value, undefined, { numeric: true, sensitivity: 'base' }));
};
const countMapFor = (items, getter) => new Map(countedOptions(items, getter).map((item) => [item.value, item.count]));

const hasFilterValue = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));
const hasActiveFilters = (filters) => Object.values(filters).some(hasFilterValue);
const savedFiltersKey = (user) => `opus_saved_denial_filters_${user?.id || user?.username || 'default'}`;

const FILTER_VALUE_GETTERS = {
  payer: (denial) => [denial.payer],
  provider: (denial) => [denial.provider],
  practice: (denial) => [denial.practice],
  procedure: (denial) => splitCodes(denial.procedure),
  modifier: (denial) => splitCodes(denial.modifier),
  reason: (denial) => splitCodes(denial.reason),
  remark: (denial) => splitCodes(denial.remark),
  action: (denial) => [workItemActionName(denial)].filter(Boolean),
  denial_category: (denial) => denial.denial_categories?.length ? denial.denial_categories : ['Uncategorized'],
  assigned_to: (denial) => [denial.assigned_to?.username || 'Unassigned'],
};

function includesAny(recordValues, selectedValues = []) {
  if (!selectedValues.length) return true;
  const normalized = recordValues.filter(Boolean).map((item) => String(item).toLowerCase());
  return selectedValues.some((item) => normalized.includes(String(item).toLowerCase()));
}

function matchesDenialFilters(denial, filters, ignoredKey = '', search = '', quickAssigned = '', currentUsername = '', selectedOtherUsers = []) {
  const assignedName = denial.assigned_to?.username || 'Unassigned';
  const serviceStart = serviceDateStart(denial);
  const eobDate = toDateValue(denial.eob_date);
  const dateAdded = toDateValue(denial.date_added);
  const appealDeadline = appealDeadlineValue(denial);
  const searchValue = search.trim().toLowerCase();

  if (searchValue) {
    const patient = String(denial.patient || '').toLowerCase();
    const claimId = String(denial.claim_id || '').toLowerCase();
    if (!patient.includes(searchValue) && !claimId.includes(searchValue)) return false;
  }

  if (quickAssigned) {
    if (quickAssigned === 'me' && denial.assigned_to?.username !== currentUsername) return false;
    if (quickAssigned === 'others') {
      if (!denial.assigned_to?.username || denial.assigned_to.username === currentUsername) return false;
      if (!selectedOtherUsers.length || !selectedOtherUsers.includes(denial.assigned_to.username)) return false;
    }
    if (quickAssigned === 'unassigned' && denial.assigned_to?.username) return false;
  }
  if (ignoredKey !== 'service_date_from' && filters.service_date_from && serviceStart < filters.service_date_from) return false;
  if (ignoredKey !== 'service_date_to' && filters.service_date_to && serviceStart > filters.service_date_to) return false;
  if (ignoredKey !== 'eob_date_from' && filters.eob_date_from && eobDate < filters.eob_date_from) return false;
  if (ignoredKey !== 'eob_date_to' && filters.eob_date_to && eobDate > filters.eob_date_to) return false;
  if (ignoredKey !== 'date_added_from' && filters.date_added_from && dateAdded < filters.date_added_from) return false;
  if (ignoredKey !== 'date_added_to' && filters.date_added_to && dateAdded > filters.date_added_to) return false;
  if (ignoredKey !== 'dashboard_deadline' && filters.dashboard_deadline && appealDeadline) {
    const today = todayValue();
    const daysRemaining = Math.ceil((new Date(`${appealDeadline}T00:00:00`) - new Date(`${today}T00:00:00`)) / (24 * 60 * 60 * 1000));
    if (filters.dashboard_deadline === 'near' && !(daysRemaining >= 0 && daysRemaining < 5)) return false;
    if (filters.dashboard_deadline === 'critical' && !(daysRemaining < 0)) return false;
  }

  return Object.entries(FILTER_VALUE_GETTERS).every(([key, getter]) => (
    ignoredKey === key || includesAny(getter(denial), filters[key])
  ));
}

function buildContextualOptions(items, filters, key) {
  const getter = FILTER_VALUE_GETTERS[key];
  const allOptions = countedOptions(items, getter);
  const contextItems = items.filter((denial) => matchesDenialFilters(denial, filters, key));
  const contextCounts = countMapFor(contextItems, getter);

  return allOptions.map((option) => ({
    value: option.value,
    count: contextCounts.get(option.value) || 0,
  }));
}

function filterSummary(filters, search, quickAssigned) {
  const entries = Object.entries(filters)
    .filter(([, value]) => hasFilterValue(value))
    .map(([key, value]) => `${FILTER_LABELS[key]}: ${Array.isArray(value) ? value.join(', ') : value}`);

  if (search) entries.push(`Search: ${search}`);
  if (quickAssigned) entries.push(`Assigned user quick filter: ${quickAssigned}`);

  return entries;
}

function quickAssignmentOptions(denials, user, filters = EMPTY_FILTERS, search = '') {
  const username = user?.username || '';
  const scopedDenials = denials.filter((denial) => matchesDenialFilters(denial, filters, '', search, '', username));
  const assignedToMe = scopedDenials.filter((denial) => denial.assigned_to?.username === username).length;
  const unassigned = scopedDenials.filter((denial) => !denial.assigned_to?.username).length;
  const options = [
    { value: 'me', label: 'Assigned to me', count: assignedToMe },
  ];

  if (user?.role === 'admin') {
    options.push({
      value: 'others',
      label: 'Assigned to others',
      count: scopedDenials.filter((denial) => denial.assigned_to?.username && denial.assigned_to.username !== username).length,
    });
  }

  options.push({ value: 'unassigned', label: 'Unassigned', count: unassigned });
  return options;
}

function otherAssignedUsers(denials, user, filters, search) {
  const username = user?.username || '';
  const counts = new Map();
  denials
    .filter((denial) => matchesDenialFilters(denial, filters, '', search, '', username))
    .forEach((denial) => {
      const assignedName = denial.assigned_to?.username;
      if (assignedName && assignedName !== username) {
        counts.set(assignedName, (counts.get(assignedName) || 0) + 1);
      }
    });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function valuesOverlap(first = [], second = []) {
  if (!first.length || !second.length) return true;
  const normalized = new Set(first.map((item) => String(item).toLowerCase()));
  return second.some((item) => normalized.has(String(item).toLowerCase()));
}

function rulesOverlap(firstCriteria = {}, secondCriteria = {}) {
  return Object.keys(EMPTY_RULE_CRITERIA).every((key) => (
    valuesOverlap(firstCriteria[key] || [], secondCriteria[key] || [])
  ));
}

function MultiSelectFilter({ label, value, options, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef(null);
  const selected = value.length > 0;
  const displayText = selected
    ? `${value[0]}${value.length > 1 ? ` +${value.length - 1} others` : ''}`
    : `Select ${label}`;

  const toggleValue = (optionValue) => {
    onChange(value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]);
  };

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={fieldRef} className={`filter-field dropdown-filter-field${selected ? ' selected' : ''}`}>
      <div className="filter-field-title">
        <span>{label}</span>
        {selected ? <button type="button" onClick={onClear}>Clear</button> : null}
      </div>
      <button className="filter-dropdown-trigger" type="button" onClick={() => setOpen((current) => !current)}>
        <span>{displayText}</span>
        <ChevronDown size={15} />
      </button>
      {selected ? (
        <div className="selected-filter-chips">
          <span>{value[0]}</span>
          {value.length > 1 ? <span>+{value.length - 1} others</span> : null}
        </div>
      ) : null}
      {open ? (
        <div className="filter-dropdown-menu">
          {options.length ? options.map((option) => (
            <label key={option.value} className="filter-option-row">
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.value} <strong>({option.count})</strong></span>
            </label>
          )) : <p>No values available</p>}
        </div>
      ) : null}
    </div>
  );
}

function DateFilter({ label, value, onChange, onClear }) {
  return (
    <label className="filter-field">
      <div className="filter-field-title">
        <span>{label}</span>
        {value ? <button type="button" onClick={onClear}>Clear</button> : null}
      </div>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AssignedQuickFilter({
  value,
  options,
  otherUsers,
  selectedOtherUsers,
  onChange,
  onOtherUsersChange,
}) {
  const [open, setOpen] = useState(false);
  const [draftOtherUsers, setDraftOtherUsers] = useState(selectedOtherUsers);
  const wrapperRef = useRef(null);
  const current = options.find((option) => option.value === value);
  const otherSelectedCount = draftOtherUsers.length || otherUsers.length;
  const allOthersChecked = otherUsers.length > 0 && draftOtherUsers.length === otherUsers.length;

  useEffect(() => {
    if (open) setDraftOtherUsers(selectedOtherUsers.length ? selectedOtherUsers : otherUsers.map((item) => item.name));
  }, [open, selectedOtherUsers, otherUsers]);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        if (value === 'others') {
          onOtherUsersChange(draftOtherUsers);
        }
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open, value, draftOtherUsers, onOtherUsersChange]);

  const toggleOtherUser = (name) => {
    setDraftOtherUsers(draftOtherUsers.includes(name)
      ? draftOtherUsers.filter((item) => item !== name)
      : [...draftOtherUsers, name]);
  };

  const selectAllOthers = () => {
    setDraftOtherUsers(allOthersChecked ? [] : otherUsers.map((item) => item.name));
  };

  return (
    <div className="assigned-quick-filter custom-assigned-filter" ref={wrapperRef}>
      <span>Assigned user</span>
      <button type="button" onClick={() => setOpen((state) => !state)}>
        {current ? `${current.label} (${current.count})` : 'All assigned users'}
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="assigned-filter-menu">
          <button type="button" className={!value ? 'active' : ''} onClick={() => { onChange(''); setOpen(false); }}>
            All assigned users
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={value === option.value ? 'active' : ''}
              onClick={() => {
                onChange(option.value);
                if (option.value === 'others') {
                  setDraftOtherUsers(selectedOtherUsers.length ? selectedOtherUsers : otherUsers.map((item) => item.name));
                } else {
                  setOpen(false);
                }
              }}
            >
              <span>{option.label} ({option.count})</span>
              {option.value === 'others' ? <ChevronRight size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
      {open && value === 'others' ? (
        <div className="assigned-users-panel">
          <label className="assigned-users-check-all">
            <input type="checkbox" checked={allOthersChecked} onChange={selectAllOthers} />
            <span>Check all ({otherSelectedCount})</span>
          </label>
          {otherUsers.map((item) => (
            <label key={item.name} className="assigned-user-option">
              <input
                type="checkbox"
                checked={draftOtherUsers.includes(item.name)}
                onChange={() => toggleOtherUser(item.name)}
              />
              <span>{item.name} ({item.count})</span>
            </label>
          ))}
          {!otherUsers.length ? <p>No assigned users</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function QuickMultiFilter({ label, value, options, allLabel, className = '', onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selected = value.length > 0;
  const displayText = selected
    ? `${value[0]}${value.length > 1 ? ` +${value.length - 1} others` : ''}`
    : allLabel;

  const toggleValue = (optionValue) => {
    onChange(value.includes(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue]);
  };

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div className={`assigned-quick-filter custom-assigned-filter denial-category-filter ${className}${selected ? ' active' : ''}`} ref={wrapperRef}>
      <span>{label}</span>
      <button type="button" onClick={() => setOpen((state) => !state)}>
        {displayText}
        <ChevronDown size={15} />
      </button>
      {open ? (
        <div className="assigned-filter-menu denial-category-filter-menu">
          <button type="button" className={!selected ? 'active' : ''} onClick={() => { onChange([]); setOpen(false); }}>
            <span>{allLabel}</span>
          </button>
          {options.map((option) => (
            <label key={option.value} className="assigned-category-option">
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.value}</span>
              <strong>({option.count})</strong>
            </label>
          ))}
          {!options.length ? <p>No values available</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function DenialCategoryBadge({ denial }) {
  const details = denial.denial_category_details || [];
  const categories = denial.denial_categories?.length ? denial.denial_categories : ['Uncategorized'];
  const title = details.length
    ? details.map((item) => `${String(item.code || '').toUpperCase()}: ${item.category || 'Uncategorized'}`).join('\n')
    : categories.join(', ');

  return (
    <span className={`denial-category-badge${categories.includes('Uncategorized') ? ' uncategorized' : ''}`} title={title}>
      DC
    </span>
  );
}

function actionLabel(denial) {
  if (!denial.assigned_action?.name) return '';
  if (denial.assigned_action.name.toLowerCase() === 'other' && denial.action_other_description) {
    return `Other: ${denial.action_other_description}`;
  }
  return denial.assigned_action.name;
}

function workItemActionName(denial) {
  return denial.assigned_action?.name || (denial.appeal_status === 'in_process' ? 'Appeal' : '');
}

function userDisplayName(user) {
  if (!user) return '';
  return user.full_name || user.username || '';
}

function workflowAgentName(denial) {
  return userDisplayName(
    denial.action_completed_by
    || denial.appeal_completed_by
    || denial.action_assigned_by
    || denial.appeal_started_by
    || denial.assigned_to
  );
}

function ActionCell({ denial }) {
  const label = actionLabel(denial) || workItemActionName(denial);
  if (!label) return <span className="empty-text">-</span>;
  const title = [
    label,
    denial.action_notes ? `Notes: ${denial.action_notes}` : '',
    denial.action_assigned_at ? `Assigned: ${dateTime(denial.action_assigned_at)}` : '',
    denial.action_completed_at ? `Completed: ${dateTime(denial.action_completed_at)}` : '',
  ].filter(Boolean).join('\n');

  return <span className="action-chip" title={title}>{label}</span>;
}

function AgentCell({ denial }) {
  const name = workflowAgentName(denial);
  return name ? <span className="cell-primary" title={name}>{name}</span> : <span className="empty-text">-</span>;
}

function paginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const middleStart = Math.max(2, currentPage - 1);
  const middleEnd = Math.min(totalPages - 1, currentPage + 1);

  if (middleStart > 2) pages.push('start-ellipsis');
  for (let page = middleStart; page <= middleEnd; page += 1) pages.push(page);
  if (middleEnd < totalPages - 1) pages.push('end-ellipsis');
  pages.push(totalPages);

  return pages;
}

export default function PendingDenialsPage({ status = 'pending' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const inProcessMode = status === 'in_process';
  const [denials, setDenials] = useState([]);
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [selectedDenial, setSelectedDenial] = useState(null);
  const [actionDenial, setActionDenial] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState('');
  const [actionOtherDescription, setActionOtherDescription] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [newActionName, setNewActionName] = useState('');
  const [addingNewAction, setAddingNewAction] = useState(false);
  const [assigningAction, setAssigningAction] = useState(false);
  const [creatingAction, setCreatingAction] = useState(false);
  const [removeActionOpen, setRemoveActionOpen] = useState(false);
  const [completeActionOpen, setCompleteActionOpen] = useState(false);
  const [updatingActionStatus, setUpdatingActionStatus] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState({ column: 'date_added', direction: 'desc' });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterPanelIntent, setFilterPanelIntent] = useState('apply');
  const [savedFiltersOpen, setSavedFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [confirmFiltersOpen, setConfirmFiltersOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [pendingSaveFilters, setPendingSaveFilters] = useState(null);
  const [savedFilters, setSavedFilters] = useState([]);
  const [confirmDeleteFilterId, setConfirmDeleteFilterId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [quickAssigned, setQuickAssigned] = useState('');
  const [selectedOtherUsers, setSelectedOtherUsers] = useState([]);
  const savedFilterRef = useRef(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleCriteria, setRuleCriteria] = useState(EMPTY_RULE_CRITERIA);
  const [ruleAssigneeId, setRuleAssigneeId] = useState('');
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState(todayValue());
  const [editingRule, setEditingRule] = useState(null);
  const [confirmRuleOpen, setConfirmRuleOpen] = useState(false);
  const [updatingRule, setUpdatingRule] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [deactivateRule, setDeactivateRule] = useState(null);
  const [appealMenuDenial, setAppealMenuDenial] = useState(null);
  const [appealMenuPosition, setAppealMenuPosition] = useState(null);
  const [appealStartDenial, setAppealStartDenial] = useState(null);
  const [resumeAppealDenial, setResumeAppealDenial] = useState(null);
  const [selectedAppealIds, setSelectedAppealIds] = useState([]);
  const [removeAppealOpen, setRemoveAppealOpen] = useState(false);
  const [removingAppeals, setRemovingAppeals] = useState(false);
  const selectAllRef = useRef(null);

  const loadDenials = () => {
    setLoading(true);
    setMessage('');
    const request = inProcessMode ? denialService.listInProcess() : denialService.listPending();
    request
      .then((response) => {
        setDenials(response.data.denials);
        setCurrentPage(1);
        setSelectedAppealIds([]);
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  };

  const loadRules = () => {
    setRulesLoading(true);
    denialService
      .listAssignmentRules()
      .then((response) => setRules(response.data.rules))
      .catch((error) => setMessage(error.message))
      .finally(() => setRulesLoading(false));
  };

  const loadActions = () => {
    denialService
      .listActions()
      .then((response) => setActions(response.data.actions || []))
      .catch((error) => setMessage(error.message));
  };

  useEffect(() => {
    loadDenials();
    loadRules();
    loadActions();
  }, [status]);

  useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const nextFilters = {
      ...EMPTY_FILTERS,
      date_added_from: params.get('from') || '',
      date_added_to: params.get('to') || '',
      practice: params.get('practice') ? params.get('practice').split('|').filter(Boolean) : [],
      action: params.get('action') ? [params.get('action')].filter(Boolean) : [],
      dashboard_deadline: params.get('deadline') || '',
    };
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    const stored = localStorage.getItem(savedFiltersKey(user));
    if (!stored) {
      setSavedFilters([]);
      return;
    }

    try {
      setSavedFilters(JSON.parse(stored));
    } catch {
      setSavedFilters([]);
    }
  }, [user]);

  useEffect(() => {
    if (!filterPanelOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filterPanelOpen]);

  useEffect(() => {
    if (!savedFiltersOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (savedFilterRef.current && !savedFilterRef.current.contains(event.target)) {
        setSavedFiltersOpen(false);
        setConfirmDeleteFilterId('');
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [savedFiltersOpen]);

  useEffect(() => {
    if (!appealMenuDenial) return undefined;

    const closeMenu = (event) => {
      if (event?.target?.closest?.('.appeal-row-menu, .appeal-memo-button')) return;
      setAppealMenuDenial(null);
      setAppealMenuPosition(null);
    };

    document.addEventListener('mousedown', closeMenu);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [appealMenuDenial]);

  const toggleAppealMenu = (denial, event) => {
    event.stopPropagation();
    if (appealMenuDenial?.id === denial.id) {
      setAppealMenuDenial(null);
      setAppealMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setAppealMenuDenial(denial);
    setAppealMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
    });
  };

  const openAssignment = async (denial) => {
    if (user?.role !== 'admin') return;
    setSelectedDenial([denial]);
    setAssigneeId('');
    if (!users.length) {
      setUsersLoading(true);
      try {
        const response = await userService.listUsers();
        setUsers(response.data.users.filter((item) => item.role === 'user' && item.is_active));
      } catch (error) {
        setMessage(error.message);
      } finally {
        setUsersLoading(false);
      }
    }
  };

  const openSelectedAssignment = async () => {
    if (user?.role !== 'admin' || !selectedAppealIds.length) return;
    const selectedDenials = denials.filter((denial) => selectedAppealIds.includes(denial.id));
    if (!selectedDenials.length) return;
    setSelectedDenial(selectedDenials);
    setAssigneeId('');
    await ensureUsersLoaded();
  };

  const ensureUsersLoaded = async () => {
    if (users.length || user?.role !== 'admin') return;
    setUsersLoading(true);
    try {
      const response = await userService.listUsers();
      setUsers(response.data.users.filter((item) => item.role === 'user' && item.is_active));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const openAssignmentRules = async () => {
    setRulesOpen(true);
    loadRules();
    await ensureUsersLoaded();
  };

  const openAddRule = async () => {
    setRuleCriteria(EMPTY_RULE_CRITERIA);
    setRuleAssigneeId('');
    setRuleEffectiveFrom(todayValue());
    setEditingRule(null);
    setAddRuleOpen(true);
    await ensureUsersLoaded();
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);
    setRuleCriteria({ ...EMPTY_RULE_CRITERIA, ...(rule.criteria || {}) });
    setRuleAssigneeId(String(rule.assigned_to?.id || rule.assigned_to_id || ''));
    setRuleEffectiveFrom(rule.effective_from ? rule.effective_from.slice(0, 10) : todayValue());
    setAddRuleOpen(true);
  };

  const assign = async () => {
    if (!selectedDenial?.length || !assigneeId) return;
    setAssigning(true);
    try {
      await Promise.all(selectedDenial.map((denial) => denialService.assign(denial.id, assigneeId)));
      setSelectedDenial(null);
      setSelectedAppealIds([]);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAssigning(false);
    }
  };

  const updateRuleCriteria = (key, value) => {
    setRuleCriteria((current) => ({ ...current, [key]: value }));
  };

  const ruleSummary = Object.entries(ruleCriteria).map(([key, value]) => (
    `${RULE_LABELS[key]}: ${value.length ? value.join(', ') : 'All'}`
  ));
  const ruleConflictWarnings = rules
    .filter((rule) => rule.is_active && rule.id !== editingRule?.id && rulesOverlap(ruleCriteria, rule.criteria || {}))
    .map((rule) => ({
      id: rule.id,
      text: `${rule.assigned_to?.username || 'Unknown user'} already has an overlapping active rule effective ${dateTime(rule.effective_from)}.`,
      sameUser: String(rule.assigned_to?.id || '') === String(ruleAssigneeId),
    }));

  const createRule = async () => {
    if (!ruleAssigneeId) return;
    setCreatingRule(true);
    try {
      await denialService.createAssignmentRule({
        assigned_to_id: Number(ruleAssigneeId),
        criteria: ruleCriteria,
        effective_from: ruleEffectiveFrom,
      });
      setConfirmRuleOpen(false);
      setAddRuleOpen(false);
      setRulesOpen(true);
      setRuleAssigneeId('');
      setRuleCriteria(EMPTY_RULE_CRITERIA);
      setRuleEffectiveFrom(todayValue());
      loadRules();
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setCreatingRule(false);
    }
  };

  const updateRule = async () => {
    if (!editingRule) return;
    setUpdatingRule(true);
    try {
      await denialService.updateAssignmentRule(editingRule.id, {
        assigned_to_id: editingRule.assigned_to?.id || ruleAssigneeId,
        criteria: ruleCriteria,
        effective_from: ruleEffectiveFrom,
      });
      setAddRuleOpen(false);
      setEditingRule(null);
      setRuleCriteria(EMPTY_RULE_CRITERIA);
      loadRules();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUpdatingRule(false);
    }
  };

  const deactivateSelectedRule = async () => {
    if (!deactivateRule) return;
    try {
      await denialService.deactivateAssignmentRule(deactivateRule.id);
      setDeactivateRule(null);
      loadRules();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const filterOptions = useMemo(() => (
    Object.keys(FILTER_VALUE_GETTERS).reduce((options, key) => ({
      ...options,
      [key]: buildContextualOptions(denials, draftFilters, key),
    }), {})
  ), [denials, draftFilters]);

  const assignmentOptions = useMemo(
    () => quickAssignmentOptions(denials, user, appliedFilters, appliedSearch),
    [denials, user, appliedFilters, appliedSearch]
  );
  const otherUserOptions = useMemo(
    () => otherAssignedUsers(denials, user, appliedFilters, appliedSearch),
    [denials, user, appliedFilters, appliedSearch]
  );
  const denialCategoryOptions = useMemo(() => {
    const filtersWithoutCategory = { ...appliedFilters, denial_category: [] };
    const scopedDenials = denials.filter((denial) => matchesDenialFilters(
      denial,
      filtersWithoutCategory,
      'denial_category',
      appliedSearch,
      quickAssigned,
      user?.username || '',
      selectedOtherUsers
    ));
    return countedOptions(scopedDenials, FILTER_VALUE_GETTERS.denial_category);
  }, [denials, appliedFilters, appliedSearch, quickAssigned, user, selectedOtherUsers]);
  const actionFilterOptions = useMemo(() => {
    const filtersWithoutAction = { ...appliedFilters, action: [] };
    const scopedDenials = denials.filter((denial) => matchesDenialFilters(
      denial,
      filtersWithoutAction,
      'action',
      appliedSearch,
      quickAssigned,
      user?.username || '',
      selectedOtherUsers
    ));
    return countedOptions(scopedDenials, FILTER_VALUE_GETTERS.action);
  }, [denials, appliedFilters, appliedSearch, quickAssigned, user, selectedOtherUsers]);

  useEffect(() => {
    if (!otherUserOptions.length || quickAssigned !== 'others') {
      setSelectedOtherUsers([]);
      return;
    }
    setSelectedOtherUsers((current) => {
      const available = otherUserOptions.map((item) => item.name);
      return current.filter((item) => available.includes(item));
    });
  }, [otherUserOptions, quickAssigned]);

  const filteredDenials = useMemo(() => {
    return denials.filter((denial) => matchesDenialFilters(
      denial,
      appliedFilters,
      '',
      appliedSearch,
      quickAssigned,
      user?.username || '',
      selectedOtherUsers
    ));
  }, [denials, appliedFilters, appliedSearch, quickAssigned, user, selectedOtherUsers]);

  const sortedDenials = useMemo(() => {
    const getter = SORT_GETTERS[sort.column] || SORT_GETTERS.date_added;

    return [...filteredDenials].sort((first, second) => {
      const result = compareValues(getter(first), getter(second));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [filteredDenials, sort]);

  const totalRows = sortedDenials.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalRows ? (safeCurrentPage - 1) * rowsPerPage : 0;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const visibleDenials = sortedDenials.slice(startIndex, endIndex);
  const pages = paginationItems(safeCurrentPage, totalPages);
  const selectedAppeals = denials.filter((denial) => selectedAppealIds.includes(denial.id));
  const selectedActionDenials = selectedAppeals.filter((denial) => denial.assigned_action);
  const selectedAppealDenials = selectedAppeals.filter((denial) => !denial.assigned_action);
  const selectedFilteredCount = sortedDenials.filter((denial) => selectedAppealIds.includes(denial.id)).length;
  const allFilteredAppealsSelected = sortedDenials.length > 0 && selectedFilteredCount === sortedDenials.length;
  const someFilteredAppealsSelected = selectedFilteredCount > 0 && selectedFilteredCount < sortedDenials.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredAppealsSelected;
    }
  }, [someFilteredAppealsSelected]);

  const changeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const quickAssignedLabel = assignmentOptions.find((option) => option.value === quickAssigned)?.label || quickAssigned;
  const activeFilterSummary = filterSummary(appliedFilters, appliedSearch, quickAssignedLabel);
  const draftFilterSummary = filterSummary(draftFilters, '', '');
  const filtersActive = activeFilterSummary.length > 0;
  const selectedAction = actions.find((action) => String(action.id) === String(selectedActionId));
  const selectedActionRequiresDescription = selectedAction?.name?.toLowerCase() === 'other';

  const updateDraftFilter = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const updateAppliedCategoryFilter = (value) => {
    setAppliedFilters((current) => ({ ...current, denial_category: value }));
    setDraftFilters((current) => ({ ...current, denial_category: value }));
    setCurrentPage(1);
  };

  const updateAppliedActionFilter = (value) => {
    setAppliedFilters((current) => ({ ...current, action: value }));
    setDraftFilters((current) => ({ ...current, action: value }));
    setCurrentPage(1);
  };

  const openFilterPanel = (intent = 'apply') => {
    setDraftFilters(appliedFilters);
    setFilterPanelIntent(intent);
    setSavedFiltersOpen(false);
    setFilterPanelOpen(true);
  };

  const requestFilterApply = () => {
    if (!hasActiveFilters(draftFilters)) return;
    if (filterPanelIntent === 'save') {
      setPendingSaveFilters(draftFilters);
      setFilterPanelOpen(false);
      setSavePromptOpen(true);
      return;
    }
    setConfirmFiltersOpen(true);
  };

  const requestFilterClose = () => {
    if (hasActiveFilters(draftFilters)) {
      setConfirmFiltersOpen(true);
      return;
    }
    setFilterPanelOpen(false);
  };

  const cancelDraftFilters = () => {
    setConfirmFiltersOpen(false);
    setFilterPanelOpen(false);
    setDraftFilters(appliedFilters);
  };

  const applyDraftFilters = () => {
    if (!hasActiveFilters(draftFilters)) {
      setConfirmFiltersOpen(false);
      setFilterPanelOpen(false);
      setCurrentPage(1);
      return;
    }
    setAppliedFilters(draftFilters);
    setConfirmFiltersOpen(false);
    setFilterPanelOpen(false);
    setSavePromptOpen(true);
    setCurrentPage(1);
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    const filtersToSave = pendingSaveFilters || appliedFilters;
    const nextSavedFilters = [
      ...savedFilters.filter((item) => item.name.toLowerCase() !== filterName.trim().toLowerCase()),
      { id: `${Date.now()}-${filterName.trim()}`, name: filterName.trim(), filters: filtersToSave },
    ].sort((first, second) => first.name.localeCompare(second.name));
    setSavedFilters(nextSavedFilters);
    localStorage.setItem(savedFiltersKey(user), JSON.stringify(nextSavedFilters));
    setFilterName('');
    setPendingSaveFilters(null);
    setSavePromptOpen(false);
  };

  const loadSavedFilter = (savedFilter) => {
    setAppliedFilters(savedFilter.filters);
    setDraftFilters(savedFilter.filters);
    setSavedFiltersOpen(false);
    setConfirmDeleteFilterId('');
    setCurrentPage(1);
  };

  const deleteSavedFilter = (event, savedFilterId) => {
    event.stopPropagation();
    if (confirmDeleteFilterId !== savedFilterId) {
      setConfirmDeleteFilterId(savedFilterId);
      return;
    }
    const nextSavedFilters = savedFilters.filter((item) => item.id !== savedFilterId);
    setSavedFilters(nextSavedFilters);
    localStorage.setItem(savedFiltersKey(user), JSON.stringify(nextSavedFilters));
    setConfirmDeleteFilterId('');
  };

  const resetFilters = () => {
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedSearch('');
    setSearchInput('');
    setQuickAssigned('');
    setSelectedOtherUsers([]);
    setCurrentPage(1);
  };

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const changeSort = (column) => {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };

  const startAppeal = async () => {
    const denial = appealMenuDenial;
    if (!denial) return;
    setAppealMenuDenial(null);
    setAppealMenuPosition(null);
    try {
      localStorage.removeItem(appealDraftKey(denial.id));
      const response = await denialService.startAppeal(denial.id);
      setAppealStartDenial(response.data.denial);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openActionAssignment = (denial = appealMenuDenial) => {
    if (!denial) return;
    setAppealMenuDenial(null);
    setAppealMenuPosition(null);
    setActionDenial(denial);
    setSelectedActionId('');
    setActionOtherDescription('');
    setActionNotes('');
    setNewActionName('');
    setAddingNewAction(false);
  };

  const createActionOption = async () => {
    if (!newActionName.trim()) return;
    setCreatingAction(true);
    try {
      const response = await denialService.createAction({ name: newActionName.trim() });
      const nextAction = response.data.action;
      setActions((current) => (
        [...current.filter((item) => item.id !== nextAction.id), nextAction]
          .sort((first, second) => first.name.localeCompare(second.name))
      ));
      setSelectedActionId(String(nextAction.id));
      setNewActionName('');
      setAddingNewAction(false);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setCreatingAction(false);
    }
  };

  const assignAction = async () => {
    if (!actionDenial || !selectedActionId) return;
    setAssigningAction(true);
    try {
      await denialService.assignAction(actionDenial.id, {
        action_id: Number(selectedActionId),
        other_description: actionOtherDescription,
        notes: actionNotes,
      });
      setActionDenial(null);
      setSelectedActionId('');
      setActionOtherDescription('');
      setActionNotes('');
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setAssigningAction(false);
    }
  };

  const removeSelectedActions = async () => {
    if (!selectedActionDenials.length) return;
    setUpdatingActionStatus(true);
    try {
      await Promise.all(selectedActionDenials.map((denial) => denialService.removeAction(denial.id)));
      setRemoveActionOpen(false);
      setSelectedAppealIds([]);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUpdatingActionStatus(false);
    }
  };

  const completeSelectedActions = async () => {
    if (!selectedActionDenials.length) return;
    setUpdatingActionStatus(true);
    try {
      await Promise.all(selectedActionDenials.map((denial) => denialService.completeAction(denial.id)));
      setCompleteActionOpen(false);
      setSelectedAppealIds([]);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUpdatingActionStatus(false);
    }
  };

  const continueAppealStart = () => {
    const denial = appealStartDenial;
    if (!denial) return;
    setAppealStartDenial(null);
    navigate(`/appeals/create/${denial.id}`, { state: { denial } });
  };

  const resumeAppealProcess = () => {
    const denial = resumeAppealDenial;
    if (!denial) return;
    setResumeAppealDenial(null);
    navigate(`/appeals/create/${denial.id}`, { state: { denial } });
  };

  const cancelAppealStart = async () => {
    const denial = appealStartDenial;
    setAppealStartDenial(null);
    if (!denial) return;
    try {
      await denialService.removeAppeal(denial.id);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const toggleAppealSelection = (denialId) => {
    setSelectedAppealIds((current) => (
      current.includes(denialId)
        ? current.filter((item) => item !== denialId)
        : [...current, denialId]
    ));
  };

  const toggleVisibleAppeals = () => {
    setSelectedAppealIds((current) => {
      const filteredIds = sortedDenials.map((denial) => denial.id);
      if (filteredIds.every((id) => current.includes(id))) {
        return current.filter((id) => !filteredIds.includes(id));
      }
      return [...new Set([...current, ...filteredIds])];
    });
  };

  const removeSelectedAppeals = async () => {
    if (!selectedAppealIds.length) return;
    setRemovingAppeals(true);
    try {
      await Promise.all(selectedAppealIds.map((denialId) => denialService.removeAppeal(denialId)));
      selectedAppealIds.forEach((denialId) => localStorage.removeItem(appealDraftKey(denialId)));
      setRemoveAppealOpen(false);
      setSelectedAppealIds([]);
      loadDenials();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRemovingAppeals(false);
    }
  };

  const pageHeader = (
    <div className="denials-page-header">
      <div className="section-heading">
        <span>Appeal Queue</span>
        <h1>{inProcessMode ? 'In Process Denials' : 'Pending Denials'}</h1>
      </div>
      <div className="page-filter-actions">
        <button className="assignment-rules-button" type="button" onClick={openAssignmentRules}>
          <GitBranchPlus size={16} />
          <span>Assignment rules</span>
        </button>
        <div className="page-filter-row">
        <div className="category-action-filter-stack">
          {inProcessMode ? (
            <QuickMultiFilter
              label="Action"
              value={appliedFilters.action || []}
              options={actionFilterOptions}
              allLabel="All actions"
              className="action-filter"
              onChange={updateAppliedActionFilter}
            />
          ) : null}
          <QuickMultiFilter
            label="Denial Categories"
            value={appliedFilters.denial_category || []}
            options={denialCategoryOptions}
            allLabel="All denial categories"
            onChange={updateAppliedCategoryFilter}
          />
        </div>
        <AssignedQuickFilter
          value={quickAssigned}
          options={assignmentOptions}
          otherUsers={otherUserOptions}
          selectedOtherUsers={selectedOtherUsers}
          onChange={(value) => {
            setQuickAssigned(value);
            if (value === 'others' && !selectedOtherUsers.length) {
              setSelectedOtherUsers(otherUserOptions.map((item) => item.name));
            }
            setCurrentPage(1);
          }}
          onOtherUsersChange={(value) => {
            setSelectedOtherUsers(value);
            setCurrentPage(1);
          }}
        />
        <button className={`filter-icon-button${hasActiveFilters(appliedFilters) ? ' active' : ''}`} type="button" onClick={() => openFilterPanel('apply')} aria-label="Open filters">
            <Filter size={16} />
          </button>
        <div className="saved-filter-wrapper" ref={savedFilterRef}>
            <button className="saved-filter-button" type="button" onClick={() => setSavedFiltersOpen((value) => !value)} aria-label="Saved filters">
              <Bookmark size={15} />
              <ChevronDown size={14} />
            </button>
            {savedFiltersOpen ? (
              <div className="saved-filter-menu">
                <button className="save-filter-entry" type="button" onClick={() => openFilterPanel('save')}>Click here to save a filter</button>
                {savedFilters.map((savedFilter) => (
                  <div key={savedFilter.id} className="saved-filter-row">
                    <button type="button" onClick={() => loadSavedFilter(savedFilter)}>
                      {savedFilter.name}
                    </button>
                    <button className={`saved-filter-delete${confirmDeleteFilterId === savedFilter.id ? ' confirming' : ''}`} type="button" onClick={(event) => deleteSavedFilter(event, savedFilter.id)} aria-label={`Delete ${savedFilter.name}`}>
                      {confirmDeleteFilterId === savedFilter.id ? 'Confirm?' : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {filtersActive ? (
          <button className="header-reset-filters" type="button" onClick={resetFilters}>Reset filters</button>
        ) : null}
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className={`denials-page${inProcessMode ? ' in-process-denials-page' : ''}`}>
        {pageHeader}
        <div className="denials-loading-screen" role="status" aria-live="polite">
          <div className="denials-loading-orbit" aria-hidden="true">
            <span className="denials-loading-mark" />
          </div>
          <strong>Fetching {inProcessMode ? 'in process' : 'pending'} denials</strong>
          <p>Loading your organization-scoped denial worklist for this session.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`denials-page${inProcessMode ? ' in-process-denials-page' : ''}`}>
      {pageHeader}
      {message ? <p className="form-message error">{message}</p> : null}
      <div className="denials-workspace-card">
        <div className="denials-grid-toolbar">
          <div className="worklist-meta">
            <div className="active-records-inline">
              <strong>{totalRows.toLocaleString()}</strong>
              <span>active records</span>
            </div>
            <div>
              <strong>Denial worklist</strong>
              <span>
                {totalRows
                  ? `Showing ${startIndex + 1}-${endIndex} of ${totalRows.toLocaleString()}`
                  : 'No records to show'}
              </span>
            </div>
          </div>
          <div className="worklist-filter-strip">
            <div className="worklist-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Search by Patient Name or Claim ID"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') runSearch();
                }}
              />
              <button type="button" onClick={runSearch}>Search</button>
            </div>
          </div>
          <div className="worklist-controls">
            {!inProcessMode && selectedAppealIds.length ? (
              <button className="remove-appeal-button assign-selected-button" type="button" onClick={openSelectedAssignment}>
                Assign ({selectedAppealIds.length})
              </button>
            ) : null}
            {inProcessMode && selectedActionDenials.length ? (
              <button className="remove-appeal-button complete-action-button" type="button" onClick={() => setCompleteActionOpen(true)}>
                Complete Action ({selectedActionDenials.length})
              </button>
            ) : null}
            {inProcessMode && selectedActionDenials.length ? (
              <button className="remove-appeal-button" type="button" onClick={() => setRemoveActionOpen(true)}>
                Remove Action ({selectedActionDenials.length})
              </button>
            ) : null}
            {inProcessMode && selectedAppealDenials.length ? (
              <button className="remove-appeal-button" type="button" onClick={() => setRemoveAppealOpen(true)}>
                Remove appeal ({selectedAppealDenials.length})
              </button>
            ) : null}
            <label className="rows-view-control">
              <span>View</span>
              <select value={rowsPerPage} onChange={changeRowsPerPage}>
                {ROW_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span>rows</span>
            </label>
            {!loading && totalRows ? (
              <nav className="pagination-control" aria-label="Pending denials pagination">
                <PaginationButton
                  disabled={safeCurrentPage === 1}
                  label="Previous page"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  &lt;
                </PaginationButton>
                {pages.map((page) => (
                  typeof page === 'number' ? (
                    <PaginationButton
                      key={page}
                      active={page === safeCurrentPage}
                      label={`Page ${page}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </PaginationButton>
                  ) : (
                    <span key={page} className="page-ellipsis" aria-hidden="true" />
                  )
                ))}
                <PaginationButton
                  disabled={safeCurrentPage === totalPages}
                  label="Next page"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  &gt;
                </PaginationButton>
              </nav>
            ) : null}
          </div>
        </div>

        <div className="denials-table-shell">
          <table className="denials-table">
            <colgroup>
              <col className="col-select" />
              <col className="col-patient" />
              <col className="col-category" />
              {inProcessMode ? <col className="col-action" /> : null}
              {inProcessMode ? <col className="col-agent" /> : null}
              <col className="col-claim" />
              <col className="col-date" />
              <col className="col-money" />
              <col className="col-payer" />
              <col className="col-provider" />
              <col className="col-procedure" />
              <col className="col-code" />
              <col className="col-code" />
              <col className="col-assigned" />
              <col className="col-date" />
              <col className="col-date" />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredAppealsSelected}
                    onChange={toggleVisibleAppeals}
                    aria-label={`Select all filtered ${inProcessMode ? 'in process' : 'pending'} denials`}
                  />
                </th>
                <th><SortHeader label="Patient" column="patient" sort={sort} onSort={changeSort} /></th>
                <th title="Denial Category">DC</th>
                {inProcessMode ? <th>Action</th> : null}
                {inProcessMode ? <th>Agent Name</th> : null}
                <th><SortHeader label="Claim ID" column="claim_id" sort={sort} onSort={changeSort} /></th>
                <th><SortHeader label="Service Date" column="service_date" sort={sort} onSort={changeSort} /></th>
                <th><SortHeader label="Billed Amt" column="billed_amt" sort={sort} onSort={changeSort}>Billed Amt<br />(Payment Amt)</SortHeader></th>
                <th><SortHeader label="Payer" column="payer" sort={sort} onSort={changeSort} /></th>
                <th><SortHeader label="Provider" column="provider" sort={sort} onSort={changeSort}>Provider<br />(Practice)</SortHeader></th>
                <th>Proc. / Mod.</th>
                <th>Reason</th>
                <th>Remark</th>
                <th><SortHeader label="Assigned To" column="assigned_to" sort={sort} onSort={changeSort} /></th>
                <th><SortHeader label="EOB Date" column="eob_date" sort={sort} onSort={changeSort} /></th>
                <th><SortHeader label="Date Added" column="date_added" sort={sort} onSort={changeSort} /></th>
              </tr>
            </thead>
            <tbody>
              {!loading && visibleDenials.map((denial) => (
                <tr key={denial.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedAppealIds.includes(denial.id)}
                      onChange={() => toggleAppealSelection(denial.id)}
                      aria-label={`Select denial for ${denial.patient}`}
                    />
                  </td>
                  <td className="patient-table-cell">
                    <div className="patient-appeal-cell">
                      {inProcessMode && denial.assigned_action ? (
                        <span className="cell-primary" title={denial.patient || '-'}>{denial.patient || '-'}</span>
                      ) : inProcessMode ? (
                        <button
                          className="patient-resume-button"
                          type="button"
                          title={denial.patient || '-'}
                          onClick={() => setResumeAppealDenial(denial)}
                        >
                          {denial.patient || '-'}
                        </button>
                      ) : (
                        <>
                          <button className="appeal-memo-button" type="button" onClick={(event) => toggleAppealMenu(denial, event)} aria-label={`Create appeal for ${denial.patient}`}>
                            📝
                          </button>
                          <span className="cell-primary" title={denial.patient || '-'}>{denial.patient || '-'}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="denial-category-cell"><DenialCategoryBadge denial={denial} /></td>
                  {inProcessMode ? <td className="action-table-cell"><ActionCell denial={denial} /></td> : null}
                  {inProcessMode ? <td><AgentCell denial={denial} /></td> : null}
                  <td><span className="cell-primary">{denial.claim_id || '-'}</span></td>
                  <td><ServiceDateCell value={serviceDateText(denial)} /></td>
                  <td><span className="cell-primary">{money(denial.billed_amt)}</span><span className="cell-muted">{money(denial.payment_amt)}</span></td>
                  <td className="payer-cell">{denial.payer || '-'}</td>
                  <td className="provider-cell"><span className="cell-primary">{denial.provider || '-'}</span><span className="cell-muted">{denial.practice || '-'}</span></td>
                  <td className="code-table-cell">
                    <CodeCell value={denial.procedure} type="procedure" />
                    <span className="cell-muted">{denial.modifier || '-'}</span>
                  </td>
                  <td className="code-table-cell"><CodeCell value={denial.reason} description={denial.reason_desc} type="denial" /></td>
                  <td className="code-table-cell"><CodeCell value={denial.remark} description={denial.remark_desc} type="remark" /></td>
                  <td>
                    <button
                      className={`assignment-link${denial.assigned_to?.username ? ' assigned' : ''}`}
                      type="button"
                      onClick={() => openAssignment(denial)}
                    >
                      {denial.assigned_to?.username || 'Unassigned'}
                    </button>
                  </td>
                  <td>{date(denial.eob_date)}</td>
                  <td>{date(denial.date_added)}</td>
                </tr>
              ))}
              {!loading && !visibleDenials.length ? (
                <tr>
                  <td className="empty-cell" colSpan={inProcessMode ? 16 : 14}>
                    {filtersActive ? 'No denials match the selected filters.' : `No ${inProcessMode ? 'in process' : 'pending'} denials found.`}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

      </div>

      {appealMenuDenial && appealMenuPosition ? (
        <div
          className="appeal-row-menu floating-appeal-row-menu"
          style={{ top: appealMenuPosition.top, left: appealMenuPosition.left }}
        >
          <button type="button" onClick={startAppeal}>Create Appeal &gt;</button>
          <button type="button" onClick={() => openActionAssignment()}>Assign Action &gt;</button>
        </div>
      ) : null}

      {rulesOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal assignment-rules-modal" role="dialog" aria-modal="true" aria-labelledby="rules-title">
            <button className="modal-close-button" type="button" onClick={() => setRulesOpen(false)} aria-label="Close assignment rules">×</button>
            <div className="rules-modal-heading">
              <div>
                <h2 id="rules-title">Assignment rules</h2>
                <p>Rules automatically route matching denials to the selected user.</p>
              </div>
              {user?.role === 'admin' ? <Button type="button" onClick={openAddRule}>Add a rule</Button> : null}
            </div>
            <div className="rules-table-shell">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Created at</th>
                    <th>Effective From</th>
                    <th>Payer</th>
                    <th>Practice</th>
                    <th>Procedure</th>
                    <th>Modifier</th>
                    <th>Reason</th>
                    <th>Remark</th>
                    <th>Active Status</th>
                    {user?.role === 'admin' ? <th>Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rulesLoading ? (
                    <tr><td colSpan={user?.role === 'admin' ? 11 : 10}>Loading assignment rules...</td></tr>
                  ) : null}
                  {!rulesLoading && rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>{rule.assigned_to?.username || '-'}</td>
                      <td>{rule.created_at ? new Date(rule.created_at).toLocaleDateString() : '-'}</td>
                      <td>{rule.effective_from ? new Date(rule.effective_from).toLocaleDateString() : '-'}</td>
                      {["payer", "practice", "procedure", "modifier", "reason", "remark"].map((key) => (
                        <td key={key}>{rule.criteria?.[key]?.length ? rule.criteria[key].join(', ') : 'All'}</td>
                      ))}
                      <td>
                        <span className={`rule-status ${rule.is_active ? 'active' : 'inactive'}`}>
                          <span />{rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {user?.role === 'admin' ? (
                        <td>
                          <div className="rule-action-group">
                            <button className="rule-edit-button" type="button" onClick={() => openEditRule(rule)}>
                              Edit
                            </button>
                            <button className="rule-deactivate-button" type="button" disabled={!rule.is_active} onClick={() => setDeactivateRule(rule)}>
                              Deactivate
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                  {!rulesLoading && !rules.length ? (
                    <tr><td colSpan={user?.role === 'admin' ? 11 : 10}>No assignment rules found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {addRuleOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal assignment-rule-editor-modal" role="dialog" aria-modal="true" aria-labelledby="add-rule-title">
            <button className="modal-close-button" type="button" onClick={() => setAddRuleOpen(false)} aria-label="Close add rule">×</button>
            <h2 id="add-rule-title">{editingRule ? 'Edit assignment rule' : 'Add assignment rule'}</h2>
            <p>{editingRule ? 'Update the rule filters only. The assigned user stays the same.' : 'Leave a field blank to match all values for that field.'}</p>
            <div className="filter-grid rule-filter-grid">
              <DateFilter label="Effective From Date" value={ruleEffectiveFrom} onChange={setRuleEffectiveFrom} onClear={() => setRuleEffectiveFrom(todayValue())} />
              <div className="filter-field rule-effective-note">
                <div className="filter-field-title"><span>Rule Timing</span></div>
                <p>Rules begin routing matching denials from the selected effective date.</p>
              </div>
              <MultiSelectFilter label="Payer" value={ruleCriteria.payer} options={filterOptions.payer} onChange={(value) => updateRuleCriteria('payer', value)} onClear={() => updateRuleCriteria('payer', [])} />
              <MultiSelectFilter label="Practice" value={ruleCriteria.practice} options={filterOptions.practice} onChange={(value) => updateRuleCriteria('practice', value)} onClear={() => updateRuleCriteria('practice', [])} />
              <MultiSelectFilter label="Procedure Code" value={ruleCriteria.procedure} options={filterOptions.procedure} onChange={(value) => updateRuleCriteria('procedure', value)} onClear={() => updateRuleCriteria('procedure', [])} />
              <MultiSelectFilter label="Modifier" value={ruleCriteria.modifier} options={filterOptions.modifier} onChange={(value) => updateRuleCriteria('modifier', value)} onClear={() => updateRuleCriteria('modifier', [])} />
              <MultiSelectFilter label="Reason Code" value={ruleCriteria.reason} options={filterOptions.reason} onChange={(value) => updateRuleCriteria('reason', value)} onClear={() => updateRuleCriteria('reason', [])} />
              <MultiSelectFilter label="Remark Code" value={ruleCriteria.remark} options={filterOptions.remark} onChange={(value) => updateRuleCriteria('remark', value)} onClear={() => updateRuleCriteria('remark', [])} />
            </div>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => { setAddRuleOpen(false); setEditingRule(null); }}>Cancel</Button>
              <Button type="button" onClick={editingRule ? updateRule : () => setConfirmRuleOpen(true)} disabled={updatingRule}>
                {editingRule ? (updatingRule ? 'Updating...' : 'Update') : 'Assign'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmationModal
        open={confirmRuleOpen}
        modalClassName="rule-confirm-modal"
        title="Assign this rule?"
        description="Choose the user who should receive matching current and future pending denials."
        confirmLabel="Confirm"
        loading={creatingRule}
        loadingLabel="Creating..."
        confirmDisabled={!ruleAssigneeId}
        onCancel={() => setConfirmRuleOpen(false)}
        onConfirm={createRule}
      >
        <ul className="filter-summary-list">
          <li>Effective From Date: {date(ruleEffectiveFrom)}</li>
          {ruleSummary.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {ruleConflictWarnings.length ? (
          <div className="rule-warning-panel">
            <strong>Possible rule conflict</strong>
            <p>One or more active rules overlap with this rule. Confirm only if this routing is intentional.</p>
            {ruleConflictWarnings.map((warning) => (
              <span key={warning.id}>{warning.sameUser ? 'Already assigned' : 'Clashing rule'}: {warning.text}</span>
            ))}
          </div>
        ) : null}
        <label className="field save-filter-field">
          <span>Assign to</span>
          <select value={ruleAssigneeId} onChange={(event) => setRuleAssigneeId(event.target.value)} disabled={usersLoading}>
            <option value="">{usersLoading ? 'Loading users...' : 'Select user'}</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>{item.username}</option>
            ))}
          </select>
        </label>
      </ConfirmationModal>

      <ConfirmationModal
        open={Boolean(deactivateRule)}
        modalClassName="rule-confirm-modal"
        title="Deactivate this rule?"
        description="This rule will stop assigning future matching denials."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onCancel={() => setDeactivateRule(null)}
        onConfirm={deactivateSelectedRule}
      >
        {deactivateRule ? (
          <ul className="filter-summary-list">
            <li>User: {deactivateRule.assigned_to?.username || '-'}</li>
            {Object.entries(deactivateRule.criteria || {}).map(([key, value]) => (
              <li key={key}>{RULE_LABELS[key]}: {value?.length ? value.join(', ') : 'All'}</li>
            ))}
          </ul>
        ) : null}
      </ConfirmationModal>

      {filterPanelOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal filter-modal" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <button className="modal-close-button" type="button" onClick={requestFilterClose} aria-label="Close filters">×</button>
            <div className="filter-modal-heading">
              <div>
                <h2 id="filter-title">Filter denials</h2>
                <p>Select one or more filters, then review before applying them to the worklist.</p>
              </div>
              <button className="filter-clear-all" type="button" onClick={() => { setDraftFilters(EMPTY_FILTERS); }}>Clear all</button>
            </div>
            <div className="filter-grid">
              <DateFilter label="Service Date - From" value={draftFilters.service_date_from} onChange={(value) => updateDraftFilter('service_date_from', value)} onClear={() => updateDraftFilter('service_date_from', '')} />
              <DateFilter label="Service Date - To" value={draftFilters.service_date_to} onChange={(value) => updateDraftFilter('service_date_to', value)} onClear={() => updateDraftFilter('service_date_to', '')} />
              <MultiSelectFilter label="Payer" value={draftFilters.payer} options={filterOptions.payer} onChange={(value) => updateDraftFilter('payer', value)} onClear={() => updateDraftFilter('payer', [])} />
              <MultiSelectFilter label="Rendering Provider" value={draftFilters.provider} options={filterOptions.provider} onChange={(value) => updateDraftFilter('provider', value)} onClear={() => updateDraftFilter('provider', [])} />
              <MultiSelectFilter label="Practice" value={draftFilters.practice} options={filterOptions.practice} onChange={(value) => updateDraftFilter('practice', value)} onClear={() => updateDraftFilter('practice', [])} />
              <MultiSelectFilter label="Procedure Code" value={draftFilters.procedure} options={filterOptions.procedure} onChange={(value) => updateDraftFilter('procedure', value)} onClear={() => updateDraftFilter('procedure', [])} />
              <MultiSelectFilter label="Modifier" value={draftFilters.modifier} options={filterOptions.modifier} onChange={(value) => updateDraftFilter('modifier', value)} onClear={() => updateDraftFilter('modifier', [])} />
              <MultiSelectFilter label="Reason Code" value={draftFilters.reason} options={filterOptions.reason} onChange={(value) => updateDraftFilter('reason', value)} onClear={() => updateDraftFilter('reason', [])} />
              <MultiSelectFilter label="Remark Code" value={draftFilters.remark} options={filterOptions.remark} onChange={(value) => updateDraftFilter('remark', value)} onClear={() => updateDraftFilter('remark', [])} />
              <MultiSelectFilter label="Action" value={draftFilters.action || []} options={filterOptions.action || []} onChange={(value) => updateDraftFilter('action', value)} onClear={() => updateDraftFilter('action', [])} />
              <MultiSelectFilter label="Denial Categories" value={draftFilters.denial_category || []} options={filterOptions.denial_category || []} onChange={(value) => updateDraftFilter('denial_category', value)} onClear={() => updateDraftFilter('denial_category', [])} />
              <MultiSelectFilter label="Assigned To" value={draftFilters.assigned_to} options={filterOptions.assigned_to} onChange={(value) => updateDraftFilter('assigned_to', value)} onClear={() => updateDraftFilter('assigned_to', [])} />
              <DateFilter label="EOB Date - From" value={draftFilters.eob_date_from} onChange={(value) => updateDraftFilter('eob_date_from', value)} onClear={() => updateDraftFilter('eob_date_from', '')} />
              <DateFilter label="EOB Date - To" value={draftFilters.eob_date_to} onChange={(value) => updateDraftFilter('eob_date_to', value)} onClear={() => updateDraftFilter('eob_date_to', '')} />
              <DateFilter label="Date Added - From" value={draftFilters.date_added_from} onChange={(value) => updateDraftFilter('date_added_from', value)} onClear={() => updateDraftFilter('date_added_from', '')} />
              <DateFilter label="Date Added - To" value={draftFilters.date_added_to} onChange={(value) => updateDraftFilter('date_added_to', value)} onClear={() => updateDraftFilter('date_added_to', '')} />
            </div>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setFilterPanelOpen(false)}>Cancel</Button>
              <Button type="button" onClick={requestFilterApply} disabled={!hasActiveFilters(draftFilters)}>
                {filterPanelIntent === 'save' ? 'Save filter' : 'Apply filters'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmationModal
        open={Boolean(appealStartDenial)}
        modalClassName="json-notification-modal"
        title="Appeal Creation Process Started"
        description="A new appeal workflow has been initialized for this denial."
        confirmLabel="OK"
        cancelLabel="Cancel"
        onCancel={cancelAppealStart}
        onConfirm={continueAppealStart}
      />

      <ConfirmationModal
        open={Boolean(resumeAppealDenial)}
        modalClassName="json-notification-modal"
        title="Resume appeal process?"
        description="This denial already has an appeal in progress. Continue from the saved appeal stage and complete the remaining steps."
        confirmLabel="Resume appeal"
        cancelLabel="Cancel"
        onCancel={() => setResumeAppealDenial(null)}
        onConfirm={resumeAppealProcess}
      >
        {resumeAppealDenial ? (
          <ul className="filter-summary-list">
            <li>{resumeAppealDenial.patient || 'Patient'} - Claim {resumeAppealDenial.claim_id || '-'}</li>
            <li>Current stage: {resumeAppealDenial.appeal_stage || 1}</li>
          </ul>
        ) : null}
      </ConfirmationModal>

      <ConfirmationModal
        open={removeAppealOpen}
        title="Remove appeal?"
        description="Do you really want to remove the selected appeal workflow and move the denial back to Pending Denials?"
        confirmLabel="Remove appeal"
        cancelLabel="Cancel"
        loading={removingAppeals}
        loadingLabel="Removing..."
        onCancel={() => setRemoveAppealOpen(false)}
        onConfirm={removeSelectedAppeals}
      >
        <ul className="filter-summary-list">
          {selectedAppeals.map((denial) => (
            <li key={denial.id}>
              {denial.patient || 'Patient'} - Claim {denial.claim_id || '-'} - Stage: {denial.appeal_stage || 1} is reviewed.
            </li>
          ))}
        </ul>
      </ConfirmationModal>

      <ConfirmationModal
        open={confirmFiltersOpen}
        title="Apply selected filters?"
        description="These filters will update the denial worklist for your current session."
        confirmLabel="Apply filters"
        cancelLabel="Cancel filter"
        onCancel={cancelDraftFilters}
        onConfirm={applyDraftFilters}
      >
        <ul className="filter-summary-list">
          {draftFilterSummary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </ConfirmationModal>

      <ConfirmationModal
        open={savePromptOpen}
        title="Save this filter?"
        description="Saved filters are available only for your username and can be reused later."
        confirmLabel="Save filter"
        cancelLabel="Not now"
        confirmDisabled={!filterName.trim()}
        onCancel={() => { setSavePromptOpen(false); setFilterName(''); setPendingSaveFilters(null); }}
        onConfirm={saveCurrentFilter}
      >
        <label className="field save-filter-field">
          <span>Filter name</span>
          <input value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Example: My active Aetna denials" />
        </label>
      </ConfirmationModal>

      {actionDenial ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal assignment-modal action-assignment-modal" role="dialog" aria-modal="true" aria-labelledby="action-title">
            <h2 id="action-title">Assign Action</h2>
            <p>Assign an operational action to claim {actionDenial.claim_id || '-'} and move it to In Process.</p>
            <label className="field">
              <span>Action</span>
              <select value={selectedActionId} onChange={(event) => setSelectedActionId(event.target.value)}>
                <option value="">Select action</option>
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>{action.name}</option>
                ))}
              </select>
            </label>
            {selectedActionRequiresDescription ? (
              <label className="field">
                <span>Other description</span>
                <textarea value={actionOtherDescription} onChange={(event) => setActionOtherDescription(event.target.value)} placeholder="Describe the action" />
              </label>
            ) : null}
            <label className="field">
              <span>Optional notes</span>
              <textarea value={actionNotes} onChange={(event) => setActionNotes(event.target.value)} placeholder="Notes visible from the action row" />
            </label>
            {user?.role === 'admin' ? (
              addingNewAction ? (
                <div className="add-action-inline">
                  <label className="field">
                    <span>New action name</span>
                    <input value={newActionName} onChange={(event) => setNewActionName(event.target.value)} placeholder="Example: Faxed records to payer" />
                  </label>
                  <div className="add-action-inline-actions">
                    <button type="button" onClick={() => { setAddingNewAction(false); setNewActionName(''); }}>Cancel</button>
                    <button type="button" onClick={createActionOption} disabled={!newActionName.trim() || creatingAction}>
                      {creatingAction ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              ) : (
                <button className="add-action-link" type="button" onClick={() => setAddingNewAction(true)}>
                  Add new action
                </button>
              )
            ) : null}
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setActionDenial(null)} disabled={assigningAction}>Cancel</Button>
              <Button
                type="button"
                disabled={!selectedActionId || assigningAction || (selectedActionRequiresDescription && !actionOtherDescription.trim())}
                onClick={assignAction}
              >
                {assigningAction ? 'Assigning...' : 'Assign Action'}
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmationModal
        open={completeActionOpen}
        title="Complete action?"
        description="Completed action denials will move to Completed Actions."
        confirmLabel="Complete Action"
        cancelLabel="Cancel"
        loading={updatingActionStatus}
        loadingLabel="Completing..."
        onCancel={() => setCompleteActionOpen(false)}
        onConfirm={completeSelectedActions}
      >
        <ul className="filter-summary-list">
          {selectedActionDenials.map((denial) => (
            <li key={denial.id}>{denial.patient || 'Patient'} - Claim {denial.claim_id || '-'} - {actionLabel(denial)}</li>
          ))}
        </ul>
      </ConfirmationModal>

      <ConfirmationModal
        open={removeActionOpen}
        title="Remove action?"
        description="This will remove the assigned action and move the denial back to Pending Denials."
        confirmLabel="Remove Action"
        cancelLabel="Cancel"
        loading={updatingActionStatus}
        loadingLabel="Removing..."
        onCancel={() => setRemoveActionOpen(false)}
        onConfirm={removeSelectedActions}
      >
        <ul className="filter-summary-list">
          {selectedActionDenials.map((denial) => (
            <li key={denial.id}>{denial.patient || 'Patient'} - Claim {denial.claim_id || '-'} - {actionLabel(denial)}</li>
          ))}
        </ul>
      </ConfirmationModal>

      {selectedDenial ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assign-title">
            <h2 id="assign-title">{selectedDenial.length > 1 ? 'Assign selected denials' : 'Assign denial'}</h2>
            <p>
              {selectedDenial.length > 1
                ? `Assign ${selectedDenial.length} selected claims to a user.`
                : `Assign claim ${selectedDenial[0]?.claim_id || '-'} to a user.`}
            </p>
            <label className="field">
              <span>Assign to</span>
              <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} disabled={usersLoading}>
                <option value="">{usersLoading ? 'Loading users...' : 'Select user'}</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>{item.username}</option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setSelectedDenial(null)} disabled={assigning}>Cancel</Button>
              <Button type="button" disabled={!assigneeId || assigning} onClick={assign}>{assigning ? 'Assigning...' : 'Assign'}</Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
