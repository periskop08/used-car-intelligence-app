/**
 * pdf-table-extractor.service.ts
 * 
 * PDF Layout Preserving & Symbol Legend Resolution Extractor for Official Equipment Matrices.
 * Resolves standard symbols (● = STANDARD, ○ = OPTIONAL, — = NOT_AVAILABLE) and preserves trim column grid layout.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ParsedPdfTableColumn {
  trimName: string;
  columnIndex: number;
}

export interface ParsedPdfTableRow {
  featureName: string;
  category?: string;
  valuesByTrim: Map<string, { symbol: string; status: string; valueText?: string }>;
}

export interface ParsedPdfDocument {
  title: string;
  effectiveRevision?: string;
  columns: ParsedPdfTableColumn[];
  rows: ParsedPdfTableRow[];
}

@Injectable()
export class PdfTableExtractorService {
  private readonly logger = new Logger(PdfTableExtractorService.name);

  /**
   * Resolves official legend symbols to EquipmentFeatureStatus strings.
   */
  resolveSymbol(symbol: string): 'STANDARD' | 'OPTIONAL' | 'NOT_AVAILABLE' | 'UNKNOWN' {
    if (!symbol) return 'UNKNOWN';
    const s = symbol.trim();
    if (s === '●' || s === 'S' || s === 'Std' || s.toLowerCase() === 'standart') {
      return 'STANDARD';
    }
    if (s === '○' || s === 'O' || s === 'Ops' || s.toLowerCase() === 'opsiyonel') {
      return 'OPTIONAL';
    }
    if (s === '—' || s === '-' || s.toLowerCase() === 'yok') {
      return 'NOT_AVAILABLE';
    }
    return 'UNKNOWN';
  }

  /**
   * Parses structured markdown or PDF table layout text preserving column alignment.
   */
  parseEquipmentTable(tableMarkdown: string, targetTrim: string): Map<string, { status: string; symbol: string; valueText?: string }> {
    const featureMap = new Map<string, { status: string; symbol: string; valueText?: string }>();
    if (!tableMarkdown) return featureMap;

    const lines = tableMarkdown.split('\n').filter(l => l.includes('|'));
    if (lines.length < 2) return featureMap;

    // Header row parsing
    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    let targetColIdx = -1;

    headers.forEach((h, idx) => {
      if (h.toLowerCase().includes(targetTrim.toLowerCase())) {
        targetColIdx = idx;
      }
    });

    if (targetColIdx === -1) {
      this.logger.warn(`PDF Table Extractor: Target trim "${targetTrim}" column not found in table header [${headers.join(', ')}]`);
      return featureMap;
    }

    // Data rows parsing
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length <= targetColIdx) continue;

      const featureName = cells[0];
      const rawValue = cells[targetColIdx];
      const status = this.resolveSymbol(rawValue);

      featureMap.set(featureName, {
        status,
        symbol: rawValue,
        valueText: ['STANDARD', 'OPTIONAL', 'NOT_AVAILABLE'].includes(status) ? undefined : rawValue
      });
    }

    return featureMap;
  }
}
