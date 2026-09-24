import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns2,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  Plus,
  Save,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../../common/components/Button';
import ConfirmationModal from '../../../common/components/ConfirmationModal';
import { useAuth } from '../../../common/context/AuthContext';
import { appealService } from '../../../common/services/appealService';
import { denialService } from '../../../common/services/denialService';
import '../styles/appeals.css';

const STAGES = [
  'Patient and Payer Details',
  'Claim Details',
  'Claim Forms',
  'Documents',
  'Final Review',
];

const blankContact = {
  contact_name: '',
  contact_method: 'mail',
  mail_attn: '',
  mail_address_1: '',
  mail_address_2: '',
  mail_city: '',
  mail_state: '',
  mail_zip: '',
  fax_number: '',
  email_id: '',
};

const draftKey = (denialId) => `appeal_draft_${denialId}`;
const payerContactBookKey = (payerName) => `appeal_payer_contacts_${String(payerName || '').trim().toLowerCase()}`;
const blankTemplate = {
  id: 'blank',
  name: 'Blank Template',
  content: '',
};
const blankDocument = {
  type: 'EOB',
  name: '',
  fileName: '',
};
const isPdfFile = (fileName = '') => String(fileName).toLowerCase().endsWith('.pdf');
const isImageFile = (fileName = '') => /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(fileName || ''));
const money = (value) => (
  value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
    ? '-'
    : `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
);
const date = (value) => {
  if (!value) return '-';
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date(`${text}T00:00:00`).toLocaleDateString();
};
const splitValues = (value) => (
  value
    ? String(value)
      .split(/[,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    : []
);

const addDays = (value, days) => {
  if (!value) return '';
  const next = new Date(`${value}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const toDateInputValue = (value) => {
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

const normalizeContact = (contact = {}) => ({
  ...blankContact,
  ...contact,
  contact_method: contact.contact_method || 'mail',
});

const normalizeContacts = (contacts = []) => contacts
  .filter((item) => item?.contact_name)
  .map((item) => normalizeContact(item));

const mergeContacts = (...contactGroups) => {
  const contactsByName = new Map();

  contactGroups.flat().forEach((item) => {
    const contact = normalizeContact(item);
    if (contact.contact_name) {
      contactsByName.set(contact.contact_name.trim().toLowerCase(), contact);
    }
  });

  return Array.from(contactsByName.values());
};

const getStoredPayerContacts = (payerName) => {
  try {
    return normalizeContacts(JSON.parse(localStorage.getItem(payerContactBookKey(payerName)) || '[]'));
  } catch {
    return [];
  }
};

const saveStoredPayerContacts = (payerName, contacts) => {
  const key = payerContactBookKey(payerName);
  if (!String(payerName || '').trim()) return;
  localStorage.setItem(key, JSON.stringify(normalizeContacts(contacts)));
};

const contactSummary = (contact) => {
  if (!contact?.contact_name) return '';

  if (contact.contact_method === 'fax') {
    return [`Contact: ${contact.contact_name}`, `Fax: ${contact.fax_number}`]
      .filter(Boolean)
      .join('\n');
  }

  if (contact.contact_method === 'email') {
    return [`Contact: ${contact.contact_name}`, `Email: ${contact.email_id}`]
      .filter(Boolean)
      .join('\n');
  }

  const address = [
    contact.mail_attn ? `Attn: ${contact.mail_attn}` : '',
    contact.mail_address_1,
    contact.mail_address_2,
    [contact.mail_city, contact.mail_state, contact.mail_zip].filter(Boolean).join(', '),
  ].filter(Boolean).join('\n');

  return [`Contact: ${contact.contact_name}`, 'Method: Mail', address].filter(Boolean).join('\n');
};

const lineAt = (values, index) => values[index] || (values.length === 1 ? values[0] : '');

const blankClaimLine = {
  serviceDate: '',
  cptCode: '',
  modifier: '',
  quantity: '1',
  billedAmount: '',
  allowedFee: '',
  deductible: '',
  denialCode: '',
  remarkCode: '',
  paymentAmount: '',
  coinsurance: '',
};

const buildClaimLines = (denial) => {
  const serviceDates = splitValues(denial?.service_date_display || denial?.service_date);
  const procedures = splitValues(denial?.procedure);
  const modifiers = splitValues(denial?.modifier);
  const denialCodes = splitValues(denial?.reason);
  const remarkCodes = splitValues(denial?.remark);
  const billedAmounts = splitValues(denial?.billed_amt);
  const paymentAmounts = splitValues(denial?.payment_amt);
  const lineCount = Math.max(
    1,
    serviceDates.length,
    procedures.length,
    modifiers.length,
    denialCodes.length,
    remarkCodes.length,
    billedAmounts.length,
    paymentAmounts.length,
  );

  return Array.from({ length: lineCount }, (_, index) => ({
    serviceDate: toDateInputValue(lineAt(serviceDates, index) || denial?.service_date),
    cptCode: lineAt(procedures, index),
    modifier: lineAt(modifiers, index),
    quantity: '1',
    billedAmount: lineAt(billedAmounts, index) || (index === 0 ? denial?.billed_amt : ''),
    allowedFee: denial?.allowed_fee || '',
    deductible: denial?.deductible || '',
    denialCode: lineAt(denialCodes, index),
    remarkCode: lineAt(remarkCodes, index),
    paymentAmount: lineAt(paymentAmounts, index) || (index === 0 ? denial?.payment_amt : ''),
    coinsurance: denial?.coinsurance || '',
  }));
};

const normalizeClaimLines = (lines) => {
  const normalized = (Array.isArray(lines) && lines.length ? lines : [blankClaimLine]).map((line) => ({
    ...blankClaimLine,
    ...line,
    serviceDate: toDateInputValue(line.serviceDate),
  }));
  return normalized;
};

function sumMoney(lines, key) {
  let hasValue = false;
  const total = lines.reduce((runningTotal, item) => {
    const value = Number(item[key]);
    if (!Number.isFinite(value)) return runningTotal;
    hasValue = true;
    return runningTotal + value;
  }, 0);
  return hasValue ? total : null;
}

const templateToolbar = [
  { key: 'bold', label: 'Bold', icon: Bold, command: 'bold' },
  { key: 'italic', label: 'Italic', icon: Italic, command: 'italic' },
  { key: 'underline', label: 'Underline', icon: Underline, command: 'underline' },
  { key: 'h1', label: 'Heading', icon: Heading1, command: 'formatBlock', value: 'h1' },
  { key: 'h2', label: 'Subheading', icon: Heading2, command: 'formatBlock', value: 'h2' },
  { key: 'list', label: 'List', icon: List, command: 'insertUnorderedList' },
  { key: 'left', label: 'Align left', icon: AlignLeft, command: 'justifyLeft' },
  { key: 'center', label: 'Align center', icon: AlignCenter, command: 'justifyCenter' },
  { key: 'right', label: 'Align right', icon: AlignRight, command: 'justifyRight' },
];

const fontFamilies = [
  'Arial',
  'Calibri',
  'Cambria',
  'Candara',
  'Century Gothic',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Tahoma',
  'Trebuchet MS',
  'Helvetica',
  'Garamond',
  'Palatino Linotype',
  'Book Antiqua',
  'Lucida Sans',
  'Lucida Console',
  'Segoe UI',
  'Franklin Gothic Medium',
  'Impact',
  'Monaco',
  'Consolas',
];

const fontSizes = Array.from({ length: 12 }, (_, index) => String(10 + (index * 2)));

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const textToTemplateHtml = (content) => String(content || '')
  .split('\n')
  .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
  .join('');

const normalizeTemplateHtml = (content) => {
  const value = String(content || '');
  return /<\/?[a-z][\s\S]*>/i.test(value) ? value : textToTemplateHtml(value);
};

const stripMergeTokenSpans = (content) => {
  const template = document.createElement('template');
  template.innerHTML = normalizeTemplateHtml(content);
  template.content.querySelectorAll('.merge-token').forEach((node) => {
    node.replaceWith(document.createTextNode(node.textContent || ''));
  });
  return template.innerHTML;
};

const renderTemplateHtml = (content, mergeValues, { fillTokens = false } = {}) => {
  const html = stripMergeTokenSpans(content);
  const fieldPattern = Object.keys(mergeValues)
    .sort((first, second) => second.length - first.length)
    .join('|');
  const mergeFieldRegex = new RegExp(`\\b(${fieldPattern})\\b`, 'gi');

  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    if (!mergeFieldRegex.test(node.nodeValue)) {
      mergeFieldRegex.lastIndex = 0;
      return;
    }
    mergeFieldRegex.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    node.nodeValue.replace(mergeFieldRegex, (token, _field, offset) => {
      if (offset > cursor) fragment.append(document.createTextNode(node.nodeValue.slice(cursor, offset)));
      const field = token.toUpperCase();
      const value = Object.prototype.hasOwnProperty.call(mergeValues, field) ? mergeValues[field] : '';
      if (fillTokens) {
        fragment.append(document.createTextNode(value || token));
      } else {
        const span = document.createElement('span');
        span.className = `merge-token${field === 'CLINICNAME' ? ' clinic-token' : ''}`;
        span.textContent = token;
        fragment.append(span);
      }
      cursor = offset + token.length;
      return token;
    });
    if (cursor < node.nodeValue.length) fragment.append(document.createTextNode(node.nodeValue.slice(cursor)));
    node.parentNode.replaceChild(fragment, node);
  });

  return template.innerHTML;
};

