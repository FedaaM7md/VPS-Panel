/* © 2026 Fedaa Mohamed. All rights reserved. Proprietary — see LICENSE. */
import { describe, expect, it } from 'vitest';
import {
  allErrors,
  canCreate,
  createEmptyDraft,
  isStepValid,
  stepAfter,
  stepBefore,
  validateImageCompatibility,
  validateStep,
  type WizardContext,
  type WizardDraft,
} from '../src/lib/wizard';

const CONTEXT: WizardContext = {
  existingNames: ['web-fra-01', 'db-dxb-01'],
  availableKeyIds: ['key_a1', 'key_b2'],
};

function validDraft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return {
    name: 'web-test-01',
    planId: 'business',
    regionId: 'fra',
    osId: 'ubuntu-2404',
    authMethod: 'key',
    keyIds: ['key_a1'],
    password: '',
    confirmPassword: '',
    rdpUser: 'Administrator',
    ...overrides,
  };
}

describe('wizard validation', () => {
  it('starts empty and invalid', () => {
    const draft = createEmptyDraft();
    expect(canCreate(draft, CONTEXT)).toBe(false);
    expect(validateStep('basics', draft, CONTEXT).name).toBe('wizard.requiredName');
    expect(validateStep('plan', draft, CONTEXT).planId).toBe('wizard.requiredPlan');
    expect(validateStep('region', draft, CONTEXT).regionId).toBe('wizard.requiredRegion');
    expect(validateStep('image', draft, CONTEXT).osId).toBe('wizard.requiredImage');
  });

  it('validates name format and uniqueness case-insensitively', () => {
    expect(validateStep('basics', validDraft({ name: 'ab' }), CONTEXT).name).toBe('wizard.invalidName');
    expect(validateStep('basics', validDraft({ name: '-bad-name' }), CONTEXT).name).toBe('wizard.invalidName');
    expect(validateStep('basics', validDraft({ name: 'WEB-FRA-01' }), CONTEXT).name).toBe('wizard.nameTaken');
    expect(validateStep('basics', validDraft({ name: ' new-server ' }), CONTEXT)).toEqual({});
  });

  it('accepts a complete, valid draft', () => {
    expect(validateStep('plan', validDraft(), CONTEXT)).toEqual({});
    expect(validateStep('region', validDraft(), CONTEXT)).toEqual({});
    expect(validateStep('image', validDraft(), CONTEXT)).toEqual({});
    expect(validateStep('access', validDraft(), CONTEXT)).toEqual({});
    expect(canCreate(validDraft(), CONTEXT)).toBe(true);
  });

  it('enforces plan and image compatibility', () => {
    expect(validateImageCompatibility('rdp', 'ubuntu-2404')).toEqual({ osId: 'wizard.incompatiblePlan' });
    expect(validateImageCompatibility('business', 'windows-2022')).toEqual({ osId: 'wizard.incompatibleImage' });
    expect(validateImageCompatibility('rdp', 'windows-2025')).toEqual({});
    expect(validateImageCompatibility(null, 'ubuntu-2404')).toEqual({});
  });

  it('requires at least one known SSH key', () => {
    expect(validateStep('access', validDraft({ keyIds: [] }), CONTEXT).keyIds).toBe('wizard.requiredKey');
    expect(validateStep('access', validDraft({ keyIds: ['unknown'] }), CONTEXT).keyIds).toBe('wizard.requiredKey');
  });

  it('validates password strength and confirmation', () => {
    const weak = validDraft({ authMethod: 'password', keyIds: [], password: 'short', confirmPassword: 'short' });
    expect(validateStep('access', weak, CONTEXT).password).toBe('wizard.invalidPassword');

    const mismatch = validDraft({ authMethod: 'password', keyIds: [], password: 'Password123!', confirmPassword: 'Password124!' });
    expect(validateStep('access', mismatch, CONTEXT).confirmPassword).toBe('wizard.passwordMismatch');

    const strong = validDraft({ authMethod: 'password', keyIds: [], password: 'Password123!', confirmPassword: 'Password123!' });
    expect(validateStep('access', strong, CONTEXT)).toEqual({});
  });

  it('validates the RDP username when the plan needs it', () => {
    const rdp = validDraft({ planId: 'rdp', osId: 'windows-2022', rdpUser: '-' });
    expect(validateStep('access', rdp, CONTEXT).rdpUser).toBe('errors.nameFormat');
  });

  it('merges all step errors for the review and create guard', () => {
    const broken = validDraft({ name: '', planId: null, keyIds: [] });
    const errors = allErrors(broken, CONTEXT);
    expect(errors.name).toBeDefined();
    expect(errors.planId).toBeDefined();
    expect(errors.keyIds).toBeDefined();
    expect(canCreate(broken, CONTEXT)).toBe(false);
    expect(isStepValid('review', broken, CONTEXT)).toBe(false);
    expect(isStepValid('review', validDraft(), CONTEXT)).toBe(true);
  });

  it('navigates steps with clamped boundaries', () => {
    expect(stepAfter('basics')).toBe('plan');
    expect(stepAfter('review')).toBe('review');
    expect(stepBefore('review')).toBe('access');
    expect(stepBefore('basics')).toBe('basics');
  });
});
