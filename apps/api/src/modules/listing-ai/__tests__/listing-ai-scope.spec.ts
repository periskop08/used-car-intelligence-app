import { ListingAiScopeClassifierService } from '../listing-ai-scope-classifier.service';

describe('ListingAiScopeClassifierService', () => {
  let service: ListingAiScopeClassifierService;

  beforeEach(() => {
    service = new ListingAiScopeClassifierService();
  });

  it('should detect vehicle comparison questions as out of scope', () => {
    const res = service.classify('Toyota Corolla mı bu araç mı?');
    expect(res.isOutOfScope).toBe(true);
    expect(res.redirectMessage).toContain('Araç Karşılaştırma');
  });

  it('should detect general chronic issue questions as out of scope', () => {
    const res = service.classify('Bu motorun kronik sorunları nedir?');
    expect(res.isOutOfScope).toBe(true);
    expect(res.redirectMessage).toContain('Araç Sorgulama');
  });

  it('should detect market search questions as out of scope', () => {
    const res = service.classify('Bana 1 milyon TL fiyata araba öner');
    expect(res.isOutOfScope).toBe(true);
    expect(res.redirectMessage).toContain('Araç Bul');
  });

  it('should allow valid listing-bound questions', () => {
    const res = service.classify('Bu ilandaki en büyük riskler nelerdir?');
    expect(res.isOutOfScope).toBe(false);
  });
});
