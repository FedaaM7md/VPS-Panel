/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import type { PlanId, RegionId, OsId } from './types';
import { getOs, getPlan } from '../data/catalog';
import { RDP_USER_PATTERN, passwordProblem, validateServerName } from './validation';

export const WIZARD_STEPS = ['basics', 'plan', 'region', 'image', 'access', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export type WizardField =
  | 'name'
  | 'planId'
  | 'regionId'
  | 'osId'
  | 'authMethod'
  | 'keyIds'
  | 'password'
  | 'confirmPassword'
  | 'rdpUser';

export type WizardErrors = Partial<Record<WizardField, string>>;

export type AuthMethod = 'key' | 'password';

export interface WizardDraft {
  name: string;
  planId: PlanId | null;
  regionId: RegionId | null;
  osId: OsId | null;
  authMethod: AuthMethod;
  keyIds: string[];
  password: string;
  confirmPassword: string;
  rdpUser: string;
}

export interface WizardContext {
  existingNames: readonly string[];
  availableKeyIds: readonly string[];
}

export function createEmptyDraft(): WizardDraft {
  return {
    name: '',
    planId: null,
    regionId: null,
    osId: null,
    authMethod: 'key',
    keyIds: [],
    password: '',
    confirmPassword: '',
    rdpUser: 'Administrator',
  };
}

export function validateNameStep(name: string, existingNames: readonly string[]): WizardErrors {
  const error = validateServerName(name, existingNames);
  return error ? { name: error } : {};
}

export function validateImageCompatibility(planId: PlanId | null, osId: OsId | null): WizardErrors {
  if (!planId || !osId) return {};
  const plan = getPlan(planId);
  const os = getOs(osId);
  if (plan.rdp && !os.rdp) return { osId: 'wizard.incompatiblePlan' };
  if (!plan.rdp && os.rdp) return { osId: 'wizard.incompatibleImage' };
  return {};
}

export function validateStep(step: WizardStep, draft: WizardDraft, context: WizardContext): WizardErrors {
  switch (step) {
    case 'basics':
      return validateNameStep(draft.name, context.existingNames);
    case 'plan':
      return draft.planId ? {} : { planId: 'wizard.requiredPlan' };
    case 'region':
      return draft.regionId ? {} : { regionId: 'wizard.requiredRegion' };
    case 'image': {
      if (!draft.osId) return { osId: 'wizard.requiredImage' };
      return validateImageCompatibility(draft.planId, draft.osId);
    }
    case 'access': {
      const errors: WizardErrors = {};
      if (draft.authMethod === 'key') {
        const known = draft.keyIds.filter((id) => context.availableKeyIds.includes(id));
        if (known.length === 0) errors.keyIds = 'wizard.requiredKey';
      } else {
        if (passwordProblem(draft.password)) errors.password = 'wizard.invalidPassword';
        if (draft.password !== draft.confirmPassword) errors.confirmPassword = 'wizard.passwordMismatch';
      }
      if (draft.planId && getPlan(draft.planId).rdp) {
        if (!RDP_USER_PATTERN.test(draft.rdpUser.trim())) errors.rdpUser = 'errors.nameFormat';
      }
      return errors;
    }
    case 'review':
      return allErrors(draft, context);
  }
}

export function allErrors(draft: WizardDraft, context: WizardContext): WizardErrors {
  const merged: WizardErrors = {};
  for (const step of WIZARD_STEPS) {
    if (step === 'review') continue;
    Object.assign(merged, validateStep(step, draft, context));
  }
  return merged;
}

export function isStepValid(step: WizardStep, draft: WizardDraft, context: WizardContext): boolean {
  return Object.keys(validateStep(step, draft, context)).length === 0;
}

export function canCreate(draft: WizardDraft, context: WizardContext): boolean {
  const errors = allErrors(draft, context);
  return Object.keys(errors).length === 0 && draft.name.trim().length > 0;
}

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

const STEP_LABEL_KEYS: Record<WizardStep, string> = {
  basics: 'wizard.steps.basics',
  plan: 'wizard.steps.plan',
  region: 'wizard.steps.region',
  image: 'wizard.steps.image',
  access: 'wizard.steps.access',
  review: 'wizard.steps.review',
};

export function stepLabelKey(step: WizardStep): string {
  return STEP_LABEL_KEYS[step];
}

export function stepAfter(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.min(index + 1, WIZARD_STEPS.length - 1)] ?? 'review';
}

export function stepBefore(step: WizardStep): WizardStep {
  const index = WIZARD_STEPS.indexOf(step);
  return WIZARD_STEPS[Math.max(index - 1, 0)] ?? 'basics';
}
