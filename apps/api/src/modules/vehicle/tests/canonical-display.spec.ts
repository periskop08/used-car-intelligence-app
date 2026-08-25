import { CanonicalDisplayService } from '../canonical-display.service';

describe('CanonicalDisplayService (Phase 4.2A Release Packaging & Gate)', () => {
  let service: CanonicalDisplayService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should default to OFF when ENABLE_CANONICAL_DISPLAY_PROJECTION is undefined', () => {
    delete process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION;
    service = new CanonicalDisplayService();
    service.onModuleInit();
    expect(service.isEnabled()).toBe(false);
  });

  it('should remain OFF when ENABLE_CANONICAL_DISPLAY_PROJECTION=false', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'false';
    service = new CanonicalDisplayService();
    service.onModuleInit();
    expect(service.isEnabled()).toBe(false);
  });

  it('should turn ON when ENABLE_CANONICAL_DISPLAY_PROJECTION=true and version=PHASE2P2_V2', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'true';
    process.env.CANONICAL_DISPLAY_POLICY_VERSION = 'PHASE2P2_V2';
    service = new CanonicalDisplayService();
    service.onModuleInit();
    expect(service.isEnabled()).toBe(true);
  });

  it('should remain OFF if an unknown policy version is requested', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'true';
    process.env.CANONICAL_DISPLAY_POLICY_VERSION = 'PHASE99_UNKNOWN';
    service = new CanonicalDisplayService();
    service.onModuleInit();
    expect(service.isEnabled()).toBe(false);
  });

  it('should project real Subaru 2006 variant (5969b16c-675d-4ec3-85e9-f8fe6ae06d40) when ON', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'true';
    service = new CanonicalDisplayService();
    service.onModuleInit();

    const raw = '1.5 Boxer';
    const projected = service.getProjectedEngineCode('5969b16c-675d-4ec3-85e9-f8fe6ae06d40', raw);
    expect(projected).toBe('1.5');
  });

  it('should preserve Subaru 2008 negative control variants as raw engine codes when ON', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'true';
    service = new CanonicalDisplayService();
    service.onModuleInit();

    const projectedForester = service.getProjectedEngineCode('5755fd59-81b4-4b9c-8015-d63a2fdc1efd', '2.5 Boxer');
    expect(projectedForester).toBe('2.5 Boxer');

    const projectedImpreza2008 = service.getProjectedEngineCode('1c007d4d-911d-42f7-a899-e1831da8f18f', '1.5 Boxer');
    expect(projectedImpreza2008).toBe('1.5 Boxer');
  });

  it('should perform context-bound reverse resolution without global alias mapping', () => {
    process.env.ENABLE_CANONICAL_DISPLAY_PROJECTION = 'true';
    service = new CanonicalDisplayService();
    service.onModuleInit();

    const candidates = [
      { id: '5969b16c-675d-4ec3-85e9-f8fe6ae06d40', engine: { code: '1.5 Boxer' } },
      { id: 'unauthorized-uuid-123', engine: { code: '1.5' } }
    ];

    const rawCodes = service.getRawEngineCodesForTarget('1.5', candidates);
    expect(rawCodes).toContain('1.5');
    expect(rawCodes).toContain('1.5 Boxer');
  });
});
