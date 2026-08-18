import { ListingAiScopeClassifierService } from '../listing-ai-scope-classifier.service';

describe('ListingAiScopeClassifierService', () => {
  let service: ListingAiScopeClassifierService;

  beforeEach(() => {
    service = new ListingAiScopeClassifierService();
  });

  it('should detect explicit comparison intent as out of scope', () => {
    const res = service.classify('Toyota Corolla ile bu aracı karşılaştır');
    expect(res.isOutOfScope).toBe(true);
    expect(res.redirectMessage).toContain('Araç Karşılaştırma');
  });

  it('should allow chronic issue questions bound to current listing', () => {
    const res = service.classify('Bu motorun kronik sorunları nedir?');
    expect(res.isOutOfScope).toBe(false);
  });

  it('should detect budget recommendation questions as out of scope', () => {
    const res = service.classify('Bana 1 milyon TL fiyata araba öner');
    expect(res.isOutOfScope).toBe(true);
    expect(res.redirectMessage).toContain('Araç Bul');
  });

  it('should allow valid listing-bound questions', () => {
    const res = service.classify('Bu ilandaki en büyük riskler nelerdir?');
    expect(res.isOutOfScope).toBe(false);
  });
});