export default function AppealCreatePage() {
  const { denialId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const denial = state?.denial;
  const savedDraft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey(denialId)) || 'null');
    } catch {
      return null;
    }
  }, [denialId]);

  const [stage, setStage] = useState(savedDraft?.stage || 0);
  const [maxReachedStage, setMaxReachedStage] = useState(
    Math.max(savedDraft?.maxReachedStage ?? savedDraft?.stage ?? 0, savedDraft?.stage || 0),
  );
  const [showContactModal, setShowContactModal] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [message, setMessage] = useState('');
  const [letterTemplates, setLetterTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(savedDraft?.selectedTemplateId || 'blank');
  const [templateName, setTemplateName] = useState(savedDraft?.templateName || '');
  const [templateContent, setTemplateContent] = useState(savedDraft?.templateContent || '');
  const [templateStarted, setTemplateStarted] = useState(Boolean(savedDraft?.templateStarted));
  const [blockMenu, setBlockMenu] = useState(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [showDeleteTemplatePrompt, setShowDeleteTemplatePrompt] = useState(false);
  const [showAddLetterPrompt, setShowAddLetterPrompt] = useState(false);
  const [generatedLetters, setGeneratedLetters] = useState(savedDraft?.generatedLetters || []);
  const [documents, setDocuments] = useState(savedDraft?.documents?.length ? savedDraft.documents : [{ ...blankDocument }]);
  const [reviewPageIndex, setReviewPageIndex] = useState(0);
  const [packingAppeal, setPackingAppeal] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [workspaceView, setWorkspaceView] = useState('both');
  const [editorSplit, setEditorSplit] = useState(52);
  const [isResizingWorkspace, setIsResizingWorkspace] = useState(false);
  const [activeEditorFormat, setActiveEditorFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    align: 'left',
    block: '',
    fontFamily: '',
    fontSize: '',
  });
  const contactDropdownRef = useRef(null);
  const templateEditorRef = useRef(null);
  const templateWorkspaceRef = useRef(null);
  const [form, setForm] = useState(() => {
    const initialForm = savedDraft?.form || {
    patient_account_number: denial?.claim_id || '',
    patient_first_name: denial?.patient?.split(' ')?.[0] || '',
    patient_last_name: denial?.patient?.split(' ')?.slice(1).join(' ') || '',
    patient_dob: '',
    practice: denial?.practice || '',
    rendering_provider: denial?.provider || '',
    tin: '',
    npi: '',
    payer_name: denial?.payer || '',
    payer_contact: blankContact,
    payer_contacts: [],
    };
    const claimDate = initialForm.claim_date || denial?.date_added || denial?.service_date;
    const appealDeadline = initialForm.appeal_deadline || denial?.appeal_deadline || addDays(denial?.eob_date || denial?.date_added, 60);

    const contacts = mergeContacts(
      getStoredPayerContacts(initialForm.payer_name),
      normalizeContacts(initialForm.payer_contacts),
    );
    const selectedContact = normalizeContact(initialForm.payer_contact);
    const mergedContacts = selectedContact.contact_name ? mergeContacts(contacts, [selectedContact]) : contacts;

    return {
      ...initialForm,
      claim_date: toDateInputValue(claimDate),
      appeal_deadline: toDateInputValue(appealDeadline),
      claim_lines: normalizeClaimLines(initialForm.claim_lines || buildClaimLines(denial)),
      payer_contact: selectedContact,
      payer_contacts: mergedContacts,
    };
  });
  const [contact, setContact] = useState(normalizeContact(savedDraft?.form?.payer_contact));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateContact = (key, value) => setContact((current) => ({ ...current, [key]: value }));
  const updateClaimLine = (index, key, value) => {
    setForm((current) => ({
      ...current,
      claim_lines: current.claim_lines.map((line, lineIndex) => (
        lineIndex === index ? { ...line, [key]: value } : line
      )),
    }));
  };
  const goToStage = (nextStage) => {
    if (nextStage > maxReachedStage) return;
    setStage(nextStage);
  };
  const advanceToStage = (nextStage) => {
    setMaxReachedStage((current) => Math.max(current, nextStage));
    setStage(nextStage);
  };
  const addClaimLine = () => {
    setForm((current) => ({
      ...current,
      claim_lines: [
        ...current.claim_lines,
        {
          ...blankClaimLine,
          serviceDate: current.claim_lines.at(-1)?.serviceDate || current.claim_date,
        },
      ],
    }));
  };
  const removeClaimLine = (index) => {
    setForm((current) => ({
      ...current,
      claim_lines: current.claim_lines.length > 1
        ? current.claim_lines.filter((_, lineIndex) => lineIndex !== index)
        : current.claim_lines,
    }));
  };
  const contactComplete = Boolean(String(contact.contact_name || '').trim()) && (
    contact.contact_method === 'mail'
      ? Boolean(
        String(contact.mail_attn || '').trim()
        && String(contact.mail_address_1 || '').trim()
        && String(contact.mail_city || '').trim()
        && String(contact.mail_state || '').trim()
        && String(contact.mail_zip || '').trim(),
      )
      : contact.contact_method === 'email'
        ? Boolean(String(contact.email_id || '').trim())
        : Boolean(String(contact.fax_number || '').trim())
  );

  const saveDraft = () => {
    localStorage.setItem(draftKey(denialId), JSON.stringify({
      stage,
      maxReachedStage,
      form,
      selectedTemplateId,
      templateName,
      templateContent,
      templateStarted,
      generatedLetters,
      documents,
    }));
    navigate('/denials/in-process');
  };

  const discardDraft = async () => {
    localStorage.removeItem(draftKey(denialId));
    try {
      await denialService.removeAppeal(denialId);
    } catch {
      // Navigation should still return the user to the worklist if the server already moved it.
    }
    navigate('/denials/pending');
  };

  const addContact = () => {
    const nextContact = normalizeContact(contact);
    setForm((current) => {
      const nextContacts = mergeContacts(current.payer_contacts, [nextContact]);
      saveStoredPayerContacts(current.payer_name, nextContacts);

      return {
        ...current,
        payer_contact: nextContact,
        payer_contacts: nextContacts,
      };
    });
    setShowContactModal(false);
  };

  const claimLines = form.claim_lines;
  const totalBilled = sumMoney(claimLines, 'billedAmount');
  const totalPayment = sumMoney(claimLines, 'paymentAmount');
  const totalDeductible = sumMoney(claimLines, 'deductible');
  const totalCoinsurance = sumMoney(claimLines, 'coinsurance');
  const allTemplates = useMemo(() => [blankTemplate, ...letterTemplates], [letterTemplates]);
  const selectedTemplate = allTemplates.find((item) => String(item.id) === String(selectedTemplateId)) || blankTemplate;
  const isAdmin = user?.role === 'admin';
  const fullPatientName = [form.patient_first_name, form.patient_last_name].filter(Boolean).join(' ') || denial?.patient || '';
  const providerNameParts = String(form.rendering_provider || denial?.provider || '').split(' ').filter(Boolean);
  const mergeValues = {
    USERNAME: user?.username || user?.email || '',
    PATIENTNAME: fullPatientName,
    PATIENTFIRSTNAME: form.patient_first_name,
    PATIENTLASTNAME: form.patient_last_name,
    PATIENTDOB: date(form.patient_dob),
    PATIENTMEMBERID: form.patient_account_number,
    PAYERNAME: form.payer_name,
    PAYERADDRESS1: form.payer_contact?.mail_address_1 || '',
    PAYERCITY: form.payer_contact?.mail_city || '',
    PAYERSTATE: form.payer_contact?.mail_state || '',
    PAYERZIP: form.payer_contact?.mail_zip || '',
    CLAIMID: denial?.claim_id || form.patient_account_number,
    SUBMITTERCLAIMID: form.patient_account_number,
    TOTALBILLED: money(totalBilled ?? denial?.billed_amt),
    TOTALPAYMENT: money(totalPayment ?? denial?.payment_amt),
    DOSRANGEMMDDYYYY: claimLines.map((line) => date(line.serviceDate)).filter((item) => item !== '-').join(' - '),
    SERVICEDATE: claimLines[0]?.serviceDate ? date(claimLines[0].serviceDate) : date(denial?.service_date_display || denial?.service_date),
    PROVIDERFIRSTNAME: providerNameParts[0] || '',
    PROVIDERLASTNAME: providerNameParts.slice(1).join(' '),
    PROVIDERNPINUMBER: form.npi,
    BILLINGPROVIDERTAXID: form.tin,
    CLINICNAME: form.practice,
    CLINICADDRESS1: '',
    CLINICCITY: '',
    CLINICSTATE: '',
    CLINICZIP: '',
    CLIENTPHONE: '',
  };
  const pdfPreviewHtml = useMemo(
    () => renderTemplateHtml(templateContent, mergeValues, { fillTokens: true }),
    [templateContent, mergeValues],
  );
  const currentLetterName = templateName || selectedTemplate.name || `Letter ${generatedLetters.length + 1}`;
  const reviewPages = useMemo(() => [
    ...generatedLetters.map((letter, index) => ({
      id: letter.id,
      type: 'letter',
      title: `Claim Form ${index + 1}: ${letter.name}`,
      html: letter.pdfHtml,
    })),
    ...documents
      .filter((documentItem) => documentItem.fileName)
      .map((documentItem, index) => ({
        id: `document_${index}`,
        type: 'document',
        title: `Document ${index + 1}: ${documentItem.type === 'Others' ? documentItem.name || 'Other Document' : documentItem.type}`,
        fileName: documentItem.fileName,
        filePath: documentItem.filePath,
        previewUrl: documentItem.previewUrl,
      })),
  ], [generatedLetters, documents]);
  const activeReviewPage = reviewPages[reviewPageIndex] || reviewPages[0];

  const startTemplate = () => {
    setIsTemplateLoading(true);
    let nextName = '';
    let nextContent = '';
    if (selectedTemplateId === 'create-new') {
      nextName = '';
      nextContent = '';
    } else {
      nextName = selectedTemplate.id === 'blank' ? '' : selectedTemplate.name;
      nextContent = selectedTemplate.content || '';
    }
    window.setTimeout(() => {
      setTemplateName(nextName);
      setTemplateContent(nextContent);
      setTemplateStarted(true);
      setIsTemplateLoading(false);
      requestAnimationFrame(() => {
        if (templateEditorRef.current) {
          templateEditorRef.current.innerHTML = renderTemplateHtml(nextContent, mergeValues);
          templateEditorRef.current.focus();
          setEditorCaretOffset(templateEditorRef.current.innerText.length);
        }
      });
    }, 120);
  };

  const getEditorCaretOffset = () => {
    const editor = templateEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return 0;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  };

  const setEditorCaretOffset = (offset) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    const range = document.createRange();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    let node = walker.nextNode();

    while (node) {
      if (remaining <= node.nodeValue.length) {
        range.setStart(node, remaining);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= node.nodeValue.length;
      node = walker.nextNode();
    }

    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const placeCaretInNode = (node, atEnd = false) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(!atEnd);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const refreshTemplateEditor = () => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    const caretOffset = getEditorCaretOffset();
    const cleanHtml = stripMergeTokenSpans(editor.innerHTML);
    const highlightedHtml = renderTemplateHtml(cleanHtml, mergeValues);
    setTemplateContent(cleanHtml);
    if (editor.innerHTML !== highlightedHtml) {
      editor.innerHTML = highlightedHtml;
      setEditorCaretOffset(caretOffset);
    }
  };

  const normalizeFontFamily = (value) => String(value || '')
    .split(',')[0]
    .replace(/["']/g, '')
    .trim();

  const getSelectionElement = () => {
    const editor = templateEditorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return null;
    const node = selection.getRangeAt(0).startContainer;
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return editor.contains(element) ? element : null;
  };

  const updateEditorFormatState = () => {
    const element = getSelectionElement();
    if (!element) return;
    const blockElement = element.closest('h1,h2,p,li,div') || element;
    const computed = window.getComputedStyle(element);
    const blockComputed = window.getComputedStyle(blockElement);
    const fontFamily = normalizeFontFamily(computed.fontFamily);
    const fontSize = Math.round(Number.parseFloat(computed.fontSize || ''));
    const textAlign = blockComputed.textAlign || 'left';

    setActiveEditorFormat({
      bold: document.queryCommandState('bold') || Number.parseInt(computed.fontWeight, 10) >= 600,
      italic: document.queryCommandState('italic') || computed.fontStyle === 'italic',
      underline: document.queryCommandState('underline') || computed.textDecorationLine.includes('underline'),
      list: Boolean(element.closest('ul,ol')),
      align: textAlign === 'center' || textAlign === 'right' ? textAlign : 'left',
      block: blockElement.tagName?.toLowerCase() || '',
      fontFamily: fontFamilies.find((family) => family.toLowerCase() === fontFamily.toLowerCase()) || fontFamily,
      fontSize: fontSizes.includes(String(fontSize)) ? String(fontSize) : '',
    });
  };

  const applyTemplateTool = (tool) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(tool.command, false, tool.value || null);
    refreshTemplateEditor();
    updateEditorFormatState();
  };

  const applyFontFamily = (family) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('fontName', false, family);
    refreshTemplateEditor();
    updateEditorFormatState();
  };

  const applyFontSize = (size) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('fontSize', false, '7');
    editor.querySelectorAll('font[size="7"]').forEach((node) => {
      node.removeAttribute('size');
      node.style.fontSize = `${size}px`;
    });
    refreshTemplateEditor();
    updateEditorFormatState();
  };

  const insertMergeField = (field) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('insertText', false, field);
    refreshTemplateEditor();
  };

  const insertTemplateBlock = (type) => {
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    if (type === 'subblock') {
      const selectionElement = getSelectionElement();
      const currentSubBlock = selectionElement?.closest?.('.template-subblock');
      const currentBlock = selectionElement?.closest?.('.template-block');
      const nextSubBlock = document.createElement('div');
      nextSubBlock.className = 'template-subblock';
      nextSubBlock.innerHTML = '<p><br></p>';

      if (currentSubBlock && currentSubBlock.parentElement?.classList.contains('template-block')) {
        currentSubBlock.insertAdjacentElement('afterend', nextSubBlock);
      } else if (currentBlock) {
        currentBlock.appendChild(nextSubBlock);
      } else {
        document.execCommand('insertHTML', false, '<div class="template-subblock"><p><br></p></div>');
        refreshTemplateEditor();
        return;
      }

      refreshTemplateEditor();
      requestAnimationFrame(() => {
        const range = document.createRange();
        range.selectNodeContents(nextSubBlock);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      return;
    }

    document.execCommand('insertHTML', false, '<div class="template-block"><div class="template-subblock"><p><br></p></div></div><p><br></p>');
    refreshTemplateEditor();
  };

  const handleEditorContextMenu = (event) => {
    const block = event.target.closest?.('.template-block');
    if (!block || !templateEditorRef.current?.contains(block)) return;
    event.preventDefault();
    setBlockMenu({
      x: event.clientX,
      y: event.clientY,
      block,
    });
  };

  const addInnerBoxFromMenu = () => {
    if (!blockMenu?.block) return;
    const nextSubBlock = document.createElement('div');
    nextSubBlock.className = 'template-subblock';
    nextSubBlock.innerHTML = '<p><br></p>';
    blockMenu.block.appendChild(nextSubBlock);
    setBlockMenu(null);
    refreshTemplateEditor();
    requestAnimationFrame(() => placeCaretInNode(nextSubBlock));
  };

  const handleEditorFrameClick = (event) => {
    if (event.target !== event.currentTarget) return;
    const editor = templateEditorRef.current;
    if (!editor) return;
    editor.focus();
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<br>';
    editor.appendChild(paragraph);
    placeCaretInNode(paragraph);
    refreshTemplateEditor();
  };

  const saveTemplate = async () => {
    if (!isAdmin) return;
    const name = String(templateName || '').trim() || 'Untitled Template';
    const id = selectedTemplateId && !['blank', 'create-new'].includes(selectedTemplateId)
      ? selectedTemplateId
      : null;
    try {
      const response = await appealService.saveTemplate({ id, name, content: templateContent });
      const nextTemplate = response.data.template;
      setLetterTemplates((current) => [
        nextTemplate,
        ...current.filter((item) => String(item.id) !== String(nextTemplate.id)),
      ]);
      setSelectedTemplateId(nextTemplate.id);
      setTemplateName(nextTemplate.name);
    } catch (error) {
      setMessage(error.message || 'Unable to save template.');
    }
  };

  const deleteSelectedTemplate = async () => {
    if (!isAdmin || ['blank', 'create-new'].includes(selectedTemplateId)) return;
    try {
      await appealService.deleteTemplate(selectedTemplateId);
      const nextTemplates = letterTemplates.filter((item) => String(item.id) !== String(selectedTemplateId));
      setLetterTemplates(nextTemplates);
      setSelectedTemplateId('blank');
      setTemplateName('');
      setTemplateContent('');
      setTemplateStarted(false);
      setShowDeleteTemplatePrompt(false);
    } catch (error) {
      setMessage(error.message || 'Unable to delete template.');
    }
  };

  const saveCurrentLetter = () => {
    const cleanContent = templateEditorRef.current
      ? stripMergeTokenSpans(templateEditorRef.current.innerHTML)
      : templateContent;
    const previewHtml = renderTemplateHtml(cleanContent, mergeValues, { fillTokens: true });
    if (!String(cleanContent || '').replace(/<[^>]*>/g, '').trim()) return;
    const nextLetter = {
      id: `letter_${Date.now()}`,
      name: currentLetterName,
      templateId: selectedTemplateId,
      templateName: currentLetterName,
      content: cleanContent,
      pdfHtml: previewHtml,
    };
    setGeneratedLetters((current) => [...current, nextLetter]);
    setTemplateContent(cleanContent);
  };

  const continueFromLetters = () => {
    saveCurrentLetter();
    setShowAddLetterPrompt(true);
  };

  const addAnotherLetter = () => {
    setShowAddLetterPrompt(false);
    setSelectedTemplateId('blank');
    setTemplateName('');
    setTemplateContent('');
    setTemplateStarted(false);
    if (templateEditorRef.current) templateEditorRef.current.innerHTML = '';
  };

  const finishLetters = () => {
    setShowAddLetterPrompt(false);
    setWorkspaceExpanded(false);
    advanceToStage(3);
  };

  const updateDocument = (index, key, value) => {
    setDocuments((current) => current.map((documentItem, documentIndex) => (
      documentIndex === index
        ? {
          ...documentItem,
          [key]: value,
          ...(key === 'type' && value !== 'Others' ? { name: '' } : {}),
        }
        : documentItem
    )));
  };

  const updateDocumentFile = async (index, file) => {
    if (!file) {
      updateDocument(index, 'fileName', '');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    updateDocument(index, 'fileName', file.name);
    try {
      const response = await appealService.uploadDocument(file);
      setDocuments((current) => current.map((documentItem, documentIndex) => (
        documentIndex === index
          ? { ...documentItem, ...response.data.document, previewUrl }
          : documentItem
      )));
    } catch (error) {
      setMessage(error.message || 'Unable to upload document.');
    }
  };

  const addDocument = () => {
    setDocuments((current) => [...current, { ...blankDocument }]);
  };

  const removeDocument = (index) => {
    setDocuments((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current));
  };

  const createAppealPackage = async () => {
    setPackingAppeal(true);
    const packageRecord = {
      id: `appeal_package_${denialId}_${Date.now()}`,
      denialId,
      createdAt: new Date().toISOString(),
      denial,
      form,
      letters: generatedLetters,
      documents: documents.filter((documentItem) => documentItem.fileName),
    };

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
      await appealService.savePackage(denialId, packageRecord);
      localStorage.removeItem(draftKey(denialId));
      navigate('/denials/completed');
    } catch (error) {
      setPackingAppeal(false);
      setMessage(error.message || 'Unable to complete this appeal.');
    }
  };

  useEffect(() => {
    if (!templateStarted || !templateEditorRef.current) return;
    templateEditorRef.current.innerHTML = renderTemplateHtml(templateContent, mergeValues);
  }, [templateStarted]);

  useEffect(() => {
    appealService
      .listTemplates()
      .then((response) => setLetterTemplates(response.data.templates || []))
      .catch((error) => setMessage(error.message || 'Unable to load templates.'));
  }, []);

  useEffect(() => {
    const closeBlockMenu = () => setBlockMenu(null);
    document.addEventListener('click', closeBlockMenu);
    return () => document.removeEventListener('click', closeBlockMenu);
  }, []);

  useEffect(() => {
    const updateSelectionFormat = () => updateEditorFormatState();
    document.addEventListener('selectionchange', updateSelectionFormat);
    return () => document.removeEventListener('selectionchange', updateSelectionFormat);
  }, [templateStarted, templateContent]);

  useEffect(() => {
    if (!isResizingWorkspace) return undefined;

    const resizeWorkspace = (event) => {
      const bounds = templateWorkspaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const nextSplit = ((event.clientX - bounds.left) / bounds.width) * 100;
      setEditorSplit(Math.min(72, Math.max(28, nextSplit)));
    };
    const stopResize = () => setIsResizingWorkspace(false);

    document.addEventListener('pointermove', resizeWorkspace);
    document.addEventListener('pointerup', stopResize);
    return () => {
      document.removeEventListener('pointermove', resizeWorkspace);
      document.removeEventListener('pointerup', stopResize);
    };
  }, [isResizingWorkspace]);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (!contactDropdownRef.current?.contains(event.target)) {
        setShowContactDropdown(false);
      }
    };

    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  useEffect(() => {
    denialService.updateAppealStage(denialId, stage + 1).catch(() => {});
  }, [denialId, stage]);

  useEffect(() => {
    setForm((current) => {
      const storedContacts = getStoredPayerContacts(current.payer_name);
      const payerContacts = mergeContacts(storedContacts, current.payer_contacts);
      const selectedExists = payerContacts.some(
        (item) => item.contact_name.toLowerCase() === current.payer_contact?.contact_name?.toLowerCase(),
      );

      return {
        ...current,
        payer_contact: selectedExists ? current.payer_contact : blankContact,
        payer_contacts: payerContacts,
      };
    });
  }, [form.payer_name]);

  return (
    <section className="appeal-page">
      <div className="appeal-sticky-shell">
        <div className="appeal-stage-track" aria-label="Appeal stages">
          {STAGES.map((item, index) => (
            <button
              key={item}
              className={`appeal-stage${stage === index ? ' active' : ''}${maxReachedStage >= index && stage !== index ? ' complete' : ''}`}
              type="button"
              onClick={() => goToStage(index)}
              disabled={index > maxReachedStage}
            >
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </button>
          ))}
        </div>

        <div className="appeal-header">
          <div>
            <span>Appeal Creation</span>
            <h1>{STAGES[stage]}</h1>
          </div>
          <Button variant="secondary" type="button" onClick={() => setShowExitPrompt(true)}>Exit</Button>
        </div>
      </div>
      {message ? <p className="form-message error">{message}</p> : null}

      {stage === 0 ? (
        <div className="appeal-form-shell">
          <section className="appeal-form-section">
            <h2>Patient Information</h2>
            <div className="appeal-field-grid">
              <label><span>Patient Account Number *</span><input value={form.patient_account_number} onChange={(event) => update('patient_account_number', event.target.value)} /></label>
              <label><span>Patient First Name *</span><input value={form.patient_first_name} onChange={(event) => update('patient_first_name', event.target.value)} /></label>
              <label><span>Patient Last Name *</span><input value={form.patient_last_name} onChange={(event) => update('patient_last_name', event.target.value)} /></label>
              <label><span>Patient DOB *</span><input type="date" value={form.patient_dob} onChange={(event) => update('patient_dob', event.target.value)} /></label>
            </div>
          </section>

          <section className="appeal-form-section">
            <h2>Practice Information</h2>
            <div className="appeal-field-grid">
              <label><span>Practice *</span><input value={form.practice} onChange={(event) => update('practice', event.target.value)} /></label>
              <label><span>Rendering Provider *</span><input value={form.rendering_provider} onChange={(event) => update('rendering_provider', event.target.value)} /></label>
              <label><span>TIN *</span><input value={form.tin} onChange={(event) => update('tin', event.target.value)} /></label>
              <label><span>NPI *</span><input value={form.npi} onChange={(event) => update('npi', event.target.value)} /></label>
            </div>
          </section>

          <section className="appeal-form-section">
            <h2>Payer Information</h2>
            <div className="appeal-field-grid">
              <label><span>Payer Name *</span><input value={form.payer_name} onChange={(event) => update('payer_name', event.target.value)} /></label>
              <div className="payer-contact-select" ref={contactDropdownRef}>
                <span>Payer Contact Name *</span>
                <button type="button" onClick={() => setShowContactDropdown((current) => !current)}>
                  {form.payer_contact?.contact_name || 'Select payer contact'}
                </button>
                {showContactDropdown ? (
                  <div className="payer-contact-options">
                    {form.payer_contacts.length ? form.payer_contacts.map((item) => (
                      <button
                        key={item.contact_name}
                        type="button"
                        title={contactSummary(item)}
                        onClick={() => {
                          update('payer_contact', normalizeContact(item));
                          setShowContactDropdown(false);
                        }}
                      >
                        {item.contact_name}
                      </button>
                    )) : (
                      <div className="payer-contact-empty">No contacts added</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            <button className="payer-contact-link" type="button" onClick={() => { setContact(normalizeContact(blankContact)); setShowContactModal(true); }}>
              <span>Add payer contact</span>
            </button>
          </section>

          <div className="appeal-actions">
            <Button type="button" onClick={() => advanceToStage(1)}>Continue</Button>
          </div>
        </div>
      ) : stage === 1 ? (
        <div className="appeal-form-shell">
          <section className="appeal-form-section claim-information-section">
            <div className="claim-section-heading">
              <div>
                <h2>Claim Information</h2>
                <p>Review claim timing and line-level denial details before moving to forms.</p>
              </div>
            </div>

            <div className="claim-date-grid">
              <div className="claim-detail-tile">
                <span>Claim Date</span>
                <strong>{date(form.claim_date)}</strong>
              </div>
              <div className="claim-detail-tile">
                <span>Appeal Deadline</span>
                <strong>{date(form.appeal_deadline)}</strong>
              </div>
            </div>

            <div className="claim-lines-block">
              <div className="claim-lines-heading">
                <h3>Line Level Details</h3>
                <button type="button" onClick={addClaimLine}>
                  <Plus size={15} />
                  Add CPT
                </button>
              </div>
              <div className="claim-lines-table-shell">
                <table className="claim-lines-table">
                  <thead>
                    <tr>
                      <th>Service Date</th>
                      <th>CPT Code</th>
                      <th>Modifier</th>
                      <th>Quantity</th>
                      <th>Billed Amount</th>
                      <th>Allowed Fee</th>
                      <th>Deductible</th>
                      <th>Denial Code</th>
                      <th>Remark Code</th>
                      <th>Payment Amount</th>
                      <th>Coinsurance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claimLines.map((line, index) => (
                      <tr key={`${line.cptCode || 'line'}-${index}`}>
                        <td><input type="date" value={line.serviceDate} onChange={(event) => updateClaimLine(index, 'serviceDate', event.target.value)} /></td>
                        <td><input value={line.cptCode} onChange={(event) => updateClaimLine(index, 'cptCode', event.target.value)} /></td>
                        <td><input value={line.modifier} onChange={(event) => updateClaimLine(index, 'modifier', event.target.value)} /></td>
                        <td><input type="number" min="0" value={line.quantity} onChange={(event) => updateClaimLine(index, 'quantity', event.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.billedAmount} onChange={(event) => updateClaimLine(index, 'billedAmount', event.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.allowedFee} onChange={(event) => updateClaimLine(index, 'allowedFee', event.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.deductible} onChange={(event) => updateClaimLine(index, 'deductible', event.target.value)} /></td>
                        <td><input value={line.denialCode} onChange={(event) => updateClaimLine(index, 'denialCode', event.target.value)} /></td>
                        <td><input value={line.remarkCode} onChange={(event) => updateClaimLine(index, 'remarkCode', event.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.paymentAmount} onChange={(event) => updateClaimLine(index, 'paymentAmount', event.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={line.coinsurance} onChange={(event) => updateClaimLine(index, 'coinsurance', event.target.value)} /></td>
                        <td>
                          <button
                            className="claim-line-remove-button"
                            type="button"
                            onClick={() => removeClaimLine(index)}
                            disabled={claimLines.length === 1}
                            aria-label={`Remove CPT line ${index + 1}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="claim-totals-grid">
              <div><span>Total Billed Amount</span><strong>{money(totalBilled)}</strong></div>
              <div><span>Total Amount</span><strong>{money(totalPayment)}</strong></div>
              <div><span>Deductible</span><strong>{money(totalDeductible)}</strong></div>
              <div><span>Coinsurance</span><strong>{money(totalCoinsurance)}</strong></div>
            </div>
          </section>

          <div className="appeal-actions">
            <Button type="button" onClick={() => advanceToStage(2)}>Next</Button>
          </div>
        </div>
      ) : stage === 2 ? (
        <div className="appeal-form-shell claim-forms-shell">
          <section className="appeal-form-section template-picker-section">
            <div className="claim-section-heading">
              <div>
                <h2>Claim Forms</h2>
                <p>Select a letter template, then compose and preview the PDF output.</p>
              </div>
            </div>
            <div className="template-picker-grid">
              <label>
                <span>Select Letter Template</span>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}>
                  {allTemplates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                  {isAdmin ? <option value="create-new">Create New Template</option> : null}
                </select>
              </label>
              <Button type="button" onClick={startTemplate}>Start Creating Template</Button>
              {isAdmin && !['blank', 'create-new'].includes(selectedTemplateId) ? (
                <button className="template-delete-button" type="button" onClick={() => setShowDeleteTemplatePrompt(true)} title="Delete template">
                  <Trash2 size={17} />
                </button>
              ) : null}
            </div>
          </section>

          {isTemplateLoading ? (
            <div className="template-loading-panel" role="status" aria-live="polite">Loading Template...</div>
          ) : null}

          {templateStarted ? (
            <section
              ref={templateWorkspaceRef}
              className={`template-workspace view-${workspaceView}${workspaceExpanded ? ' expanded' : ''}`}
              style={{ '--editor-split': `${editorSplit}%` }}
              aria-label="Claim form template editor"
            >
              <div className="template-workspace-controls">
                <button className="template-expand-button" type="button" onClick={() => setWorkspaceExpanded((current) => !current)}>
                  {workspaceExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  {workspaceExpanded ? 'Contract' : 'Expand'}
                </button>
              </div>

              {workspaceView !== 'both' ? (
                <div className="template-view-toggle template-view-toggle-floating" aria-label="Template workspace view">
                  <button className={workspaceView === 'editor' ? 'active' : ''} type="button" title="Editor only" onClick={() => setWorkspaceView('editor')}>
                    <PanelLeft size={16} />
                  </button>
                  <button className={workspaceView === 'both' ? 'active' : ''} type="button" title="Editor and preview" onClick={() => setWorkspaceView('both')}>
                    <Columns2 size={16} />
                  </button>
                  <button className={workspaceView === 'preview' ? 'active' : ''} type="button" title="Preview only" onClick={() => setWorkspaceView('preview')}>
                    <PanelRight size={16} />
                  </button>
                </div>
              ) : null}

              <div className="template-editor-panel">
                <div className="template-toolbar" aria-label="Template formatting tools">
                  {templateToolbar.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = (
                      activeEditorFormat[tool.key]
                      || (tool.key === 'h1' && activeEditorFormat.block === 'h1')
                      || (tool.key === 'h2' && activeEditorFormat.block === 'h2')
                      || (tool.key === 'left' && activeEditorFormat.align === 'left')
                      || (tool.key === 'center' && activeEditorFormat.align === 'center')
                      || (tool.key === 'right' && activeEditorFormat.align === 'right')
                    );
                    return (
                      <button key={tool.key} className={isActive ? 'active' : ''} type="button" title={tool.label} onClick={() => applyTemplateTool(tool)}>
                        <Icon size={17} />
                      </button>
                    );
                  })}
                  <span className="template-toolbar-divider" />
                  <button type="button" title="Insert patient name" onClick={() => insertMergeField('PATIENTNAME')}>
                    <Type size={17} />
                  </button>
                  <button type="button" title="Insert payer name" onClick={() => insertMergeField('PAYERNAME')}>
                    <FileText size={17} />
                  </button>
                  <button type="button" title="Insert block" onClick={() => insertTemplateBlock('block')}>
                    <FileText size={17} />
                  </button>
                  <button type="button" title="Insert sub block" onClick={() => insertTemplateBlock('subblock')}>
                    <Plus size={17} />
                  </button>
                  {isAdmin ? (
                    <button type="button" title="Save template" onClick={saveTemplate}>
                      <Save size={17} />
                    </button>
                  ) : null}
                  <select title="Font style" value={activeEditorFormat.fontFamily} onChange={(event) => applyFontFamily(event.target.value)}>
                    <option value="">Font</option>
                    {fontFamilies.map((family) => <option key={family} value={family}>{family}</option>)}
                  </select>
                  <select title="Font size" value={activeEditorFormat.fontSize} onChange={(event) => applyFontSize(event.target.value)}>
                    <option value="">Size</option>
                    {fontSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>

                {isAdmin ? (
                  <label className="template-name-field">
                    <span>Template Name</span>
                    <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" />
                  </label>
                ) : null}

                <div className="template-editor-frame" onClick={handleEditorFrameClick}>
                  <div
                    ref={templateEditorRef}
                    className="template-rich-editor"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => { refreshTemplateEditor(); updateEditorFormatState(); }}
                    onBlur={() => { refreshTemplateEditor(); updateEditorFormatState(); }}
                    onMouseUp={updateEditorFormatState}
                    onKeyUp={updateEditorFormatState}
                    onContextMenu={handleEditorContextMenu}
                    spellCheck="false"
                    aria-label="Letter template content"
                    data-placeholder="Type appeal letter content. Use fields like PAYERNAME, PATIENTFIRSTNAME, CLAIMID, TOTALBILLED, USERNAME."
                  />
                  {blockMenu ? (
                    <div className="template-block-menu" style={{ left: blockMenu.x, top: blockMenu.y }} onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={addInnerBoxFromMenu}>Add inner box</button>
                    </div>
                  ) : null}
                </div>

                <div className="merge-field-strip" aria-label="Available merge fields">
                  {Object.keys(mergeValues).map((field) => (
                    <button key={field} type="button" onClick={() => insertMergeField(field)}>{field}</button>
                  ))}
                </div>
              </div>

              {workspaceView === 'both' ? (
                <div
                  className="template-resizer"
                  role="separator"
                  aria-label="Resize editor and preview"
                  aria-orientation="vertical"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setIsResizingWorkspace(true);
                  }}
                >
                  <div className="template-view-toggle" aria-label="Template workspace view" onPointerDown={(event) => event.stopPropagation()}>
                    <button className={workspaceView === 'editor' ? 'active' : ''} type="button" title="Editor only" onClick={() => setWorkspaceView('editor')}>
                      <PanelLeft size={16} />
                    </button>
                    <button className={workspaceView === 'both' ? 'active' : ''} type="button" title="Editor and preview" onClick={() => setWorkspaceView('both')}>
                      <Columns2 size={16} />
                    </button>
                    <button className={workspaceView === 'preview' ? 'active' : ''} type="button" title="Preview only" onClick={() => setWorkspaceView('preview')}>
                      <PanelRight size={16} />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="template-preview-panel">
                <div className="pdf-preview-heading">
                  <span>PDF Preview</span>
                  <strong>{templateName || selectedTemplate.name}</strong>
                </div>
                <div className="pdf-page">
                  <div className="pdf-page-block header-block">
                    {pdfPreviewHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: pdfPreviewHtml }} />
                    ) : (
                      <p className="pdf-empty-state">Start typing to preview the generated PDF letter.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="appeal-actions">
            <Button type="button" onClick={continueFromLetters}>Continue</Button>
          </div>
        </div>
      ) : stage === 3 ? (
        <div className="appeal-form-shell documents-stage-shell">
          <section className="appeal-form-section documents-section">
            <div className="claim-section-heading">
              <div>
                <h2>Documents</h2>
                <p>Attach the supporting documents required for this appeal.</p>
              </div>
            </div>

            {generatedLetters.length ? (
              <div className="saved-letters-panel">
                <h3>Saved Letters</h3>
                <div className="saved-letter-list">
                  {generatedLetters.map((letter, index) => (
                    <div key={letter.id} className="saved-letter-row">
                      <span>Letter {index + 1}</span>
                      <strong>{letter.name}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="document-upload-list">
              {documents.map((documentItem, index) => (
                <div key={`document-${index}`} className="document-upload-card">
                  <div className="document-card-heading">
                    <h3>Document {index + 1}:</h3>
                    {documents.length > 1 ? (
                      <button type="button" onClick={() => removeDocument(index)} aria-label={`Remove document ${index + 1}`}>
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>

                  <div className="document-upload-grid">
                    <label>
                      <span>Document Type</span>
                      <select value={documentItem.type} onChange={(event) => updateDocument(index, 'type', event.target.value)}>
                        <option value="EOB">EOB</option>
                        <option value="MR">MR</option>
                        <option value="Others">Others</option>
                      </select>
                    </label>

                    {documentItem.type === 'Others' ? (
                      <label>
                        <span>Document Name</span>
                        <input value={documentItem.name} onChange={(event) => updateDocument(index, 'name', event.target.value)} placeholder="Enter document name" />
                      </label>
                    ) : null}

                    <label className="document-file-field">
                      <span>Choose to Upload</span>
                      <span className="document-file-picker">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,image/*"
                          onChange={(event) => updateDocumentFile(index, event.target.files?.[0])}
                        />
                        <span className="document-file-button">Choose file</span>
                        <span className="document-file-placeholder">{documentItem.fileName || 'No file selected'}</span>
                      </span>
                    </label>

                    {documentItem.fileName ? (
                      <div className="document-file-name">
                        <span>Selected File</span>
                        <strong>{documentItem.fileName}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <button className="add-document-button" type="button" onClick={addDocument}>
              <Plus size={16} />
              Add another document
            </button>
          </section>

          <div className="appeal-actions">
            <Button type="button" onClick={() => advanceToStage(4)}>Continue</Button>
          </div>
        </div>
      ) : stage === 4 ? (
        <div className="appeal-form-shell final-review-shell">
          <section className="appeal-form-section final-review-section">
            <div className="claim-section-heading">
              <div>
                <h2>Final Review</h2>
                <p>Review claim forms first, then uploaded documents, before creating the packed appeal.</p>
              </div>
            </div>

            {packingAppeal ? (
              <div className="appeal-packing-panel" role="status" aria-live="polite">
                <div className="denials-loading-orbit" aria-hidden="true">
                  <span className="denials-loading-mark" />
                </div>
                <strong>Appeal is being packed</strong>
                <p>Combining claim forms and supporting documents into the final appeal packet.</p>
              </div>
            ) : (
              <>
                <div className="final-review-nav">
                  <button type="button" onClick={() => setReviewPageIndex((index) => Math.max(0, index - 1))} disabled={reviewPageIndex === 0}>
                    &lt;
                  </button>
                  <div>
                    <span>{reviewPages.length ? `${reviewPageIndex + 1} of ${reviewPages.length}` : '0 of 0'}</span>
                    <strong>{activeReviewPage?.title || 'No appeal packet items'}</strong>
                  </div>
                  <button type="button" onClick={() => setReviewPageIndex((index) => Math.min(reviewPages.length - 1, index + 1))} disabled={!reviewPages.length || reviewPageIndex >= reviewPages.length - 1}>
                    &gt;
                  </button>
                </div>

                <div className="final-review-pdf-shell">
                  {activeReviewPage?.type === 'letter' ? (
                    <article className="final-review-page" dangerouslySetInnerHTML={{ __html: activeReviewPage.html }} />
                  ) : activeReviewPage?.type === 'document' ? (
                    activeReviewPage.previewUrl && isPdfFile(activeReviewPage.fileName) ? (
                      <iframe className="final-review-document-frame" src={activeReviewPage.previewUrl} title={activeReviewPage.title} />
                    ) : activeReviewPage.previewUrl && isImageFile(activeReviewPage.fileName) ? (
                      <article className="final-review-page uploaded-image-review-page">
                        <img src={activeReviewPage.previewUrl} alt={activeReviewPage.title} />
                      </article>
                    ) : (
                      <article className="final-review-page document-review-page">
                        <span>Uploaded Document</span>
                        <h3>{activeReviewPage.title}</h3>
                        <p>{activeReviewPage.fileName}</p>
                      </article>
                    )
                  ) : (
                    <article className="final-review-page empty-review-page">
                      <p>Add at least one letter or document to review the final appeal packet.</p>
                    </article>
                  )}
                </div>
              </>
            )}
          </section>

          <div className="appeal-actions">
            <Button type="button" onClick={createAppealPackage} disabled={packingAppeal || !reviewPages.length}>
              Create Appeal
            </Button>
          </div>
        </div>
      ) : (
        <div className="appeal-placeholder-panel">
          <h2>{STAGES[stage]}</h2>
          <p>This stage is ready for the next build step.</p>
        </div>
      )}

      {showContactModal ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal payer-contact-modal" role="dialog" aria-modal="true" aria-labelledby="payer-contact-title">
            <button className="modal-close-button" type="button" onClick={() => setShowContactModal(false)} aria-label="Close payer contact">×</button>
            <h2 id="payer-contact-title">Payer Contact</h2>
            <p>Add the contact information used for appeal delivery.</p>
            <div className="payer-contact-grid contact-name-grid">
              <label className="full"><span>Contact Name *</span><input value={contact.contact_name} onChange={(event) => updateContact('contact_name', event.target.value)} /></label>
            </div>
            <div className="contact-method-toggle" aria-label="Contact delivery method">
              <button className={contact.contact_method === 'mail' ? 'active' : ''} type="button" onClick={() => updateContact('contact_method', 'mail')}>Mail</button>
              <button className={contact.contact_method === 'fax' ? 'active' : ''} type="button" onClick={() => updateContact('contact_method', 'fax')}>Fax</button>
              <button className={contact.contact_method === 'email' ? 'active' : ''} type="button" onClick={() => updateContact('contact_method', 'email')}>E-Mail</button>
            </div>
            <div className="payer-contact-grid">
              {contact.contact_method === 'mail' ? (
                <>
                  <label><span>Attn *</span><input value={contact.mail_attn} onChange={(event) => updateContact('mail_attn', event.target.value)} /></label>
                  <label><span>Address 1 *</span><input value={contact.mail_address_1} onChange={(event) => updateContact('mail_address_1', event.target.value)} /></label>
                  <label><span>Address 2 <em>Optional</em></span><input value={contact.mail_address_2} onChange={(event) => updateContact('mail_address_2', event.target.value)} /></label>
                  <label><span>City *</span><input value={contact.mail_city} onChange={(event) => updateContact('mail_city', event.target.value)} /></label>
                  <label><span>State *</span><input value={contact.mail_state} onChange={(event) => updateContact('mail_state', event.target.value)} /></label>
                  <label><span>Zip *</span><input value={contact.mail_zip} onChange={(event) => updateContact('mail_zip', event.target.value)} /></label>
                </>
              ) : contact.contact_method === 'email' ? (
                <label className="single-contact-field"><span>Email ID *</span><input type="email" value={contact.email_id} onChange={(event) => updateContact('email_id', event.target.value)} placeholder="name@example.com" /></label>
              ) : (
                <label className="fax-field"><span>Fax Number *</span><input value={contact.fax_number} onChange={(event) => updateContact('fax_number', event.target.value)} placeholder="(XXX) XXX-XXXX" /></label>
              )}
            </div>
            <div className="modal-actions">
              <Button variant="secondary" type="button" onClick={() => setShowContactModal(false)}>Cancel</Button>
              <Button type="button" onClick={addContact} disabled={!contactComplete}>Add</Button>
            </div>
          </section>
        </div>
      ) : null}

      <ConfirmationModal
        open={showExitPrompt}
        title="Save this draft?"
        description="You can save this appeal draft and return later, or discard it now."
        confirmLabel="Yes, save draft"
        cancelLabel="Discard draft"
        onCancel={discardDraft}
        onConfirm={saveDraft}
      />

      <ConfirmationModal
        open={showDeleteTemplatePrompt}
        title="Delete this template?"
        description={`This will remove ${selectedTemplate.name || 'this template'} from saved letter templates.`}
        confirmLabel="Delete template"
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteTemplatePrompt(false)}
        onConfirm={deleteSelectedTemplate}
      />

      <ConfirmationModal
        open={showAddLetterPrompt}
        title="Do you want to add another letter?"
        description="The current letter has been saved for this appeal. You can create another letter or continue to documents."
        confirmLabel="Yes, add another"
        cancelLabel="No, continue"
        onCancel={finishLetters}
        onConfirm={addAnotherLetter}
      />
    </section>
  );
}
